// Hash router: "#/view/arg1/arg2". Views register a render(el, args) function.

const routes = new Map();
let current = null;
let outlet = null;

export function register(name, render) { routes.set(name, render); }

export function parse() {
  const parts = (location.hash || "#/home").replace(/^#\/?/, "").split("/").map((p) => {
    try { return decodeURIComponent(p); } catch { return ""; }
  });
  return { name: routes.has(parts[0]) ? parts[0] : "home", args: parts.slice(1) };
}

export function rerender() {
  if (!outlet) return;
  const { name, args } = parse();
  current = name;
  const scrollY = window.scrollY;
  try {
    routes.get(name)(outlet, args);
  } catch (e) {
    // Never leave the user stuck: show a way back to backup/erase.
    console.error(e);
    outlet.replaceChildren(failSafe(e));
  }
  window.scrollTo(0, scrollY);
  document.dispatchEvent(new CustomEvent("routechange", { detail: { name } }));
}

export function go(hash) {
  if (location.hash === hash) rerender();
  else location.hash = hash;
}

export function start(el) {
  outlet = el;
  window.addEventListener("hashchange", () => {
    const prev = current;
    rerender();
    if (parse().name !== prev) window.scrollTo(0, 0);
  });
  rerender();
}

export const currentRoute = () => current;

function failSafe(err) {
  const el = (tag, cls, text) => Object.assign(document.createElement(tag), { className: cls || "", textContent: text || "" });
  const box = el("div", "card empty-state");
  const link = el("a", "btn", "Go to Settings → Data");
  link.href = "#/settings/data";
  box.append(el("h2", "", "This screen couldn't be shown"),
    el("p", "muted", "Some saved data is in an unexpected format. You can download a backup, restore an older one, or erase and start again."),
    el("p", "small mono", String(err?.message || err).slice(0, 200)), link);
  return box;
}
