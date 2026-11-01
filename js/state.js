// App state: collections loaded from IndexedDB (re-validated on every load,
// since storage is shared with other pages on this origin) and saved back on
// change.

import * as db from "./db.js";
import { addDays, localDate } from "./engine/dates.js";
import { COLLECTIONS, sanitizeCollections, sanitizePhoto, sanitizeSettings } from "./engine/sanitize.js";
import { templateTasks } from "./engine/plan.js";

export { COLLECTIONS };

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

const moveKey = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return [...bytes].map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 10);
};

export const DEFAULT_SETTINGS = () => ({
  moveName: "Our move", moveKey: moveKey(), moveDate: addDays(localDate(), 42), fromPlace: "", toPlace: "",
  units: "imperial", homeSize: "BR2", efficiency: 0.8, nextBoxNo: 1,
});

export const DEFAULT_ROOMS = () => [
  ["Kitchen", "orange"], ["Living room", "blue"], ["Bedroom 1", "green"], ["Bedroom 2", "purple"], ["Bathroom", "teal"], ["Office", "yellow"], ["Garage", "gray"],
].map(([name, color]) => ({ id: uid(), name, color }));

export const state = { settings: DEFAULT_SETTINGS(), rooms: [], items: [], boxes: [], tasks: [], quotes: [] };

export async function loadState() {
  const saved = await db.getKV("settings");
  state.settings = sanitizeSettings(saved, DEFAULT_SETTINGS());
  const raw = {};
  for (const c of COLLECTIONS) raw[c] = await db.getKV(c);
  Object.assign(state, sanitizeCollections(raw));
  if (!saved) {
    // First run: sensible starting rooms and the checklist.
    state.rooms = DEFAULT_ROOMS();
    state.tasks = templateTasks(uid);
    saveAll();
  }
  return Boolean(saved);
}

const timers = {};
export function save(name) {
  clearTimeout(timers[name]);
  timers[name] = setTimeout(() => db.setKV(name, name === "settings" ? state.settings : state[name]), 150);
}
export function saveAll() {
  save("settings");
  for (const c of COLLECTIONS) save(c);
}

export const byId = (coll, id) => state[coll].find((x) => x.id === id) || null;
export const today = () => localDate();
export const roomOf = (id) => byId("rooms", id);

export function nextBoxNo() {
  const used = new Set(state.boxes.map((b) => b.no));
  let n = state.settings.nextBoxNo;
  while (used.has(n)) n++;
  state.settings.nextBoxNo = n + 1;
  save("settings");
  return n;
}

// ------------------------------------------------------------- backup

export function exportBackup() {
  const out = { app: "boxbuddy", version: 1, exportedAt: new Date().toISOString(), settings: state.settings };
  for (const c of COLLECTIONS) out[c] = state[c];
  return out;
}

export async function importBackup(data) {
  if (!data || typeof data !== "object" || data.app !== "boxbuddy") throw new Error("This is not a BoxBuddy backup file.");
  for (const c of COLLECTIONS) if (data[c] != null && !Array.isArray(data[c])) throw new Error(`Backup field "${c}" is not a list.`);
  const clean = sanitizeCollections(data);
  await db.wipe();
  state.settings = sanitizeSettings(data.settings, DEFAULT_SETTINGS());
  for (const c of COLLECTIONS) state[c] = clean[c];
  for (const p of Array.isArray(data.photos) ? data.photos.slice(0, 5000) : []) {
    const safe = sanitizePhoto(p);
    if (safe) await db.putPhoto(safe);
  }
  saveAll();
}

export async function wipeAll() {
  await db.wipe();
  state.settings = DEFAULT_SETTINGS();
  for (const c of COLLECTIONS) state[c] = [];
}
