// Truck loading order. Standard practice: heaviest and largest first,
// against the cab; mattresses along the walls; heavy boxes on the floor,
// lighter boxes on top; fragile pieces and the "open first" boxes last so
// they come off first.

import { BOX_SIZES } from "./catalog.js";
import { itemCuft, boxCuft } from "./volume.js";

export const TIERS = [
  { key: "heavy", label: "Appliances & heavy items", tip: "Against the cab, upright, strapped." },
  { key: "furniture", label: "Large furniture", tip: "Tall pieces against the cab or walls; fill gaps with cushions." },
  { key: "mattress", label: "Mattresses & box springs", tip: "On their long edge along the sides, in covers." },
  { key: "heavyBoxes", label: "Heavy boxes", tip: "On the floor, in tight rows." },
  { key: "boxes", label: "Other boxes", tip: "On top of heavy boxes; stack light on heavy." },
  { key: "small", label: "Small furniture & loose items", tip: "Into gaps; chairs seat-to-seat." },
  { key: "last", label: "Fragile & open-first", tip: "Last on, first off. Keep the open-first box by the door." },
];

const HEAVY_BOX = new Set(["S", "DISH"]);

function tierOfItem(it) {
  if (it.fragile) return "last";
  if (["heavy", "furniture", "mattress", "small"].includes(it.tier)) return it.tier;
  return (Number(it.cuft) || 0) >= 20 ? "furniture" : "small";
}

function tierOfBox(b) {
  if (b.openFirst) return "last";
  // Dish packs are fragile but heavy: they ride on the floor, not on top.
  if (b.size === "DISH") return "heavyBoxes";
  if (b.fragile) return "last";
  if (b.heavy || HEAVY_BOX.has(b.size)) return "heavyBoxes";
  return "boxes";
}

/**
 * Ordered steps grouped by tier. Within a tier, larger pieces first, then by
 * room so each room's things travel together. Each step carries the
 * cumulative share of `capacityCuft` used after loading it.
 */
export function loadPlan({ items = [], boxes = [], rooms = [] }, capacityCuft) {
  const roomOrder = new Map(rooms.map((r, i) => [r.id, i]));
  const entries = [];
  for (const it of items) {
    const q = Math.max(0, Math.round(Number(it.qty) || 0));
    if (!q) continue;
    entries.push({ kind: "item", id: it.id, label: q > 1 ? `${it.name} × ${q}` : it.name, roomId: it.roomId, cuft: itemCuft(it), tier: tierOfItem(it), count: q });
  }
  for (const b of boxes) {
    entries.push({ kind: "box", id: b.id, label: `Box ${b.no} (${BOX_SIZES[b.size]?.label || b.size})`, roomId: b.roomId, cuft: boxCuft(b), tier: tierOfBox(b), count: 1 });
  }
  const rank = new Map(TIERS.map((t, i) => [t.key, i]));
  entries.sort((a, b) => rank.get(a.tier) - rank.get(b.tier)
    || (a.kind === "item" && b.kind === "item" ? b.cuft - a.cuft : 0)
    || (roomOrder.get(a.roomId) ?? 99) - (roomOrder.get(b.roomId) ?? 99)
    || a.label.localeCompare(b.label, undefined, { numeric: true }));
  let used = 0;
  const steps = entries.map((e, i) => {
    used += e.cuft;
    return { ...e, step: i + 1, fill: capacityCuft > 0 ? used / capacityCuft : 0 };
  });
  const groups = TIERS.map((t) => {
    const s = steps.filter((x) => x.tier === t.key);
    return { ...t, steps: s, cuft: s.reduce((a, x) => a + x.cuft, 0) };
  }).filter((g) => g.steps.length);
  return { steps, groups, totalCuft: used, fill: capacityCuft > 0 ? used / capacityCuft : 0 };
}
