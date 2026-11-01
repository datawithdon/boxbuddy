// Home: countdown, volume and truck, packing progress, next tasks.

import { h, mount } from "../dom.js";
import { state, today, roomOf } from "../state.js";
import { dayDiff } from "../engine/dates.js";
import { totals, recommendVehicle, fmtVolume, fmtWeight } from "../engine/volume.js";
import { taskStatus } from "../engine/plan.js";
import { badge } from "../ui.js";
import { register } from "../router.js";
import { roomChip, stat, editBox } from "./shared.js";

function render(el) {
  const s = state.settings;
  const t = totals(state);
  const rec = recommendVehicle(t.cuft, t.lbs, s.efficiency);
  const days = dayDiff(today(), s.moveDate);
  const tasks = state.tasks.map((x) => ({ x, st: taskStatus(x, s.moveDate, today()) }));
  const open = tasks.filter((r) => r.st.state !== "done").sort((a, b) => (a.st.daysLeft ?? 0) - (b.st.daysLeft ?? 0));
  const done = tasks.length - open.length;
  const loaded = state.boxes.filter((b) => b.loaded).length;
  const delivered = state.boxes.filter((b) => b.delivered).length;
  const truck = rec.best ? rec.best.name : rec.multiple ? `${rec.multiple.count} × ${rec.multiple.vehicle.name}` : "—";

  mount(el,
    h("div", { class: "hero card" },
      h("div", {},
        h("div", { class: "muted small", text: s.fromPlace && s.toPlace ? `${s.fromPlace} → ${s.toPlace}` : "Set your addresses in Settings" }),
        h("h1", { text: s.moveName }),
        h("div", { class: "muted", text: new Date(s.moveDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }) })),
      h("div", { class: "countdown" },
        h("div", { class: "big", text: days > 0 ? String(days) : days === 0 ? "Today" : "Done" }),
        h("div", { class: "muted small", text: days > 1 ? "days to go" : days === 1 ? "day to go" : days === 0 ? "it's moving day" : `moved ${-days} day(s) ago` }))),
    h("div", { class: "row wrap mt-12 quick" },
      h("a", { class: "btn primary", href: "#/inventory", text: "+ Add furniture" }),
      h("button", { class: "btn primary", onclick: () => editBox(), text: "+ New box" }),
      h("a", { class: "btn", href: "#/scan", text: "Scan a box" }),
      days <= 1 ? h("a", { class: "btn", href: "#/moveday", text: "Moving day check-in" }) : null),
    h("div", { class: "stats mt-12" },
      stat("Total volume", fmtVolume(t.cuft, s.units), `${t.pieces} pieces · ${t.boxes} boxes`),
      stat("Estimated weight", fmtWeight(t.lbs, s.units), "approximate"),
      stat("Truck", truck, rec.best ? `about ${Math.round(rec.best.fill * 100)}% full` : ""),
      stat("Boxes packed", `${t.packed}/${t.boxes}`, t.boxes ? `${state.boxes.filter((b) => !b.printed).length} label(s) to print` : "add your first box"),
      stat("Checklist", `${done}/${tasks.length}`, `${open.filter((r) => r.st.state === "overdue").length} overdue`, open.some((r) => r.st.state === "overdue") ? "warn" : ""),
      loaded ? stat("Moving day", `${delivered}/${loaded}`, "boxes delivered of those loaded") : null),
    h("div", { class: "grid-2 mt-16" },
      h("div", { class: "card" },
        h("div", { class: "card-head" }, h("h2", { text: "Next up" }), h("a", { class: "btn sm", href: "#/checklist", text: "Full checklist" })),
        open.length ? h("ul", { class: "tasklist" }, open.slice(0, 6).map(({ x, st }) => h("li", {},
          h("span", { text: x.title }),
          st.state === "overdue" ? badge(`${-st.daysLeft}d overdue`, "bad") : st.state === "soon" ? badge(st.daysLeft === 0 ? "today" : `in ${st.daysLeft}d`, "warn") : badge(st.due || "", "")))) : h("p", { class: "empty", text: "All tasks done." })),
      h("div", { class: "card" },
        h("div", { class: "card-head" }, h("h2", { text: "By room" }), h("a", { class: "btn sm", href: "#/plan", text: "Truck & load plan" })),
        t.byRoom.filter((r) => r.cuft > 0).length ? h("table", {},
          h("thead", {}, h("tr", {}, h("th", { text: "Room" }), h("th", { class: "num", text: "Items" }), h("th", { class: "num", text: "Boxes" }), h("th", { class: "num", text: "Volume" }))),
          h("tbody", {}, t.byRoom.filter((r) => r.cuft > 0).map((r) => h("tr", {},
            h("td", {}, roomChip(roomOf(r.roomId))), h("td", { class: "num", text: String(r.items) }), h("td", { class: "num", text: String(r.boxes) }), h("td", { class: "num", text: fmtVolume(r.cuft, s.units) })))))
          : h("p", { class: "empty" }, "Nothing listed yet. ", h("a", { href: "#/inventory", text: "Add your furniture" }), " or ", h("a", { href: "#/settings/data", text: "load the demo move" }), "."))));
}

register("home", render);
