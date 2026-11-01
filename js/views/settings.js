// Settings: move details, units, data (demo, backup, restore, erase).

import { h, mount, toast, download } from "../dom.js";
import { state, save, saveAll, exportBackup, importBackup, wipeAll, loadState, COLLECTIONS } from "../state.js";
import * as db from "../db.js";
import { HOME_SIZES } from "../engine/catalog.js";
import { sampleData } from "../sample.js";
import { bind, bindSelect, confirmDialog, field, options, readFile, tabsNav } from "../ui.js";
import { register, go } from "../router.js";

const TABS = [["move", "Move"], ["data", "Data & privacy"]];

function render(el, [tab = "move"]) {
  const body = h("div");
  mount(el, h("div", { class: "page-head" }, h("h1", { text: "Settings" })), tabsNav(TABS, tab, (k) => `#/settings/${k}`), body);
  (tab === "data" ? data : move)(body);
}

function move(el) {
  const s = state.settings;
  const saved = () => save("settings");
  mount(el, h("div", { class: "card" },
    h("div", { class: "fields" },
      field("Move name (printed on labels)", bind(s, "moveName", { maxlength: 40 }, saved)),
      field("Moving day", bind(s, "moveDate", { type: "date" }, (v) => { if (!v) return; saved(); })),
      field("Moving from", bind(s, "fromPlace", { maxlength: 80, placeholder: "optional" }, saved)),
      field("Moving to", bind(s, "toPlace", { maxlength: 80, placeholder: "optional" }, saved)),
      field("Home size (for box estimates)", bindSelect(s, "homeSize", options(HOME_SIZES), saved)),
      field("Units", bindSelect(s, "units", options({ imperial: "Cubic feet, pounds", metric: "Cubic metres, kilograms" }), saved))),
    h("p", { class: "muted small mt-12", text: "Addresses are optional and stay on this device. They are never put on box labels." })));
}

function data(el) {
  const fileIn = h("input", { type: "file", accept: "application/json,.json", class: "hidden" });
  fileIn.addEventListener("change", async () => {
    const f = fileIn.files[0];
    if (!f) return;
    if (f.size > 100 * 1024 * 1024) { toast("That file is too large."); return; }
    try {
      const parsed = JSON.parse(await readFile(f, "text"));
      if (!(await confirmDialog("Restoring replaces everything currently on this device. Continue?", "Restore"))) return;
      await importBackup(parsed);
      toast("Backup restored.");
      go("#/home");
    } catch (e) {
      toast(e.message || "Couldn't read that file.");
    }
  });
  mount(el,
    h("div", { class: "card" },
      h("h2", { class: "mb-8", text: "Your data" }),
      h("p", { class: "muted", text: `Everything stays on this device, in this browser${db.isPersistent() ? "" : " (storage is blocked here, so data only lasts until you close the tab)"}. Nothing is uploaded. Back up before switching phones or clearing browser data.` }),
      h("p", { class: "small mono", text: COLLECTIONS.map((c) => `${state[c].length} ${c}`).join(" · ") }),
      h("div", { class: "row mt-12" },
        h("button", { class: "btn primary", onclick: async () => {
          const out = exportBackup();
          if (await confirmDialog("Include photos in the backup? (Makes the file larger.)", "Include photos", false)) out.photos = await db.allPhotos();
          download(`boxbuddy-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(out), "application/json");
        }, text: "Download backup" }),
        h("button", { class: "btn", onclick: () => fileIn.click(), text: "Restore backup" }), fileIn)),
    h("div", { class: "card mt-16" },
      h("h2", { class: "mb-8", text: "Box labels and privacy" }),
      h("p", { class: "muted", text: "Each label's QR code holds the box number, room, move name and a short contents list, so anyone who scans it can read those. Don't list valuables or personal documents on a label you'll leave on view; write \"Documents\" instead of \"Passports\"." })),
    h("div", { class: "card mt-16" },
      h("h2", { class: "mb-8", text: "Demo move" }),
      h("p", { class: "muted", text: "Loads a sample two-bedroom move three weeks out, with furniture, 17 boxes, quotes and the checklist. Replaces what's here now." }),
      h("button", { class: "btn mt-8", onclick: async () => {
        if ((state.items.length || state.boxes.length) && !(await confirmDialog("Replace your move with the demo move?", "Load demo"))) return;
        await wipeAll();
        Object.assign(state, sampleData());
        saveAll();
        toast("Demo move loaded.");
        go("#/home");
      }, text: "Load demo move" })),
    h("div", { class: "card mt-16 danger-zone" },
      h("h2", { class: "mb-8", text: "Start over" }),
      h("p", { class: "muted", text: "Erases every room, item, box, photo, task and quote on this device." }),
      h("button", { class: "btn danger mt-8", onclick: async () => {
        if (!(await confirmDialog("Erase everything on this device? This can't be undone.", "Erase everything"))) return;
        await wipeAll();
        await loadState();
        toast("Erased. Starting fresh.");
        go("#/home");
      }, text: "Erase all data" })));
}

register("settings", render);
