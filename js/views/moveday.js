// Moving day: tick boxes and furniture on and off the truck, see what's
// missing, record damage, print a damage report.

import { h, mount } from "../dom.js";
import { state, save, roomOf } from "../state.js";
import * as db from "../db.js";
import { isSafeImage } from "../engine/sanitize.js";
import { badge, confirmDialog, printNodes } from "../ui.js";
import { register, rerender } from "../router.js";
import { roomChip, reportDamage, showBox, itemName, stat } from "./shared.js";

const view = { filter: "all" };

function render(el) {
  const things = [
    ...state.boxes.map((b) => ({ kind: "box", rec: b, label: `Box ${b.no}`, sub: b.contents.slice(0, 3).join(", "), sort: b.no })),
    ...state.items.map((it) => ({ kind: "item", rec: it, label: itemName(it), sub: "", sort: 100000 })),
  ];
  const total = things.length;
  const onTruck = things.filter((t) => t.rec.loaded).length;
  const delivered = things.filter((t) => t.rec.delivered).length;
  const damaged = things.filter((t) => t.rec.damaged);
  const missing = things.filter((t) => t.rec.loaded && !t.rec.delivered);
  const notLoaded = things.filter((t) => !t.rec.loaded);

  const list = { all: things, notLoaded, missing, damaged }[view.filter] || things;
  const byRoom = new Map();
  for (const t of list) {
    const k = t.rec.roomId || "";
    if (!byRoom.has(k)) byRoom.set(k, []);
    byRoom.get(k).push(t);
  }
  const roomIds = [...state.rooms.map((r) => r.id), ""].filter((id) => byRoom.has(id));

  const toggle = (t, key) => {
    t.rec[key] = !t.rec[key];
    if (key === "delivered" && t.rec.delivered) t.rec.loaded = true;
    if (key === "loaded" && !t.rec.loaded) t.rec.delivered = false;
    save(t.kind === "box" ? "boxes" : "items");
    rerender();
  };
  const chk = (t, key, label) => {
    const cb = h("input", { type: "checkbox", checked: Boolean(t.rec[key]), "aria-label": `${t.label} ${label}` });
    cb.addEventListener("change", () => toggle(t, key));
    return h("label", { class: "tick-cell" }, cb, h("span", { class: "small", text: label }));
  };
  const filterBtn = (key, label, n) => h("button", { class: "seg" + (view.filter === key ? " on" : ""), "aria-pressed": String(view.filter === key), onclick: () => { view.filter = key; rerender(); }, text: `${label} (${n})` });

  mount(el,
    h("div", { class: "page-head" }, h("div", {}, h("h1", { text: "Moving day" }), h("div", { class: "muted", text: "Tick things as they go on the truck and come off. Use Scan → Loading / Unloading to do boxes by camera." })),
      h("div", { class: "row" },
        h("a", { class: "btn primary", href: "#/scan", text: "Scan boxes" }),
        h("button", { class: "btn", disabled: !damaged.length, onclick: () => printDamage(damaged), text: "Damage report" }),
        h("button", { class: "btn danger", disabled: !onTruck, onclick: async () => {
          if (!(await confirmDialog("Clear all on-truck and delivered ticks? Damage notes are kept.", "Reset"))) return;
          for (const t of things) { t.rec.loaded = false; t.rec.delivered = false; }
          save("boxes"); save("items"); rerender();
        }, text: "Reset ticks" }))),
    h("div", { class: "stats mb-16" },
      stat("On truck", `${onTruck}/${total}`, total ? `${Math.round((onTruck / total) * 100)}%` : ""),
      stat("Delivered", `${delivered}/${onTruck || total}`, ""),
      stat("Missing", String(missing.length), "loaded but not delivered yet", missing.length && delivered ? "warn" : ""),
      stat("Damaged", String(damaged.length), "", damaged.length ? "bad" : "")),
    h("div", { class: "segs mb-12", role: "group", "aria-label": "Filter" },
      filterBtn("all", "All", total), filterBtn("notLoaded", "Not on truck", notLoaded.length), filterBtn("missing", "Missing", missing.length), filterBtn("damaged", "Damaged", damaged.length)),
    roomIds.length ? roomIds.map((rid) => h("section", { class: "card mb-12" },
      h("div", { class: "card-head" }, h("h2", {}, roomChip(roomOf(rid))), h("span", { class: "muted small", text: `${byRoom.get(rid).filter((t) => t.rec.delivered).length}/${byRoom.get(rid).length} delivered` })),
      h("ul", { class: "checkrows" }, byRoom.get(rid).sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label)).map((t) => h("li", { class: t.rec.damaged ? "dmg" : "" },
        h("button", { class: "linkish", onclick: () => (t.kind === "box" ? showBox(t.rec) : reportDamage(t.rec, "items")) },
          h("b", { text: t.label }), t.sub ? h("span", { class: "muted small", text: ` ${t.sub}` }) : null, t.rec.damaged ? [" ", badge("Damaged", "bad")] : null),
        h("div", { class: "row nowrap" }, chk(t, "loaded", "On truck"), chk(t, "delivered", "Delivered"),
          h("button", { class: "btn sm danger", onclick: () => reportDamage(t.rec, t.kind === "box" ? "boxes" : "items"), text: "Damage" }))))))) : h("p", { class: "empty", text: "Nothing in this list." }));
}

async function printDamage(list) {
  const s = state.settings;
  const rows = [];
  for (const t of list) {
    const photos = (await db.photosFor(t.rec.id)).filter((p) => p.kind === "damage" && isSafeImage(p.dataUrl));
    rows.push(h("div", { class: "dmg-entry" },
      h("h3", { text: `${t.label} — ${roomOf(t.rec.roomId)?.name || "no room"}` }),
      t.kind === "box" && t.rec.contents.length ? h("p", { text: `Contents: ${t.rec.contents.join(", ")}` }) : null,
      h("p", { text: `Damage: ${t.rec.damageNote || "not described"}` }),
      photos.length ? h("div", { class: "pq-photos" }, photos.map((p) => h("img", { src: p.dataUrl, alt: "" }))) : null));
  }
  printNodes(`Damage report ${s.moveDate}`, [
    h("h1", { text: "Moving damage report" }),
    h("p", { text: `${s.moveName} · moving day ${s.moveDate}${s.fromPlace ? ` · from ${s.fromPlace}` : ""}${s.toPlace ? ` to ${s.toPlace}` : ""}` }),
    h("p", { text: `${list.length} damaged item(s) or box(es). Report generated ${new Date().toLocaleString()}.` }),
    rows,
    h("div", { class: "pq-sign" }, h("div", { text: "Customer signature" }), h("div", { text: "Mover signature" })),
  ]);
}

register("moveday", render);
