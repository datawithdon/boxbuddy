import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { sampleData } from "../js/sample.js";
import { sanitizeCollections } from "../js/engine/sanitize.js";
import { totals, recommendVehicle } from "../js/engine/volume.js";
import { loadPlan } from "../js/engine/loadplan.js";
import { encodeLabel, decodeLabel } from "../js/engine/label.js";

test("demo move is consistent and survives sanitising", () => {
  const d = sampleData(new Date(2026, 9, 31, 12));
  const c = sanitizeCollections(d);
  for (const k of Object.keys(c)) assert.equal(c[k].length, d[k].length, k);
  for (const x of [...d.items, ...d.boxes]) assert.ok(d.rooms.some((r) => r.id === x.roomId), x.id);
  const t = totals(d);
  assert.ok(t.cuft > 300 && t.cuft < 900, `volume ${t.cuft}`);
  assert.ok(recommendVehicle(t.cuft, t.lbs).best);
  assert.equal(loadPlan(d, 600).steps.length, d.items.length + d.boxes.length);
  for (const b of d.boxes) {
    const room = d.rooms.find((r) => r.id === b.roomId);
    const l = decodeLabel(encodeLabel({ moveKey: d.settings.moveKey, moveName: d.settings.moveName, box: b, room }));
    assert.equal(l.no, b.no);
    assert.ok(encodeLabel({ moveKey: d.settings.moveKey, moveName: d.settings.moveName, box: b, room }).length < 500);
  }
});

test("service worker caches every app file and only files that exist", () => {
  const sw = fs.readFileSync("sw.js", "utf8");
  const shell = JSON.parse(sw.match(/const SHELL = (\[[^\]]+\]);/)[1]);
  for (const f of shell) if (f !== "./") assert.ok(fs.existsSync(f), `missing ${f}`);
  const js = [...fs.readdirSync("js").filter((f) => f.endsWith(".js")).map((f) => `js/${f}`),
    ...fs.readdirSync("js/engine").map((f) => `js/engine/${f}`), ...fs.readdirSync("js/views").map((f) => `js/views/${f}`)];
  for (const f of js) assert.ok(shell.includes(f), `sw.js does not cache ${f}`);
});
