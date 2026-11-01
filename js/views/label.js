// Public label page: what anyone sees when they scan a box's QR code with
// their phone camera. Works without any saved data; everything shown comes
// from the (validated) URL fragment.

import { h, mount } from "../dom.js";
import { state } from "../state.js";
import { decodeLabel } from "../engine/label.js";
import { BOX_SIZES, colorOf } from "../engine/catalog.js";
import { register } from "../router.js";
import { showBox } from "./shared.js";

function render(el, [payload]) {
  const l = decodeLabel(payload || "");
  if (!l) {
    mount(el, h("div", { class: "card empty-state" }, h("h1", { text: "Unreadable label" }), h("p", { class: "muted", text: "This link doesn't contain a valid BoxBuddy label." }), h("a", { class: "btn", href: "#/home", text: "Open BoxBuddy" })));
    return;
  }
  const c = colorOf(l.color);
  const mine = l.moveKey && l.moveKey === state.settings.moveKey ? state.boxes.find((b) => b.no === l.no) : null;
  const band = h("div", { class: "pub-band" }, h("span", { text: l.room || "Room not set" }), h("span", { class: "small", text: c.name }));
  band.style.background = c.hex;
  mount(el, h("div", { class: "pub card" },
    band,
    h("div", { class: "pub-no" }, h("small", { text: "BOX" }), String(l.no)),
    l.moveName ? h("div", { class: "muted center", text: l.moveName }) : null,
    h("div", { class: "row center wrap mt-8" },
      l.fragile ? h("span", { class: "badge bad", text: "Fragile" }) : null,
      l.heavy ? h("span", { class: "badge warn", text: "Heavy" }) : null,
      l.openFirst ? h("span", { class: "badge accent", text: "Open first" }) : null,
      l.size && BOX_SIZES[l.size] ? h("span", { class: "badge", text: BOX_SIZES[l.size].label }) : null),
    h("h2", { class: "mt-16", text: "Inside" }),
    l.items.length ? h("ul", { class: "contents big" }, l.items.map((x) => h("li", { text: x })), l.more ? h("li", { class: "muted", text: `+ ${l.more} more item(s)` }) : null) : h("p", { class: "muted", text: "No contents listed." }),
    h("p", { class: "muted small mt-16", text: "Contents as of when the label was printed." }),
    mine ? h("button", { class: "btn primary mt-8", onclick: () => showBox(mine), text: "Open this box in my move" }) : h("a", { class: "btn mt-8", href: "#/home", text: "What is BoxBuddy?" })));
}

register("label", render);
