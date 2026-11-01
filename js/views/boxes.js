// Boxes: list, search contents, print labels, and box count guide.

import { h, mount, download } from "../dom.js";
import { state, roomOf } from "../state.js";
import { BOX_SIZES, HOME_SIZES } from "../engine/catalog.js";
import { totals, boxTargets } from "../engine/volume.js";
import { badge, bindSelect } from "../ui.js";
import { register, rerender } from "../router.js";
import { roomChip, boxFlags, boxStatus, editBox, showBox, printLabels } from "./shared.js";

const filter = { q: "", roomId: "", show: "all" };
const selected = new Set();

/** Boxes whose number, room or contents match the query. */
export function searchBoxes(q) {
  const s = q.trim().toLowerCase();
  if (!s) return state.boxes;
  return state.boxes.filter((b) => String(b.no) === s.replace(/^#/, "") || b.contents.some((c) => c.toLowerCase().includes(s)) || (roomOf(b.roomId)?.name || "").toLowerCase().includes(s));
}

function render(el) {
  const t = totals(state);
  const listBox = h("div");
  const drawList = () => {
    let list = searchBoxes(filter.q);
    if (filter.roomId) list = list.filter((b) => b.roomId === filter.roomId);
    if (filter.show === "unprinted") list = list.filter((b) => !b.printed);
    if (filter.show === "unpacked") list = list.filter((b) => !b.packed);
    list = [...list].sort((a, b) => a.no - b.no);
    for (const id of [...selected]) if (!state.boxes.some((b) => b.id === id)) selected.delete(id);
    const q = filter.q.trim().toLowerCase();
    mount(listBox,
      h("div", { class: "row space mb-8" },
        h("label", { class: "check" }, (() => {
          const cb = h("input", { type: "checkbox", checked: list.length > 0 && list.every((b) => selected.has(b.id)), "aria-label": "Select all shown" });
          cb.addEventListener("change", () => { for (const b of list) cb.checked ? selected.add(b.id) : selected.delete(b.id); drawList(); });
          return cb;
        })(), `Select all shown (${list.length})`),
        h("div", { class: "row" },
          h("button", { class: "btn sm primary", disabled: !selected.size, onclick: () => printLabels(state.boxes.filter((b) => selected.has(b.id))), text: `Print ${selected.size || ""} label(s)` }),
          h("button", { class: "btn sm", disabled: !state.boxes.some((b) => !b.printed), onclick: () => printLabels(state.boxes.filter((b) => !b.printed)), text: "Print all unprinted" }))),
      list.length ? h("div", { class: "box-grid" }, list.map((b) => {
        const cb = h("input", { type: "checkbox", checked: selected.has(b.id), "aria-label": `Select box ${b.no}` });
        cb.addEventListener("change", () => { cb.checked ? selected.add(b.id) : selected.delete(b.id); drawList(); });
        const hits = q ? b.contents.filter((c) => c.toLowerCase().includes(q)) : [];
        return h("div", { class: "box-card" + (selected.has(b.id) ? " sel" : "") },
          h("div", { class: "box-top" }, cb, h("button", { class: "box-no", onclick: () => showBox(b), text: `#${b.no}` }), roomChip(roomOf(b.roomId))),
          h("button", { class: "box-body", onclick: () => showBox(b) },
            h("div", { class: "muted small", text: `${BOX_SIZES[b.size]?.label || b.size}${b.printed ? "" : " · label not printed"}` }),
            h("div", { class: "box-contents", text: (hits.length ? hits : b.contents).slice(0, 5).join(", ") || "No contents listed" })),
          h("div", { class: "row wrap" }, boxStatus(b), boxFlags(b)));
      })) : h("p", { class: "empty", text: state.boxes.length ? "No boxes match." : "No boxes yet. Add one for each box you pack." }));
  };

  const search = h("input", { type: "search", value: filter.q, placeholder: "Find anything: kettle, passports, box 12…", "aria-label": "Search boxes", class: "grow" });
  search.addEventListener("input", () => { filter.q = search.value; drawList(); });

  const targets = boxTargets(state.settings.homeSize, t.bySize);
  mount(el,
    h("div", { class: "page-head" }, h("div", {}, h("h1", { text: "Boxes" }), h("div", { class: "muted", text: `${t.boxes} boxes · ${t.packed} packed · ${state.boxes.filter((b) => !b.printed).length} labels to print` })),
      h("div", { class: "row" },
        h("button", { class: "btn", onclick: () => exportCsv(), disabled: !state.boxes.length, text: "Export list" }),
        h("button", { class: "btn primary", onclick: () => editBox(null, { roomId: filter.roomId }), text: "+ New box" }))),
    h("div", { class: "card" },
      h("div", { class: "row mb-12" }, search,
        bindSelect(filter, "roomId", [h("option", { value: "", text: "All rooms" }), ...state.rooms.map((r) => h("option", { value: r.id, text: r.name }))], () => drawList()),
        bindSelect(filter, "show", [["all", "All boxes"], ["unprinted", "Label not printed"], ["unpacked", "Not packed yet"]].map(([v, l]) => h("option", { value: v, text: l })), () => drawList())),
      listBox),
    h("div", { class: "card mt-16" },
      h("div", { class: "card-head" }, h("h2", { text: `How many boxes? (${HOME_SIZES[state.settings.homeSize]})` }), h("a", { class: "btn sm", href: "#/settings", text: "Change home size" })),
      h("p", { class: "muted small", text: "Rule-of-thumb counts for your home size, compared with the boxes you've added. Buy a few extra." }),
      h("div", { class: "table-wrap" }, h("table", {},
        h("thead", {}, h("tr", {}, ["Size", "Good for", "Suggested", "Added", "Still need"].map((x, i) => h("th", { class: i >= 2 ? "num" : "", text: x })))),
        h("tbody", {}, targets.map((r) => h("tr", {},
          h("td", { text: `${BOX_SIZES[r.size].label} (${BOX_SIZES[r.size].cuft} cu ft)` }), h("td", { class: "muted", text: BOX_SIZES[r.size].hint }),
          h("td", { class: "num", text: String(r.guide) }), h("td", { class: "num", text: String(r.have) }),
          h("td", { class: "num" }, r.short ? badge(String(r.short), "warn") : badge("✓", "good")))))))));
  drawList();
}

function exportCsv() {
  const cell = (v) => {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // spreadsheet formula injection
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = [["box", "room", "size", "contents", "fragile", "heavy", "open_first", "packed", "on_truck", "delivered", "damaged"]];
  for (const b of [...state.boxes].sort((a, c) => a.no - c.no)) {
    rows.push([b.no, roomOf(b.roomId)?.name || "", BOX_SIZES[b.size]?.label || b.size, b.contents.join("; "), b.fragile, b.heavy, b.openFirst, b.packed, b.loaded, b.delivered, b.damaged]);
  }
  download("boxbuddy-boxes.csv", rows.map((r) => r.map(cell).join(",")).join("\n") + "\n", "text/csv");
}

register("boxes", render);
export { rerender };
