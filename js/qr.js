// QR codes: drawing them as SVG (vendor/qrcode.js) and reading them from the
// camera with the browser's BarcodeDetector, falling back to vendor/jsQR.js
// (loaded only when needed).

const SVG = "http://www.w3.org/2000/svg";

/** An <svg> QR code for `text`, built with DOM calls (no markup strings). */
export function qrSvg(text, { ecc = "M", margin = 2, title = "QR code" } = {}) {
  const qr = window.qrcode(0, ecc);
  qr.addData(text, "Byte");
  qr.make();
  const n = qr.getModuleCount();
  const size = n + margin * 2;
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", title);
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.setAttribute("class", "qr");
  const bg = document.createElementNS(SVG, "rect");
  bg.setAttribute("width", size);
  bg.setAttribute("height", size);
  bg.setAttribute("fill", "#fff");
  svg.append(bg);
  // One path for all dark modules keeps the DOM small.
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + margin} ${r + margin}h1v1h-1z`;
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "#000");
  svg.append(path);
  return svg;
}

let jsqrLoading = null;
function loadJsQR() {
  if (window.jsQR) return Promise.resolve(window.jsQR);
  if (!jsqrLoading) {
    jsqrLoading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "vendor/jsQR.js";
      s.onload = () => resolve(window.jsQR);
      s.onerror = () => { jsqrLoading = null; reject(new Error("Could not load the QR reader.")); };
      document.head.append(s);
    });
  }
  return jsqrLoading;
}

async function makeDetector() {
  if ("BarcodeDetector" in window) {
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats();
      if (formats.includes("qr_code")) {
        const det = new window.BarcodeDetector({ formats: ["qr_code"] });
        return async (video) => (await det.detect(video))[0]?.rawValue || null;
      }
    } catch { /* fall through to jsQR */ }
  }
  const jsQR = await loadJsQR();
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  return async (video) => {
    const w = video.videoWidth, h = video.videoHeight;
    if (!w || !h) return null;
    const scale = Math.min(1, 720 / Math.max(w, h));
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" })?.data || null;
  };
}

/**
 * Start scanning into `video`. Calls onResult(text) for each new code
 * (the same code is ignored for 2.5 s). Returns stop().
 */
export async function startScanner(video, onResult) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser can't use the camera. Type the box number instead.");
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
  video.srcObject = stream;
  video.setAttribute("playsinline", "");
  video.muted = true;
  await video.play();
  const detect = await makeDetector();
  let stopped = false, last = "", lastAt = 0, busy = false;
  const tick = async () => {
    if (stopped) return;
    if (!busy && video.readyState >= 2) {
      busy = true;
      try {
        const text = await detect(video);
        const now = Date.now();
        if (text && (text !== last || now - lastAt > 2500)) { last = text; lastAt = now; onResult(text); }
      } catch { /* keep scanning */ }
      busy = false;
    }
    setTimeout(tick, 150);
  };
  tick();
  return () => {
    stopped = true;
    for (const t of stream.getTracks()) t.stop();
    video.srcObject = null;
  };
}
