// Pieces used by several screens: room chips, box editor, box details,
// printable labels, photo strips.

import { h, mount, toast } from "../dom.js";
import { state, save, uid, byId, roomOf, nextBoxNo } from "../state.js";
import * as db from "../db.js";
import { BOX_SIZES, colorOf } from "../engine/catalog.js";
import { encodeLabel, labelUrl } from "../engine/label.js";
import { isSafeImage } from "../engine/sanitize.js";
import { qrSvg } from "../qr.js";
import { badge, bindCheck, bindSelect, compressImage, confirmDialog, field, openDialog, printNodes } from "../ui.js";
import { rerender } from "../router.js";

export function roomChip(room) {
  if (!room) return h("span", { class: "chip muted", text: "No room" });
  const c = colorOf(room.color);
  const dot = h("span", { class: "dot", "aria-hidden": "true" });
  dot.style.background = c.hex;
  return h("span", { class: "chip", title: `${c.name} label` }, dot, room.name);
}

export const stat = (label, value, sub = "", tone = "") =>
  h("div", { class: `stat ${tone}` }, h("div", { class: "label", text: label }), h("div", { class: "value", text: value }), sub ? h("div", { class: "sub", text: sub }) : null);

export function boxFlags(b) {
  return [
    b.fragile ? badge("Fragile", "bad") : null,
    b.heavy ? badge("Heavy", "warn") : null,
    b.openFirst ? badge("Open first", "accent") : null,
  ];
}

export function boxStatus(b) {
  if (b.damaged) return badge("Damaged", "bad");
  if (b.delivered) return badge("Delivered", "good");
  if (b.loaded) return badge("On truck", "accent");
  if (b.packed) return badge("Packed", "good");
  return badge("Packing");
}

const roomOptions = (blank) => [blank ? h("option", { value: "", text: blank }) : null, ...state.rooms.map((r) => h("option", { value: r.id, text: r.name }))];

/** New or edit box dialog. */
export function editBox(existing, defaults = {}) {
  const isNew = !existing;
  const b = existing ? structuredClone(existing) : {
    id: uid(), no: null, roomId: defaults.roomId || state.rooms[0]?.id || "", size: "M", contents: [], lbs: null,
    fragile: false, heavy: false, openFirst: false, packed: false, printed: false, loaded: false, delivered: false, damaged: false, damageNote: "",
  };
  const text = { contents: b.contents.join("\n") };
  openDialog(isNew ? "New box" : `Box ${b.no}`, (close) => {
    const ta = h("textarea", { rows: 6, maxlength: 4000, placeholder: "One item per line, e.g.\nKettle\nMugs\nTea towels", "aria-label": "Contents" }, text.contents);
    ta.addEventListener("input", () => { text.contents = ta.value; });
    return [
      h("div", { class: "fields" },
        field("Room", bindSelect(b, "roomId", roomOptions("— none —"))),
        field("Box size", bindSelect(b, "size", Object.entries(BOX_SIZES).map(([k, v]) => h("option", { value: k, text: `${v.label} (${v.cuft} cu ft)` })))),
        field("What's inside", ta, { wide: true }),
        h("div", { class: "field wide row" },
          bindCheck(b, "fragile", "Fragile"), bindCheck(b, "heavy", "Heavy"), bindCheck(b, "openFirst", "Open first"), bindCheck(b, "packed", "Packed and taped"))),
      h("div", { class: "row space mt-16" },
        !isNew ? h("button", { class: "btn danger", onclick: async () => {
          if (!(await confirmDialog(`Delete box ${b.no}? Its printed label will no longer match anything.`, "Delete box"))) return;
          state.boxes = state.boxes.filter((x) => x.id !== b.id);
          for (const p of await db.photosFor(b.id)) await db.deletePhoto(p.id);
          save("boxes"); close(); rerender();
        }, text: "Delete" }) : h("span"),
        h("div", { class: "row" },
          h("button", { class: "btn", onclick: close, text: "Cancel" }),
          h("button", { class: "btn primary", onclick: () => {
            b.contents = text.contents.split(/\r?\n/).map((s) => s.trim().slice(0, 80)).filter(Boolean).slice(0, 200);
            if (isNew) {
              b.no = nextBoxNo();
              state.boxes.push(b);
            } else {
              // Changing what's on the label means the printed one is stale.
              const changed = existing.roomId !== b.roomId || existing.contents.join("|") !== b.contents.join("|") || existing.fragile !== b.fragile || existing.heavy !== b.heavy || existing.openFirst !== b.openFirst;
              if (changed) b.printed = false;
              Object.assign(existing, b);
            }
            save("boxes");
            close();
            toast(isNew ? `Box ${b.no} added. Print its label from the Boxes screen.` : "Box saved.");
            rerender();
          }, text: isNew ? "Add box" : "Save" }))),
    ];
  });
}

