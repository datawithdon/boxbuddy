// Scan: read box labels with the camera, or type a number; look up, mark
// on truck, or mark delivered. Also "where is…?" search.

import { h, mount, toast } from "../dom.js";
import { state, save, roomOf } from "../state.js";
import { parseScan } from "../engine/label.js";
import { badge } from "../ui.js";
import { register, rerender, currentRoute } from "../router.js";
import { startScanner } from "../qr.js";
import { showBox, roomChip, boxStatus, boxFlags } from "./shared.js";
import { searchBoxes } from "./boxes.js";

let stopCam = null;
let mode = "lookup";
const log = [];
// Live parts of the screen, updated in place so the camera keeps running.
const live = { hint: null, log: null, segs: null };

export function stopCamera() {
  if (stopCam) { stopCam(); stopCam = null; }
}
document.addEventListener("routechange", () => { if (currentRoute() !== "scan") stopCamera(); });
document.addEventListener("visibilitychange", () => { if (document.hidden) stopCamera(); });

/** Apply a scanned/typed value in the current mode. */
export function handleScan(text) {
  const r = parseScan(text);
  if (r.type === "invalid") { toast("That code isn't a BoxBuddy label."); return; }
  const no = r.type === "label" ? r.label.no : r.no;
  if (r.type === "label" && r.label.moveKey && r.label.moveKey !== state.settings.moveKey) {
    toast(`Box ${no} belongs to a different move ("${r.label.moveName || "unknown"}").`);
    return;
  }
  const b = state.boxes.find((x) => x.no === no);
  if (!b) { toast(`Box ${no} isn't in this move.`); return; }
  if (navigator.vibrate) navigator.vibrate(60);
  if (mode === "load" || mode === "unload") {
    const was = mode === "load" ? b.loaded : b.delivered;
    if (mode === "load") { b.loaded = true; b.packed = true; } else { b.delivered = true; b.loaded = true; }
    save("boxes");
    log.unshift({ no, mode, at: new Date(), again: was });
    toast(was ? `Box ${no} was already ${mode === "load" ? "on the truck" : "delivered"}.` : `Box ${no} ${mode === "load" ? "on the truck" : "delivered"} ✓`);
    updateLive();
  } else {
    showBox(b);
  }
}

function hintText() {
  const total = state.boxes.length;
  const loaded = state.boxes.filter((b) => b.loaded).length;
  const delivered = state.boxes.filter((b) => b.delivered).length;
  return mode === "lookup" ? "Scan a label to see what's in the box."
    : mode === "load" ? `Each scan marks a box as on the truck. ${loaded}/${total} loaded.`
      : `Each scan marks a box as delivered. ${delivered}/${loaded || total} delivered.`;
}

function updateLive() {
  if (live.hint) live.hint.textContent = hintText();
  if (live.segs) for (const b of live.segs.children) { const on = b.dataset.mode === mode; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); }
  if (live.log) mount(live.log, log.slice(0, 8).map((l) => h("li", {}, h("b", { text: `Box ${l.no}` }), ` ${l.mode === "load" ? "on truck" : "delivered"}${l.again ? " (already)" : ""} · ${l.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`)));
}

function render(el) {
  // A redraw replaces the <video>, so any running camera is stopped first.
  stopCamera();
  const video = h("video", { class: "cam", "aria-label": "Camera preview", muted: true, playsinline: true });
  const camBox = h("div", { class: "cam-wrap" }, video, h("div", { class: "cam-frame", "aria-hidden": "true" }));
  const camBtn = h("button", { class: "btn primary", text: "Start camera" });
  const camMsg = h("div", { class: "muted small" });

  camBtn.addEventListener("click", async () => {
    if (stopCam) { stopCamera(); rerender(); return; }
    try {
      camBtn.disabled = true;
      stopCam = await startScanner(video, handleScan);
      camBox.classList.add("on");
      camBtn.textContent = "Stop camera";
    } catch (e) {
      mount(camMsg, e?.name === "NotAllowedError" ? "Camera permission was denied. Allow it in your browser settings, or type the box number below." : e?.message || "Couldn't start the camera.");
    } finally {
      camBtn.disabled = false;
    }
  });

  const numIn = h("input", { type: "number", inputmode: "numeric", min: 1, placeholder: "Box #", "aria-label": "Box number", class: "w-120" });
  const go = () => { if (numIn.value) { handleScan(numIn.value); numIn.value = ""; } };
  numIn.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });

  const findIn = h("input", { type: "search", placeholder: "Where's the… kettle? passports? HDMI cable?", "aria-label": "Find an item", class: "grow" });
  const results = h("div");
  findIn.addEventListener("input", () => {
    const q = findIn.value.trim();
    const list = q ? searchBoxes(q).slice(0, 12) : [];
    mount(results, q && !list.length ? h("p", { class: "muted", text: "Not found in any box." }) : list.map((b) => h("button", { class: "result", onclick: () => showBox(b) },
      h("b", { text: `Box ${b.no}` }), roomChip(roomOf(b.roomId)), boxStatus(b),
      h("div", { class: "muted small", text: b.contents.filter((c) => c.toLowerCase().includes(q.toLowerCase())).join(", ") || b.contents.slice(0, 3).join(", ") }))));
  });

  const modeBtn = (key, label) => h("button", { class: "seg", "data-mode": key, onclick: () => { mode = key; updateLive(); }, text: label });
  live.segs = h("div", { class: "segs mb-12", role: "group", "aria-label": "Scan mode" }, modeBtn("lookup", "Look up"), modeBtn("load", "Loading truck"), modeBtn("unload", "Unloading"));
  live.hint = h("p", { class: "muted small" });
  live.log = h("ul", { class: "scanlog mt-12" });

  mount(el,
    h("div", { class: "page-head" }, h("h1", { text: "Scan" })),
    h("div", { class: "grid-2" },
      h("div", { class: "card" },
        live.segs,
        live.hint,
        camBox,
        h("div", { class: "row mt-8" }, camBtn, h("span", { class: "muted small", text: "or" }), numIn, h("button", { class: "btn", onclick: go, text: "Go" })),
        camMsg,
        live.log),
      h("div", { class: "card" },
        h("h2", { class: "mb-8", text: "Find something" }),
        h("div", { class: "row" }, findIn),
        h("div", { class: "results mt-8" }, results),
        h("p", { class: "muted small mt-12", text: "Tip: the QR code on each label also works with any phone's camera app, so helpers can see what's inside without installing anything." }))));
  updateLive();
}

register("scan", render);
export { badge, boxFlags };
