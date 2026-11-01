// Volume, weight, truck choice and box targets.

import { BOX_SIZES, BOX_GUIDE, VEHICLES, LBS_PER_CUFT, CUFT_TO_M3, LB_TO_KG } from "./catalog.js";

const r1 = (n) => Math.round(n * 10) / 10;

export const itemCuft = (it) => (Number(it.cuft) || 0) * Math.max(0, Number(it.qty) || 0);
export const itemLbs = (it) => (it.lbs != null && it.lbs !== "" ? Number(it.lbs) || 0 : (Number(it.cuft) || 0) * LBS_PER_CUFT) * Math.max(0, Number(it.qty) || 0);
export const boxCuft = (b) => BOX_SIZES[b.size]?.cuft || 0;
export const boxLbs = (b) => (b.lbs != null && b.lbs !== "" ? Number(b.lbs) || 0 : BOX_SIZES[b.size]?.lbs || 0);

/** Totals overall and per room. */
export function totals({ rooms = [], items = [], boxes = [] }) {
  const byRoom = new Map(rooms.map((r) => [r.id, { roomId: r.id, cuft: 0, lbs: 0, items: 0, boxes: 0 }]));
  const bucket = (id) => {
    if (!byRoom.has(id)) byRoom.set(id, { roomId: id || "", cuft: 0, lbs: 0, items: 0, boxes: 0 });
    return byRoom.get(id);
  };
  let cuft = 0, lbs = 0, pieces = 0;
  for (const it of items) {
    const b = bucket(it.roomId);
    const c = itemCuft(it), w = itemLbs(it), q = Math.max(0, Number(it.qty) || 0);
    b.cuft += c; b.lbs += w; b.items += q;
    cuft += c; lbs += w; pieces += q;
  }
  const bySize = Object.fromEntries(Object.keys(BOX_SIZES).map((k) => [k, 0]));
  let packed = 0;
  for (const bx of boxes) {
    const b = bucket(bx.roomId);
    b.cuft += boxCuft(bx); b.lbs += boxLbs(bx); b.boxes++;
    cuft += boxCuft(bx); lbs += boxLbs(bx);
    if (bx.size in bySize) bySize[bx.size]++;
    if (bx.packed) packed++;
  }
  return {
    cuft: r1(cuft), lbs: Math.round(lbs), pieces, boxes: boxes.length, packed, bySize,
    byRoom: [...byRoom.values()].map((x) => ({ ...x, cuft: r1(x.cuft), lbs: Math.round(x.lbs) })),
  };
}

/**
 * Smallest single vehicle that fits, given a packing efficiency (share of
 * the interior you can really fill; ~0.8 for a careful household load).
 * When nothing fits, the number of the largest truck needed.
 */
export function recommendVehicle(cuft, lbs, efficiency = 0.8, vehicles = VEHICLES.filter((v) => v.key.startsWith("T") || v.key === "VAN")) {
  const eff = Math.min(1, Math.max(0.3, Number(efficiency) || 0.8));
  const sorted = [...vehicles].sort((a, b) => a.cuft - b.cuft);
  const options = sorted.map((v) => ({ ...v, usable: Math.round(v.cuft * eff), fill: cuft / (v.cuft * eff), fits: cuft <= v.cuft * eff && lbs <= v.maxLbs }));
  const best = options.find((o) => o.fits) || null;
  let multiple = null;
  if (!best && cuft > 0) {
    const big = sorted[sorted.length - 1];
    const n = Math.max(Math.ceil(cuft / (big.cuft * eff)), Math.ceil(lbs / big.maxLbs));
    multiple = { vehicle: big, count: n };
  }
  return { best, options, multiple, efficiency: eff };
}

/** Boxes still to get, compared with the rule-of-thumb guide for the home size. */
export function boxTargets(homeSize, bySize) {
  const guide = BOX_GUIDE[homeSize] || BOX_GUIDE.BR2;
  return Object.keys(BOX_SIZES).map((k) => ({ size: k, guide: guide[k] || 0, have: bySize?.[k] || 0, short: Math.max(0, (guide[k] || 0) - (bySize?.[k] || 0)) }));
}

export const fmtVolume = (cuft, units) => (units === "metric" ? `${(cuft * CUFT_TO_M3).toFixed(1)} m³` : `${Math.round(cuft).toLocaleString("en-US")} cu ft`);
export const fmtWeight = (lbs, units) => (units === "metric" ? `${Math.round(lbs * LB_TO_KG).toLocaleString("en-US")} kg` : `${Math.round(lbs).toLocaleString("en-US")} lb`);