/** Details of one box, with quick status changes and photos. */
export function showBox(b, { mode = "lookup" } = {}) {
  const room = roomOf(b.roomId);
  openDialog(`Box ${b.no}`, (close) => {
    const photoBox = h("div");
    drawPhotos(b.id, photoBox, "contents");
    const set = (patch, msg) => { Object.assign(b, patch); save("boxes"); toast(msg); close(); rerender(); };
    return [
      h("div", { class: "row mb-8" }, roomChip(room), badge(BOX_SIZES[b.size]?.label || b.size), boxFlags(b), boxStatus(b)),
      b.contents.length ? h("ul", { class: "contents" }, b.contents.map((c) => h("li", { text: c }))) : h("p", { class: "muted", text: "No contents listed." }),
      b.damaged ? h("p", { class: "notice bad", text: `Damage: ${b.damageNote || "noted"}` }) : null,
      h("h3", { class: "sub-h", text: "Photos" }), photoBox,
      h("div", { class: "row wrap mt-16" },
        !b.loaded ? h("button", { class: "btn" + (mode === "load" ? " primary" : ""), onclick: () => set({ loaded: true, packed: true }, `Box ${b.no} on the truck.`), text: "Mark on truck" }) : null,
        b.loaded && !b.delivered ? h("button", { class: "btn" + (mode === "unload" ? " primary" : ""), onclick: () => set({ delivered: true }, `Box ${b.no} delivered.`), text: "Mark delivered" }) : null,
        h("button", { class: "btn danger", onclick: () => { close(); reportDamage(b, "boxes"); }, text: b.damaged ? "Edit damage" : "Report damage" }),
        h("button", { class: "btn", onclick: () => { close(); editBox(b); }, text: "Edit" }),
        h("button", { class: "btn", onclick: () => { close(); printLabels([b]); }, text: "Print label" })),
    ];
  });
}

export function reportDamage(rec, coll) {
  const d = { damageNote: rec.damageNote || "" };
  openDialog(`Damage: ${rec.no ? `box ${rec.no}` : rec.name}`, (close) => {
    const ta = h("textarea", { rows: 3, maxlength: 300, placeholder: "What's damaged and how?", "aria-label": "Damage description" }, d.damageNote);
    ta.addEventListener("input", () => { d.damageNote = ta.value; });
    const photoBox = h("div");
    drawPhotos(rec.id, photoBox, "damage");
    return [
      field("Description", ta, { wide: true }),
      h("h3", { class: "sub-h", text: "Photos of the damage" }), photoBox,
      h("p", { class: "muted small mt-8", text: "Movers usually need damage reported within a few days. Photos and notes stay on this device; use Moving day → Damage report to print them." }),
      h("div", { class: "row space mt-16" },
        rec.damaged ? h("button", { class: "btn", onclick: () => { rec.damaged = false; rec.damageNote = ""; save(coll); close(); rerender(); }, text: "Not damaged" }) : h("span"),
        h("div", { class: "row" }, h("button", { class: "btn", onclick: close, text: "Cancel" }),
          h("button", { class: "btn primary", onclick: () => { rec.damaged = true; rec.damageNote = d.damageNote.trim().slice(0, 300); save(coll); close(); toast("Damage recorded."); rerender(); }, text: "Save" }))),
    ];
  });
}

