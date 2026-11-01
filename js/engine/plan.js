// Moving checklist template and mover-quote comparison.

import { addDays, dayDiff, isDate } from "./dates.js";

/** Tasks with an offset in days from moving day (negative = before). */
export const TASK_TEMPLATE = [
  [-56, "Decide: do it yourself or hire movers"],
  [-56, "List your furniture and appliances in BoxBuddy for a volume estimate"],
  [-49, "Get at least 3 mover quotes or truck prices"],
  [-42, "Book movers or the rental truck"],
  [-42, "Declutter: sell, donate or recycle what you won't move"],
  [-35, "Get boxes, tape, markers, bubble wrap and furniture pads"],
  [-30, "Give notice to your landlord or confirm the closing date"],
  [-28, "Book the elevator / loading zone or parking permit at both addresses"],
  [-21, "Update your address: mail forwarding, bank, employer, government"],
  [-21, "Transfer or cancel utilities, internet and insurance"],
  [-14, "Start packing rooms you rarely use"],
  [-14, "Arrange child and pet care for moving day"],
  [-10, "Use up frozen food and pantry items"],
  [-7, "Pack everything except daily essentials"],
  [-7, "Confirm movers / truck pickup time and both addresses"],
  [-3, "Defrost the freezer; drain fuel from the mower and tools"],
  [-2, "Pack the open-first box: chargers, toiletries, tools, bedding, kettle"],
  [-1, "Charge phones, print labels, get cash for tips"],
  [0, "Take photos and meter readings at the old place"],
  [0, "Scan every box onto the truck and off again"],
  [1, "Set up beds and unpack the open-first box"],
  [7, "Update your driver's licence and vehicle registration"],
  [14, "Unpack the rest; recycle or pass on the boxes"],
];

export const templateTasks = (uid) => TASK_TEMPLATE.map(([offset, title]) => ({ id: uid(), title, offset, done: false, custom: false }));

/** Due date and status for a task relative to moving day and today. */
export function taskStatus(task, moveDate, today) {
  if (!isDate(moveDate)) return { due: null, state: task.done ? "done" : "open", daysLeft: null };
  const due = addDays(moveDate, Number(task.offset) || 0);
  const daysLeft = dayDiff(today, due);
  const state = task.done ? "done" : daysLeft < 0 ? "overdue" : daysLeft <= 3 ? "soon" : "open";
  return { due, state, daysLeft };
}

export const QUOTE_TYPES = { HOURLY: "Hourly", FLAT: "Flat (non-binding)", BINDING: "Binding / fixed", TRUCK: "Truck rental (DIY)" };

/** Estimated total for a quote; for hourly quotes, rate × hours + fees. */
export function quoteTotal(q) {
  const n = (v) => Math.max(0, Number(v) || 0);
  const base = q.type === "HOURLY" ? n(q.rate) * n(q.hours) : n(q.price);
  const mileage = q.type === "TRUCK" ? n(q.miles) * n(q.perMile) : 0;
  return Math.round((base + n(q.travelFee) + n(q.extras) + n(q.insurance) + mileage) * 100) / 100;
}

export function compareQuotes(quotes, cuft) {
  const rows = quotes.map((q) => {
    const total = quoteTotal(q);
    return { q, total, perCuft: cuft > 0 ? total / cuft : null };
  });
  const priced = rows.filter((r) => r.total > 0);
  const min = priced.length ? Math.min(...priced.map((r) => r.total)) : null;
  return rows.map((r) => ({ ...r, cheapest: min != null && r.total === min })).sort((a, b) => (a.total || Infinity) - (b.total || Infinity));
}
