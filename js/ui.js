// Shared UI pieces: form fields, dialogs, badges and printing.

import { $, h, mount } from "./dom.js";

export const options = (map, selected, blank) => [
  blank != null ? h("option", { value: "", text: blank }) : null,
  ...Object.entries(map).map(([v, l]) => h("option", { value: v, text: l, selected: v === selected })),
];

export function field(label, control, opts = {}) {
  return h("label", { class: "field" + (opts.wide ? " wide" : "") }, h("span", { text: label }), control);
}

/** Text/number/date input bound to obj[key]. */
export function bind(obj, key, attrs = {}, onChange) {
  const type = attrs.type || "text";
  const el = h("input", { autocomplete: "off", ...attrs, type, value: obj[key] ?? "" });
  el.addEventListener(type === "date" || type === "datetime-local" ? "change" : "input", () => {
    let v = el.value;
    if (type === "number") v = v === "" ? null : Number(v);
    obj[key] = v;
    onChange?.(v);
  });
  return el;
}

export function bindSelect(obj, key, opts, onChange) {
  const el = h("select", {}, opts);
  el.value = obj[key] ?? "";
  el.addEventListener("change", () => { obj[key] = el.value; onChange?.(el.value); });
  return el;
}

export function bindCheck(obj, key, label, onChange, disabled = false) {
  const el = h("input", { type: "checkbox", checked: Boolean(obj[key]), disabled });
  el.addEventListener("change", () => { obj[key] = el.checked; onChange?.(el.checked); });
  return h("label", { class: "check" }, el, label);
}

export const badge = (text, kind = "") => h("span", { class: `badge ${kind}`, text });

// --------------------------------------------------------------- dialogs

/** Modal dialog. `build(close)` returns body nodes. Returns close(). */
export function openDialog(title, build, { wide = false, onClose } = {}) {
  const dlg = h("dialog", { class: "dialog" + (wide ? " wide" : ""), "aria-label": title });
  const close = () => { dlg.close(); };
  dlg.addEventListener("close", () => { dlg.remove(); onClose?.(); });
  mount(dlg,
    h("div", { class: "dialog-head" }, h("h2", { text: title }), h("button", { class: "icon-btn", "aria-label": "Close", onclick: close, text: "×" })),
    h("div", { class: "dialog-body" }, build(close)));
  document.body.append(dlg);
  dlg.showModal();
  return close;
}

export function confirmDialog(message, okLabel = "Confirm", danger = true) {
  return new Promise((resolve) => {
    let result = false;
    openDialog("Please confirm", (close) => [
      h("p", { text: message }),
      h("div", { class: "row end mt-12" },
        h("button", { class: "btn", onclick: close, text: "Cancel" }),
        h("button", { class: "btn " + (danger ? "danger-solid" : "primary"), onclick: () => { result = true; close(); }, text: okLabel })),
    ], { onClose: () => resolve(result) });
  });
}

// --------------------------------------------------------------- printing

export function printNodes(docTitle, nodes) {
  mount($("#print-area"), nodes);
  const prev = document.title;
  document.title = docTitle;
  window.addEventListener("afterprint", () => { document.title = prev; mount($("#print-area")); }, { once: true });
  window.print();
}

// --------------------------------------------------------------- files

export function readFile(file, as = "dataURL") {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    if (as === "text") r.readAsText(file);
    else r.readAsDataURL(file);
  });
}

/** Downscale an image file to a JPEG data URL (keeps IndexedDB small). */
export async function compressImage(file, maxSide = 1280, quality = 0.8) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Not a readable image."));
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const tabsNav = (items, active, hrefFor) =>
  h("nav", { class: "subtabs", "aria-label": "Sections" }, items.map(([key, label]) =>
    h("a", { href: hrefFor(key), class: "subtab" + (key === active ? " active" : ""), "aria-current": key === active ? "page" : null, text: label })));
