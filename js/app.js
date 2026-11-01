// Entry point: frame guard, load state, nav, router, offline support.

import { $$ } from "./dom.js";
import { loadState } from "./state.js";
import { start } from "./router.js";
import "./views/home.js";
import "./views/inventory.js";
import "./views/boxes.js";
import "./views/scan.js";
import "./views/moveday.js";
import "./views/plan.js";
import "./views/checklist.js";
import "./views/quotes.js";
import "./views/settings.js";
import "./views/label.js";

// Refuse to run inside another site's frame (clickjacking). GitHub Pages
// can't send frame-ancestors headers, so it's enforced here.
if (window.top !== window.self) {
  document.body.replaceChildren(Object.assign(document.createElement("p"), {
    className: "empty", textContent: "BoxBuddy can't be shown inside another page. Open it directly.",
  }));
  throw new Error("BoxBuddy refused to load in a frame.");
}

document.addEventListener("routechange", (e) => {
  const name = e.detail.name;
  document.body.classList.toggle("public", name === "label");
  for (const a of $$(".tabs a")) {
    const on = a.dataset.view === name;
    a.classList.toggle("active", on);
    if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  }
});

await loadState();
start(document.getElementById("view"));

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(() => { /* offline mode unavailable */ });
}
