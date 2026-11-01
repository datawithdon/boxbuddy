// Quotes: compare movers and truck rental side by side.

import { h, mount, toast } from "../dom.js";
import { state, save, uid, today } from "../state.js";
import { QUOTE_TYPES, compareQuotes } from "../engine/plan.js";
import { totals, fmtVolume } from "../engine/volume.js";
import { badge, bind, bindSelect, confirmDialog, field, openDialog, options } from "../ui.js";
import { register, rerender } from "../router.js";

const money = (n) => (n == null ? "—" : `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

function render(el) {
  const t = totals(state);
  const rows = compareQuotes(state.quotes, t.cuft);
  mount(el,
    h("div", { class: "page-head" }, h("div", {}, h("h1", { text: "Quotes" }), h("div", { class: "muted", text: `Compared against your measured volume: ${fmtVolume(t.cuft, state.settings.units)}.` })),
      h("button", { class: "btn primary", onclick: () => editQuote(), text: "+ Add quote" })),
    rows.length ? h("div", { class: "quote-grid" }, rows.map(({ q, total, perCuft, cheapest }) => h("div", { class: "card quote" + (cheapest ? " best" : "") },
      h("div", { class: "card-head" }, h("h2", { text: q.company }), cheapest ? badge("Lowest", "good") : null),
      h("div", { class: "big", text: total ? money(total) : "—" }),
      h("div", { class: "muted small", text: `${QUOTE_TYPES[q.type]}${perCuft ? ` · ${money(perCuft)} per cu ft` : ""}` }),
      h("dl", { class: "meta mt-8" },
        q.type === "HOURLY" ? [h("dt", { text: "Rate × hours" }), h("dd", { text: `${money(q.rate)} × ${q.hours ?? "—"} h` })] : [h("dt", { text: "Price" }), h("dd", { text: money(q.price) })],
        q.crew ? [h("dt", { text: "Crew" }), h("dd", { text: `${q.crew} people` })] : null,
        q.travelFee ? [h("dt", { text: "Travel fee" }), h("dd", { text: money(q.travelFee) })] : null,
        q.type === "TRUCK" && q.miles ? [h("dt", { text: "Mileage" }), h("dd", { text: `${q.miles} × ${money(q.perMile)}` })] : null,
        q.extras ? [h("dt", { text: "Extras" }), h("dd", { text: money(q.extras) })] : null,
        q.insurance ? [h("dt", { text: "Insurance" }), h("dd", { text: money(q.insurance) })] : null,
        q.notes ? [h("dt", { text: "Notes" }), h("dd", { text: q.notes })] : null),
      q.type === "HOURLY" ? h("p", { class: "muted small", text: "Hourly quotes depend on how long the job really takes. Ask for a not-to-exceed price." }) : null,
      h("button", { class: "btn sm mt-8", onclick: () => editQuote(q), text: "Edit" })))) : h("div", { class: "card empty" }, "No quotes yet. Get at least three; your volume above helps movers quote accurately."),
    h("p", { class: "muted small mt-12", text: "Totals add fees, extras and insurance. Prices are shown as entered; there's no currency conversion." }));
}

function editQuote(existing) {
  const q = existing ? { ...existing } : { id: uid(), company: "", type: "FLAT", price: null, rate: null, hours: null, crew: null, travelFee: null, extras: null, insurance: null, miles: null, perMile: null, notes: "", date: today() };
  const typeFields = h("div", { class: "fields" });
  const drawType = () => mount(typeFields,
    q.type === "HOURLY" ? [field("Hourly rate", bind(q, "rate", { type: "number", min: 0, step: "any" })), field("Estimated hours", bind(q, "hours", { type: "number", min: 0, step: "any" })), field("Crew size", bind(q, "crew", { type: "number", min: 1, step: 1 }))]
      : [field(q.type === "TRUCK" ? "Rental price" : "Quoted price", bind(q, "price", { type: "number", min: 0, step: "any" })), q.type !== "TRUCK" ? field("Crew size", bind(q, "crew", { type: "number", min: 1, step: 1 })) : null],
    q.type === "TRUCK" ? [field("Miles", bind(q, "miles", { type: "number", min: 0, step: "any" })), field("Per mile", bind(q, "perMile", { type: "number", min: 0, step: "any" }))] : field("Travel fee", bind(q, "travelFee", { type: "number", min: 0, step: "any" })),
    field("Extras (packing, stairs, supplies)", bind(q, "extras", { type: "number", min: 0, step: "any" })),
    field("Insurance / valuation", bind(q, "insurance", { type: "number", min: 0, step: "any" })));
  drawType();
  openDialog(existing ? `Edit ${existing.company}` : "Add quote", (close) => [
    h("div", { class: "fields" },
      field("Company", bind(q, "company", { maxlength: 80 })),
      field("Type", bindSelect(q, "type", options(QUOTE_TYPES), drawType)),
      field("Date", bind(q, "date", { type: "date" }))),
    h("div", { class: "mt-12" }, typeFields),
    field("Notes", bind(q, "notes", { maxlength: 500, placeholder: "What's included, minimums, cancellation terms" }), { wide: true }),
    h("div", { class: "row space mt-16" },
      existing ? h("button", { class: "btn danger", onclick: async () => { if (await confirmDialog(`Delete the quote from ${existing.company}?`, "Delete")) { state.quotes = state.quotes.filter((x) => x.id !== q.id); save("quotes"); close(); rerender(); } }, text: "Delete" }) : h("span"),
      h("div", { class: "row" }, h("button", { class: "btn", onclick: close, text: "Cancel" }), h("button", { class: "btn primary", onclick: () => {
        q.company = String(q.company || "").trim().slice(0, 80);
        if (!q.company) { toast("Enter the company."); return; }
        if (existing) Object.assign(existing, q); else state.quotes.push(q);
        save("quotes"); close(); rerender();
      }, text: "Save" }))),
  ], { wide: true });
}

register("quotes", render);
