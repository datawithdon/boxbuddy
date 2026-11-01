// Box label payloads. The QR code on a label is a link to this app with the
// box summary in the URL fragment (#/label/<payload>). Anyone's phone camera
// can open it and see what's inside without having the app's data, and the
// fragment is never sent to the web server. The payload is untrusted when
// decoded: everything is type-checked and length-limited.

const MAX_CONTENTS_CHARS = 160;
const MAX_PAYLOAD = 1200;

function b64urlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

/** Contents squeezed to fit the label budget, with "+N more" when cut. */
export function summarizeContents(contents, max = MAX_CONTENTS_CHARS) {
  const list = (contents || []).map((c) => String(c).trim()).filter(Boolean);
  const out = [];
  let used = 0;
  for (const c of list) {
    const piece = c.slice(0, 40);
    if (used + piece.length + 2 > max) break;
    out.push(piece);
    used += piece.length + 2;
  }
  const more = list.length - out.length;
  return { items: out, more };
}

export function encodeLabel({ moveKey, moveName, box, room }) {
  const s = summarizeContents(box.contents);
  const data = {
    v: 1, k: moveKey, n: box.no, r: (room?.name || "").slice(0, 30), c: room?.color || "", m: (moveName || "").slice(0, 30),
    s: box.size, i: s.items, x: s.more,
    f: box.fragile ? 1 : 0, h: box.heavy ? 1 : 0, o: box.openFirst ? 1 : 0,
  };
  return b64urlEncode(JSON.stringify(data));
}

export const labelUrl = (base, payload) => `${base}#/label/${payload}`;

const str = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");

/** Decode and validate; returns null for anything malformed. */
export function decodeLabel(payload) {
  if (typeof payload !== "string" || !payload || payload.length > MAX_PAYLOAD || !/^[A-Za-z0-9_-]+$/.test(payload)) return null;
  let d;
  try { d = JSON.parse(b64urlDecode(payload)); } catch { return null; }
  if (!d || typeof d !== "object" || Array.isArray(d) || d.v !== 1) return null;
  const n = Number(d.n);
  if (!Number.isInteger(n) || n < 1 || n > 100000) return null;
  return {
    moveKey: /^[A-Za-z0-9]{1,16}$/.test(d.k || "") ? d.k : "",
    no: n,
    room: str(d.r, 30),
    color: /^[a-z]{1,10}$/.test(d.c || "") ? d.c : "",
    moveName: str(d.m, 30),
    size: /^[A-Z]{1,10}$/.test(d.s || "") ? d.s : "",
    items: Array.isArray(d.i) ? d.i.slice(0, 20).map((x) => str(x, 40)).filter(Boolean) : [],
    more: Number.isInteger(d.x) && d.x > 0 && d.x < 10000 ? d.x : 0,
    fragile: d.f === 1, heavy: d.h === 1, openFirst: d.o === 1,
  };
}

/** Pull a label payload or a plain box number out of scanned text. */
export function parseScan(text) {
  const t = String(text || "").trim();
  const m = /#\/label\/([A-Za-z0-9_-]+)/.exec(t);
  if (m) {
    const label = decodeLabel(m[1]);
    return label ? { type: "label", label } : { type: "invalid" };
  }
  if (/^\d{1,6}$/.test(t)) return { type: "number", no: Number(t) };
  return { type: "invalid" };
}