export async function drawPhotos(ownerId, box, kind) {
  const photos = (await db.photosFor(ownerId)).filter((p) => !kind || p.kind === kind);
  const input = h("input", { type: "file", accept: "image/*", multiple: true, class: "hidden", capture: "environment" });
  input.addEventListener("change", async () => {
    let n = 0;
    for (const f of [...input.files].slice(0, 10)) {
      if (!f.type.startsWith("image/")) continue;
      try {
        const dataUrl = await compressImage(f);
        if (!isSafeImage(dataUrl)) continue;
        await db.putPhoto({ id: uid(), ownerId, kind, dataUrl, caption: "", takenAt: new Date().toISOString() });
        n++;
      } catch { /* unreadable image */ }
    }
    if (n) toast(`Added ${n} photo(s).`);
    drawPhotos(ownerId, box, kind);
  });
  mount(box,
    photos.length ? h("div", { class: "photo-grid" }, photos.filter((p) => isSafeImage(p.dataUrl)).map((p) => h("figure", { class: "photo" },
      h("img", { src: p.dataUrl, alt: kind === "damage" ? "Damage photo" : "Box photo", loading: "lazy" }),
      h("button", { class: "icon-btn photo-del", "aria-label": "Delete photo", onclick: async () => { if (await confirmDialog("Delete this photo?", "Delete")) { await db.deletePhoto(p.id); drawPhotos(ownerId, box, kind); } }, text: "×" })))) : null,
    h("div", { class: "row mt-8" }, h("button", { class: "btn sm", onclick: () => input.click(), text: "+ Add photo" }), input));
}

// ------------------------------------------------------------- labels

export const appBase = () => location.origin + location.pathname;

export function labelNode(b) {
  const room = roomOf(b.roomId);
  const c = colorOf(room?.color);
  const payload = encodeLabel({ moveKey: state.settings.moveKey, moveName: state.settings.moveName, box: b, room });
  const band = h("div", { class: "lbl-band" }, h("span", { class: "lbl-room", text: room?.name || "No room" }), h("span", { class: "lbl-color", text: c.name.toUpperCase() }));
  band.style.background = c.hex;
  const contents = b.contents.slice(0, 8);
  return h("div", { class: "label-card" },
    band,
    h("div", { class: "lbl-body" },
      h("div", { class: "lbl-left" },
        h("div", { class: "lbl-no" }, h("small", { text: "BOX" }), String(b.no)),
        h("div", { class: "lbl-flags" },
          b.fragile ? h("span", { class: "lbl-flag", text: "FRAGILE" }) : null,
          b.heavy ? h("span", { class: "lbl-flag", text: "HEAVY" }) : null,
          b.openFirst ? h("span", { class: "lbl-flag", text: "OPEN FIRST" }) : null),
        h("ul", { class: "lbl-contents" }, contents.map((x) => h("li", { text: x })), b.contents.length > 8 ? h("li", { text: `+ ${b.contents.length - 8} more` }) : null)),
      h("div", { class: "lbl-qr" }, qrSvg(labelUrl(appBase(), payload), { ecc: "M", title: `QR code for box ${b.no}` }), h("div", { class: "lbl-hint", text: "Scan to see contents" }))),
    h("div", { class: "lbl-foot", text: state.settings.moveName }));
}

export function printLabels(boxes) {
  if (!boxes.length) { toast("No boxes selected."); return; }
  const sorted = [...boxes].sort((a, b) => a.no - b.no);
  printNodes(`Box labels ${sorted[0].no}-${sorted.at(-1).no}`, h("div", { class: "label-sheet" }, sorted.map(labelNode)));
  for (const b of sorted) b.printed = true;
  save("boxes");
  setTimeout(rerender, 500);
}

export const itemName = (it) => (it.qty > 1 ? `${it.name} × ${it.qty}` : it.name);
export { byId };
