// Inventory: rooms and the furniture / large items in each.

import { h, mount, toast } from "../dom.js";
import { state, save, uid } from "../state.js";
import { ITEMS, CATEGORIES, ROOM_COLORS, colorOf } from "../engine/catalog.js";
import { itemCuft, totals, fmtVolume } from "../engine/volume.js";
import { badge, bind, bindCheck, bindSelect, confirmDialog, field, openDialog } from "../ui.js";
import { register, rerender } from "../router.js";
import { roomChip, reportDamage } from "./shared.js";

function render(el) {
  const units = state.settings.units;
  const t = totals(state);
  mount(el,
    h("div", { class: "page-head" },
      h("div", {}, h("h1", { text: "Inventory" }), h("div", { class: "muted", text: `Furniture and large items: ${fmtVolume(state.items.reduce((a, i) => a + itemCuft(i), 0), units)}. Boxes are on the Boxes screen.` })),
      h("button", { class: "btn", onclick: () => editRoom(), text: "+ Add room" })),
    state.rooms.length ? state.rooms.map((r) => roomCard(r, t)) : h("div", { class: "card empty", text: "Add a room to start." }),
    state.items.some((i) => !state.rooms.find((r) => r.id === i.roomId)) ? roomCard({ id: "", name: "No room", color: "gray" }, t) : null);
}

function roomCard(room, t) {
  const units = state.settings.units;
  const list = state.items.filter((i) => (room.id ? i.roomId === room.id : !state.rooms.find((r) => r.id === i.roomId)));
  const rt = t.byRoom.find((x) => x.roomId === room.id);
  return h("section", { class: "card mb-16" },
    h("div", { class: "card-head" },
      h("h2", {}, roomChip(room.id ? room : null)),
      h("div", { class: "row" },
        h("span", { class: "muted small", text: rt ? `${fmtVolume(rt.cuft, units)} incl. ${rt.boxes} box(es)` : "" }),
        h("button", { class: "btn sm primary", onclick: () => addFromCatalog(room.id), text: "+ Add items" }),
        room.id ? h("button", { class: "btn sm", onclick: () => editRoom(room), text: "Edit room" }) : null)),
    list.length ? h("div", { class: "table-wrap" }, h("table", {},
      h("thead", {}, h("tr", {}, h("th", { text: "Item" }), h("th", { class: "num", text: "Qty" }), h("th", { class: "num", text: "Volume" }), h("th", { text: "" }))),
      h("tbody", {}, list.map((it) => h("tr", {},
        h("td", {}, it.name, it.fragile ? [" ", badge("Fragile", "bad")] : null, it.damaged ? [" ", badge("Damaged", "bad")] : null, it.notes ? h("div", { class: "muted small", text: it.notes }) : null),
        h("td", { class: "num" }, qtyStepper(it)),
        h("td", { class: "num", text: fmtVolume(itemCuft(it), units) }),
        h("td", { class: "num" }, h("button", { class: "btn sm", onclick: () => editItem(it), text: "Edit" }))))))) : h("p", { class: "muted", text: "No items yet." }));
}

function qtyStepper(it) {
  const set = (q) => { it.qty = Math.max(0, Math.min(999, q)); if (it.qty === 0) state.items = state.items.filter((x) => x !== it); save("items"); rerender(); };
  return h("div", { class: "stepper" },
    h("button", { class: "icon-btn", "aria-label": `One fewer ${it.name}`, onclick: () => set(it.qty - 1), text: "−" }),
    h("span", { text: String(it.qty) }),
    h("button", { class: "icon-btn", "aria-label": `One more ${it.name}`, onclick: () => set(it.qty + 1), text: "+" }));
}

