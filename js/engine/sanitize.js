// Backups and stored data are untrusted: every record is rebuilt field by
// field from a fixed schema. Unknown keys (including "__proto__"), wrong
// types and oversized values are dropped or replaced with safe defaults.

import { isDate } from "./dates.js";
import { BOX_SIZES, HOME_SIZES, ROOM_COLORS } from "./catalog.js";
import { QUOTE_TYPES } from "./plan.js";

const MAX = 20000;
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const str = (v, max = 200) => (typeof v === "string" ? v.slice(0, max) : typeof v === "number" && Number.isFinite(v) ? String(v).slice(0, max) : "");
const num = (v, { min = 0, max = 1e7, int = false, fallback = null } = {}) => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  if (!Number.isFinite(n) || n < min || n > max) return fallback;
  return int ? Math.round(n) : n;
};
const bool = (v) => v === true;
const oneOf = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);
const arr = (v, max = MAX) => (Array.isArray(v) ? v.slice(0, max) : []);
export const validId = (v) => typeof v === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(v);
const id = (v) => (validId(v) ? v : null);
const IMG = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;
export const isSafeImage = (u) => typeof u === "string" && u.length < 10 * 1024 * 1024 && IMG.test(u);

const SIZES = Object.keys(BOX_SIZES);
const COLORS = ROOM_COLORS.map((c) => c.key);
const TIERS = ["heavy", "furniture", "mattress", "small"];
const status = (x) => ({ loaded: bool(x.loaded), delivered: bool(x.delivered), damaged: bool(x.damaged), damageNote: str(x.damageNote, 300) });

const SANITIZERS = {
  rooms: (r) => ({ id: id(r.id), name: str(r.name, 30) || "Room", color: oneOf(r.color, COLORS, "gray") }),
  items: (i) => ({
    id: id(i.id), roomId: id(i.roomId) || "", name: str(i.name, 60) || "Item", catalogKey: str(i.catalogKey, 20),
    qty: num(i.qty, { min: 0, max: 999, int: true, fallback: 1 }), cuft: num(i.cuft, { max: 5000, fallback: 0 }),
    lbs: num(i.lbs, { max: 20000 }), tier: oneOf(i.tier, TIERS, "small"), fragile: bool(i.fragile), notes: str(i.notes, 300), ...status(i),
  }),
  boxes: (b) => ({
    id: id(b.id), no: num(b.no, { min: 1, max: 100000, int: true }), roomId: id(b.roomId) || "", size: oneOf(b.size, SIZES, "M"),
    contents: arr(b.contents, 200).map((c) => str(c, 80)).filter(Boolean), lbs: num(b.lbs, { max: 500 }),
    fragile: bool(b.fragile), heavy: bool(b.heavy), openFirst: bool(b.openFirst), packed: bool(b.packed), printed: bool(b.printed), ...status(b),
  }),
  tasks: (t) => ({ id: id(t.id), title: str(t.title, 160) || "Task", offset: num(t.offset, { min: -365, max: 365, int: true, fallback: 0 }), done: bool(t.done), custom: bool(t.custom) }),
  quotes: (q) => ({
    id: id(q.id), company: str(q.company, 80) || "Quote", type: oneOf(q.type, Object.keys(QUOTE_TYPES), "FLAT"),
    price: num(q.price, { max: 1e7 }), rate: num(q.rate, { max: 1e5 }), hours: num(q.hours, { max: 500 }), crew: num(q.crew, { max: 50, int: true }),
    travelFee: num(q.travelFee, { max: 1e6 }), extras: num(q.extras, { max: 1e6 }), insurance: num(q.insurance, { max: 1e6 }),
    miles: num(q.miles, { max: 1e5 }), perMile: num(q.perMile, { max: 1e3 }), notes: str(q.notes, 500), date: isDate(q.date) ? q.date : null,
  }),
};

export const COLLECTIONS = Object.keys(SANITIZERS);

export function sanitizeCollections(data) {
  const out = {};
  for (const [name, fn] of Object.entries(SANITIZERS)) {
    const seen = new Set();
    out[name] = arr(data?.[name]).filter(isObj).map(fn).filter((x) => x.id && !seen.has(x.id) && seen.add(x.id));
  }
  // Box numbers must be unique; later duplicates are dropped.
  const nos = new Set();
  out.boxes = out.boxes.filter((b) => b.no != null && !nos.has(b.no) && nos.add(b.no));
  return out;
}

export function sanitizeSettings(s, d) {
  const src = isObj(s) ? s : {};
  return {
    moveName: str(src.moveName, 40) || d.moveName,
    moveKey: typeof src.moveKey === "string" && /^[A-Za-z0-9]{6,16}$/.test(src.moveKey) ? src.moveKey : d.moveKey,
    moveDate: isDate(src.moveDate) ? src.moveDate : d.moveDate,
    fromPlace: str(src.fromPlace, 80), toPlace: str(src.toPlace, 80),
    units: oneOf(src.units, ["imperial", "metric"], d.units),
    homeSize: oneOf(src.homeSize, Object.keys(HOME_SIZES), d.homeSize),
    efficiency: num(src.efficiency, { min: 0.3, max: 1, fallback: d.efficiency }),
    nextBoxNo: num(src.nextBoxNo, { min: 1, max: 100000, int: true, fallback: d.nextBoxNo }),
  };
}

export function sanitizePhoto(p) {
  if (!isObj(p) || !validId(p.id) || !validId(p.ownerId) || !isSafeImage(p.dataUrl)) return null;
  return { id: p.id, ownerId: p.ownerId, kind: oneOf(p.kind, ["contents", "damage", "item"], "contents"), dataUrl: p.dataUrl, caption: str(p.caption, 120), takenAt: str(p.takenAt, 30) };
}
