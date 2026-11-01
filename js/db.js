// IndexedDB persistence. Each collection (rooms, items, boxes…) is one
// record in the "kv" store; photos live in their own store because they are
// large. If IndexedDB is unavailable (private mode, blocked site data) the app
// keeps working in memory for the session.

const DB_NAME = "boxbuddy";
const VERSION = 1;
let dbp = null;
const memory = { kv: new Map(), photos: new Map() };
let persistent = true;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    let req;
    try {
      req = indexedDB.open(DB_NAME, VERSION);
    } catch {
      persistent = false;
      return resolve(null);
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
      if (!db.objectStoreNames.contains("photos")) {
        const s = db.createObjectStore("photos", { keyPath: "id" });
        s.createIndex("ownerId", "ownerId");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { persistent = false; resolve(null); };
    req.onblocked = () => { persistent = false; resolve(null); };
  });
  return dbp;
}

export const isPersistent = () => persistent;

function tx(db, store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const out = fn(s);
    t.oncomplete = () => resolve(out instanceof IDBRequest ? out.result : out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export async function getKV(key) {
  const db = await open();
  if (!db) return memory.kv.get(key);
  try { return await tx(db, "kv", "readonly", (s) => s.get(key)); } catch { return memory.kv.get(key); }
}

export async function setKV(key, value) {
  const db = await open();
  memory.kv.set(key, value);
  if (!db) return false;
  try { await tx(db, "kv", "readwrite", (s) => s.put(value, key)); return true; } catch { return false; }
}

export async function putPhoto(photo) {
  const db = await open();
  memory.photos.set(photo.id, photo);
  if (!db) return;
  try { await tx(db, "photos", "readwrite", (s) => s.put(photo)); } catch { /* kept in memory */ }
}

export async function photosFor(ownerId) {
  const db = await open();
  const mem = [...memory.photos.values()].filter((p) => p.ownerId === ownerId);
  if (!db) return mem;
  try {
    const rows = await tx(db, "photos", "readonly", (s) => s.index("ownerId").getAll(ownerId));
    return rows?.length ? rows : mem;
  } catch { return mem; }
}

export async function allPhotos() {
  const db = await open();
  if (!db) return [...memory.photos.values()];
  try { return await tx(db, "photos", "readonly", (s) => s.getAll()); } catch { return [...memory.photos.values()]; }
}

export async function deletePhoto(id) {
  const db = await open();
  memory.photos.delete(id);
  if (!db) return;
  try { await tx(db, "photos", "readwrite", (s) => s.delete(id)); } catch { /* ignore */ }
}

export async function wipe() {
  const db = await open();
  memory.kv.clear();
  memory.photos.clear();
  if (!db) return;
  try {
    await tx(db, "kv", "readwrite", (s) => s.clear());
    await tx(db, "photos", "readwrite", (s) => s.clear());
  } catch { /* ignore */ }
}