function addFromCatalog(roomId) {
  const pick = new Map();
  const filter = { q: "", cat: guessCategory(roomId) };
  const listBox = h("div", { class: "catalog" });
  const draw = () => {
    const q = filter.q.trim().toLowerCase();
    const rows = ITEMS.filter((i) => (q ? i.name.toLowerCase().includes(q) : !filter.cat || i.cat === filter.cat));
    mount(listBox, rows.map((i) => {
      const n = pick.get(i.key) || 0;
      return h("div", { class: "cat-row" + (n ? " picked" : "") },
        h("div", {}, h("div", { text: i.name }), h("div", { class: "muted small", text: `${fmtVolume(i.cuft, state.settings.units)}${i.fragile ? " · fragile" : ""}` })),
        h("div", { class: "stepper" },
          h("button", { class: "icon-btn", "aria-label": `Remove ${i.name}`, disabled: !n, onclick: () => { pick.set(i.key, Math.max(0, n - 1)); draw(); }, text: "−" }),
          h("span", { text: String(n) }),
          h("button", { class: "icon-btn", "aria-label": `Add ${i.name}`, onclick: () => { pick.set(i.key, n + 1); draw(); }, text: "+" })));
    }), !rows.length ? h("p", { class: "muted", text: "Nothing matches. Add it as a custom item below." }) : null);
  };
  draw();
  openDialog("Add items", (close) => {
    const search = h("input", { type: "search", placeholder: "Search: sofa, desk, fridge…", "aria-label": "Search items" });
    search.addEventListener("input", () => { filter.q = search.value; draw(); });
    const cats = h("div", { class: "pills" }, CATEGORIES.map((c) => h("button", { class: "pill" + (c === filter.cat ? " on" : ""), onclick: (e) => {
      filter.cat = c; filter.q = ""; search.value = "";
      for (const b of cats.children) b.classList.toggle("on", b === e.currentTarget);
      draw();
    }, text: c })));
    return [
      search, cats, listBox,
      h("div", { class: "row space mt-16" },
        h("button", { class: "btn", onclick: () => { close(); editItem(null, roomId); }, text: "Custom item…" }),
        h("div", { class: "row" },
          h("button", { class: "btn", onclick: close, text: "Cancel" }),
          h("button", { class: "btn primary", onclick: () => {
            let n = 0;
            for (const [key, qty] of pick) {
              if (!qty) continue;
              const c = ITEMS.find((i) => i.key === key);
              const same = state.items.find((x) => x.roomId === roomId && x.catalogKey === key && !x.notes);
              if (same) same.qty = Math.min(999, same.qty + qty);
              else state.items.push({ id: uid(), roomId, name: c.name, catalogKey: key, qty, cuft: c.cuft, lbs: c.lbs ?? null, tier: c.tier, fragile: Boolean(c.fragile), notes: "", loaded: false, delivered: false, damaged: false, damageNote: "" });
              n += qty;
            }
            save("items"); close(); if (n) toast(`Added ${n} item(s).`); rerender();
          }, text: "Add" }))),
    ];
  }, { wide: true });
}

function guessCategory(roomId) {
  const name = (state.rooms.find((r) => r.id === roomId)?.name || "").toLowerCase();
  if (/kitchen|dining/.test(name)) return "Kitchen & dining";
  if (/bed|kid|nursery|guest/.test(name)) return "Bedroom";
  if (/office|study/.test(name)) return "Office";
  if (/garage|garden|patio|shed|basement/.test(name)) return "Garage & outdoor";
  if (/laundry|utility/.test(name)) return "Appliances";
  return "Living room";
}

