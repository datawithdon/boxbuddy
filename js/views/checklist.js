// Checklist: tasks timed from moving day.

import { h, mount, toast } from "../dom.js";
import { state, save, uid, today } from "../state.js";
import { taskStatus, templateTasks } from "../engine/plan.js";
import { badge, bind, confirmDialog, field, openDialog } from "../ui.js";
import { register, rerender } from "../router.js";

const GROUPS = [
  [-999, -29, "8 to 5 weeks before"], [-28, -15, "4 to 3 weeks before"], [-14, -8, "2 weeks before"],
  [-7, -1, "Final week"], [0, 0, "Moving day"], [1, 999, "After the move"],
];

function render(el) {
  const s = state.settings;
  const rows = state.tasks.map((t) => ({ t, st: taskStatus(t, s.moveDate, today()) }));
  const done = rows.filter((r) => r.t.done).length;
  const bar = h("div", { class: "fill" });
  bar.style.width = `${rows.length ? (done / rows.length) * 100 : 0}%`;
  mount(el,
    h("div", { class: "page-head" },
      h("div", {}, h("h1", { text: "Checklist" }), h("div", { class: "muted", text: `${done} of ${rows.length} done · moving day ${s.moveDate}` })),
      h("div", { class: "row" },
        h("button", { class: "btn", onclick: () => editTask(), text: "+ Add task" }),
        h("button", { class: "btn", onclick: async () => {
          if (!(await confirmDialog("Restore the standard checklist? Your custom tasks stay; standard tasks are reset.", "Restore", false))) return;
          state.tasks = [...templateTasks(uid), ...state.tasks.filter((t) => t.custom)];
          save("tasks"); toast("Checklist restored."); rerender();
        }, text: "Restore standard list" }))),
    h("div", { class: "gauge mb-16", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(rows.length), "aria-valuenow": String(done), "aria-label": "Checklist progress" }, bar),
    GROUPS.map(([from, to, label]) => {
      const list = rows.filter((r) => r.t.offset >= from && r.t.offset <= to).sort((a, b) => a.t.offset - b.t.offset);
      if (!list.length) return null;
      return h("section", { class: "card mb-12" },
        h("h2", { class: "mb-8", text: label }),
        h("ul", { class: "checkrows" }, list.map(({ t, st }) => {
          const cb = h("input", { type: "checkbox", checked: t.done, "aria-label": t.title });
          cb.addEventListener("change", () => { t.done = cb.checked; save("tasks"); rerender(); });
          return h("li", { class: t.done ? "done" : "" },
            h("label", { class: "check grow" }, cb, h("span", { text: t.title })),
            h("div", { class: "row nowrap" },
              st.state === "overdue" ? badge(`${-st.daysLeft}d overdue`, "bad") : st.state === "soon" ? badge(st.daysLeft === 0 ? "today" : `in ${st.daysLeft}d`, "warn") : h("span", { class: "muted small", text: st.due || "" }),
              h("button", { class: "icon-btn", "aria-label": `Edit ${t.title}`, onclick: () => editTask(t), text: "✎" })));
        })));
    }));
}

function editTask(existing) {
  const t = existing ? { ...existing } : { id: uid(), title: "", offset: -7, done: false, custom: true };
  openDialog(existing ? "Edit task" : "Add task", (close) => [
    h("div", { class: "fields" },
      field("Task", bind(t, "title", { maxlength: 160 }), { wide: true }),
      field("Days from moving day (−14 = two weeks before)", bind(t, "offset", { type: "number", min: -365, max: 365, step: 1 }))),
    h("div", { class: "row space mt-16" },
      existing ? h("button", { class: "btn danger", onclick: () => { state.tasks = state.tasks.filter((x) => x.id !== t.id); save("tasks"); close(); rerender(); }, text: "Delete" }) : h("span"),
      h("div", { class: "row" }, h("button", { class: "btn", onclick: close, text: "Cancel" }), h("button", { class: "btn primary", onclick: () => {
        t.title = String(t.title || "").trim().slice(0, 160);
        if (!t.title) { toast("Enter the task."); return; }
        t.offset = Math.max(-365, Math.min(365, Math.round(Number(t.offset) || 0)));
        if (existing) Object.assign(existing, t); else state.tasks.push(t);
        save("tasks"); close(); rerender();
      }, text: "Save" }))),
  ]);
}

register("checklist", render);
