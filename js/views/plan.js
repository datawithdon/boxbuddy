// Plan: truck size options and the loading order.

import { h, mount } from "../dom.js";
import { state, save, roomOf } from "../state.js";
import { VEHICLES, colorOf } from "../engine/catalog.js";
import { totals, recommendVehicle, fmtVolume, fmtWeight } from "../engine/volume.js";
import { loadPlan, TIERS } from "../engine/loadplan.js";
import { badge, printNodes } from "../ui.js";
import { register, rerender } from "../router.js";
import { stat } from "./shared.js";

const view = { vehicle: "" };

function render(el) {
  const s = state.settings;
  const t = totals(state);
  const rec = recommendVehicle(t.cuft, t.lbs, s.efficiency);
  const choice = rec.options.find((o) => o.key === view.vehicle) || rec.best || rec.options.at(-1);
  const plan = loadPlan(state, choice ? choice.cuft * rec.efficiency : 0);

  const eff = h("input", { type: "range", min: 60, max: 95, step: 5, value: Math.round(rec.efficiency * 100), "aria-label": "Packing efficiency" });
  eff.addEventListener("change", () => { s.efficiency = Number(eff.value) / 100; save("settings"); rerender(); });

  mount(el,
    h("div", { class: "page-head" }, h("h1", { text: "Truck & load plan" }), h("button", { class: "btn", disabled: !plan.steps.length, onclick: () => printPlan(plan, choice), text: "Print load plan" })),
    h("div", { class: "stats mb-16" },
      stat("Volume", fmtVolume(t.cuft, s.units), `${t.pieces} pieces + ${t.boxes} boxes`),
      stat("Weight", fmtWeight(t.lbs, s.units), "estimated at ~7 lb per cu ft unless set"),
      stat("Recommended", rec.best ? rec.best.name : rec.multiple ? `${rec.multiple.count} × ${rec.multiple.vehicle.name}` : "—", rec.best ? `${Math.round(rec.best.fill * 100)}% of usable space` : "")),
    h("div", { class: "card" },
      h("div", { class: "card-head" }, h("h2", { text: "Which truck?" }),
        h("label", { class: "row small" }, "Packing efficiency ", eff, h("b", { text: `${Math.round(rec.efficiency * 100)}%` }))),
      h("p", { class: "muted small", text: "No load fills every corner. 80% is typical for a careful household load; use less if you have lots of odd-shaped furniture. Sizes and payloads are typical rental figures; check with your rental company." }),
      h("div", { class: "truck-list" }, rec.options.map((o) => {
        const pct = Math.min(1, o.fill);
        const fill = h("div", { class: "fill" + (o.fill > 1 ? " over" : "") });
        fill.style.width = `${pct * 100}%`;
        return h("button", { class: "truck" + (choice?.key === o.key ? " on" : ""), "aria-pressed": String(choice?.key === o.key), onclick: () => { view.vehicle = o.key; rerender(); } },
          h("div", { class: "row space" }, h("b", { text: o.name }), o.key === rec.best?.key ? badge("Best fit", "good") : !o.fits ? badge(o.fill > 1 ? "Too small" : "Over payload", "bad") : null),
          h("div", { class: "muted small", text: `${fmtVolume(o.cuft, s.units)} · usable ${fmtVolume(o.usable, s.units)} · payload ${fmtWeight(o.maxLbs, s.units)}` }),
          h("div", { class: "gauge", title: `${Math.round(o.fill * 100)}% full` }, fill),
          h("div", { class: "small", text: `${Math.round(o.fill * 100)}% full` }));
      })),
      rec.multiple ? h("p", { class: "notice warn mt-12", text: `This is more than one ${rec.multiple.vehicle.name} can carry. Plan ${rec.multiple.count} trips or trucks, or ask movers about a larger vehicle. A ${VEHICLES.find((v) => v.key === "C40").name} holds about ${fmtVolume(2390, s.units)}.` }) : null),
    h("div", { class: "card mt-16" },
      h("div", { class: "card-head" }, h("h2", { text: `Loading order${choice ? ` for a ${choice.name}` : ""}` }), plan.steps.length ? badge(`${Math.round(plan.fill * 100)}% of usable space`, plan.fill > 1 ? "bad" : "good") : null),
      plan.steps.length ? [
        truckDiagram(plan),
        plan.groups.map((g) => h("div", { class: "tier" },
          h("h3", {}, g.label, " ", h("span", { class: "muted small", text: `· ${fmtVolume(g.cuft, s.units)}` })),
          h("p", { class: "muted small", text: g.tip }),
          h("ol", { class: "steps", start: String(g.steps[0].step) }, g.steps.map((st) => {
            const room = roomOf(st.roomId);
            const dot = h("span", { class: "dot", "aria-hidden": "true" });
            dot.style.background = colorOf(room?.color).hex;
            return h("li", {}, h("span", { text: st.label }), " ", h("span", { class: "chip small" }, dot, room?.name || "No room"));
          })))),
      ] : h("p", { class: "empty", text: "Add furniture and boxes to get a loading order." })));
}

function truckDiagram(plan) {
  // Top view of the cargo box, cab on the left: each tier takes its share.
  const total = Math.max(plan.totalCuft, 1);
  const capacity = plan.fill > 0 ? plan.totalCuft / plan.fill : total;
  const scale = Math.max(total, capacity); // over-full loads fill the whole box
  const bar = h("div", { class: "truck-diagram", role: "img", "aria-label": `Truck filled to ${Math.round(plan.fill * 100)}%: ${plan.groups.map((g) => `${g.label} ${Math.round((g.cuft / total) * 100)}%`).join(", ")}` },
    h("div", { class: "cab", text: "CAB" }),
    h("div", { class: "cargo" }, plan.groups.map((g, i) => {
      const seg = h("div", { class: `seg-t t${TIERS.findIndex((t) => t.key === g.key)}`, title: `${g.label}: ${Math.round((g.cuft / total) * 100)}%` }, h("span", { text: String(i + 1) }));
      seg.style.width = `${(g.cuft / scale) * 100}%`;
      return seg;
    })),
    h("div", { class: "door", text: "DOOR" }));
  return h("div", { class: "mb-12" }, bar,
    h("div", { class: "legend" }, plan.groups.map((g, i) => {
      const sw = h("span", { class: `sw t${TIERS.findIndex((t) => t.key === g.key)}`, "aria-hidden": "true" });
      return h("span", { class: "small" }, sw, `${i + 1}. ${g.label}`);
    })));
}

function printPlan(plan, choice) {
  printNodes("Load plan", [
    h("h1", { text: `Load plan — ${state.settings.moveName}` }),
    h("p", { text: `${choice ? choice.name : ""} · ${Math.round(plan.fill * 100)}% of usable space. Load in this order (cab end first).` }),
    plan.groups.map((g) => [h("h3", { text: g.label }), h("p", { class: "small", text: g.tip }),
      h("ol", { start: String(g.steps[0].step) }, g.steps.map((st) => h("li", { text: `${st.label} — ${roomOf(st.roomId)?.name || "no room"}` })))]),
  ]);
}

register("plan", render);