function editItem(existing, roomId) {
  const it = existing ? { ...existing } : { id: uid(), roomId: roomId || state.rooms[0]?.id || "", name: "", catalogKey: "", qty: 1, cuft: 10, lbs: null, tier: "small", fragile: false, notes: "", loaded: false, delivered: false, damaged: false, damageNote: "" };
  openDialog(existing ? `Edit ${existing.name}` : "Custom item", (close) => [
    h("div", { class: "fields" },
      field("Name", bind(it, "name", { maxlength: 60 }), { wide: true }),
      field("Room", bindSelect(it, "roomId", state.rooms.map((r) => h("option", { value: r.id, text: r.name })))),
      field("Quantity", bind(it, "qty", { type: "number", min: 1, max: 999, step: 1 })),
      field("Volume each (cu ft)", bind(it, "cuft", { type: "number", min: 0, step: "any" })),
      field("Weight each (lb, optional)", bind(it, "lbs", { type: "number", min: 0, step: "any", placeholder: "≈ 7 lb per cu ft" })),
      field("Type", bindSelect(it, "tier", [["heavy", "Appliance / very heavy"], ["furniture", "Large furniture"], ["mattress", "Mattress / box spring"], ["small", "Small item"]].map(([v, l]) => h("option", { value: v, text: l })))),
      h("div", { class: "field" }, h("span", { text: "Handling" }), bindCheck(it, "fragile", "Fragile")),
      field("Notes", bind(it, "notes", { maxlength: 300, placeholder: "e.g. take legs off, wrap in blanket" }), { wide: true })),
    h("p", { class: "muted small", text: "Volume tip: length × width × height in feet. A 6 × 3 × 3 ft sofa is about 54 cu ft before allowing for its shape; most tables use about half their box." }),
    h("div", { class: "row space mt-16" },
      existing ? h("div", { class: "row" },
        h("button", { class: "btn danger", onclick: async () => { if (await confirmDialog(`Remove ${existing.name}?`, "Remove")) { state.items = state.items.filter((x) => x.id !== existing.id); save("items"); close(); rerender(); } }, text: "Remove" }),
        h("button", { class: "btn", onclick: () => { close(); reportDamage(existing, "items"); }, text: existing.damaged ? "Edit damage" : "Report damage" })) : h("span"),
      h("div", { class: "row" }, h("button", { class: "btn", onclick: close, text: "Cancel" }), h("button", { class: "btn primary", onclick: () => {
        it.name = String(it.name || "").trim().slice(0, 60);
        if (!it.name) { toast("Enter a name."); return; }
        it.qty = Math.max(1, Math.min(999, Math.round(Number(it.qty) || 1)));
        it.cuft = Math.max(0, Math.min(5000, Number(it.cuft) || 0));
        it.lbs = it.lbs == null || it.lbs === "" ? null : Math.max(0, Number(it.lbs) || 0);
        if (existing) Object.assign(existing, it); else state.items.push(it);
        save("items"); close(); rerender();
      }, text: "Save" }))),
  ]);
}

function editRoom(existing) {
  const r = existing ? { ...existing } : { id: uid(), name: "", color: ROOM_COLORS.find((c) => !state.rooms.some((x) => x.color === c.key))?.key || "gray" };
  openDialog(existing ? `Edit ${existing.name}` : "Add room", (close) => {
    const swatches = h("div", { class: "swatches", role: "radiogroup", "aria-label": "Label colour" }, ROOM_COLORS.map((c) => {
      const b = h("button", { class: "swatch" + (c.key === r.color ? " on" : ""), role: "radio", "aria-checked": String(c.key === r.color), "aria-label": c.name, title: c.name, onclick: () => {
        r.color = c.key;
        for (const x of swatches.children) { x.classList.toggle("on", x === b); x.setAttribute("aria-checked", String(x === b)); }
      } });
      b.style.background = c.hex;
      return b;
    }));
    return [
      h("div", { class: "fields" }, field("Room name", bind(r, "name", { maxlength: 30, placeholder: "e.g. Kitchen" }), { wide: true })),
      h("div", { class: "field mt-12" }, h("span", { text: "Label colour (use matching tape or stickers at the new place)" }), swatches),
      h("div", { class: "row space mt-16" },
        existing ? h("button", { class: "btn danger", onclick: async () => {
          const used = state.items.some((i) => i.roomId === r.id) || state.boxes.some((b) => b.roomId === r.id);
          if (used) { toast("Move this room's items and boxes elsewhere first."); return; }
          if (await confirmDialog(`Delete ${existing.name}?`, "Delete")) { state.rooms = state.rooms.filter((x) => x.id !== r.id); save("rooms"); close(); rerender(); }
        }, text: "Delete room" }) : h("span"),
        h("div", { class: "row" }, h("button", { class: "btn", onclick: close, text: "Cancel" }), h("button", { class: "btn primary", onclick: () => {
          r.name = String(r.name || "").trim().slice(0, 30);
          if (!r.name) { toast("Enter a room name."); return; }
          if (existing) { const relabel = existing.name !== r.name || existing.color !== r.color; Object.assign(existing, r); if (relabel) { for (const b of state.boxes) if (b.roomId === r.id) b.printed = false; save("boxes"); } }
          else state.rooms.push(r);
          save("rooms"); close(); rerender();
        }, text: "Save" }))),
    ];
  });
}

export { colorOf };
register("inventory", render);
