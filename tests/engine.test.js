import { test } from "node:test";
import assert from "node:assert/strict";
import { totals, recommendVehicle, boxTargets, fmtVolume, fmtWeight } from "../js/engine/volume.js";
import { loadPlan } from "../js/engine/loadplan.js";
import { encodeLabel, decodeLabel, parseScan, summarizeContents, labelUrl } from "../js/engine/label.js";
import { taskStatus, quoteTotal, compareQuotes, templateTasks } from "../js/engine/plan.js";
import { sanitizeCollections, sanitizeSettings, sanitizePhoto, isSafeImage } from "../js/engine/sanitize.js";

const rooms = [{ id: "r1", name: "Kitchen", color: "orange" }, { id: "r2", name: "Bedroom", color: "blue" }];
const items = [
  { id: "i1", roomId: "r2", name: "Queen mattress", qty: 1, cuft: 35, tier: "mattress" },
  { id: "i2", roomId: "r1", name: "Refrigerator", qty: 1, cuft: 45, lbs: 300, tier: "heavy" },
  { id: "i3", roomId: "r1", name: "Dining chair", qty: 4, cuft: 5, tier: "small" },
  { id: "i4", roomId: "r2", name: "Mirror", qty: 1, cuft: 5, tier: "small", fragile: true },
];
const boxes = [
  { id: "b1", no: 1, roomId: "r1", size: "DISH", contents: ["Plates"], packed: true },
  { id: "b2", no: 2, roomId: "r2", size: "L", contents: ["Pillows"] },
  { id: "b3", no: 3, roomId: "r1", size: "M", openFirst: true, contents: ["Kettle"] },
];

test("totals: volume, default weight and per room", () => {
  const t = totals({ rooms, items, boxes });
  assert.equal(t.cuft, 35 + 45 + 20 + 5 + 5 + 4.5 + 3);
  assert.equal(t.lbs, 35 * 7 + 300 + 20 * 7 + 5 * 7 + 50 + 35 + 35);
  assert.equal(t.pieces, 7);
  assert.equal(t.packed, 1);
  assert.equal(t.bySize.DISH, 1);
  assert.equal(t.byRoom.find((r) => r.roomId === "r1").boxes, 2);
});

test("vehicle recommendation respects packing efficiency and payload", () => {
  const r = recommendVehicle(300, 2000, 0.8);
  assert.equal(r.best.key, "T10"); // 400*0.8 = 320 ≥ 300; van 196 too small
  assert.equal(recommendVehicle(300, 3000, 0.8).best.key, "T15"); // 10ft payload 2800 too low
  const big = recommendVehicle(4000, 20000, 0.8);
  assert.equal(big.best, null);
  assert.deepEqual([big.multiple.vehicle.key, big.multiple.count], ["T26", 3]);
  assert.equal(recommendVehicle(0, 0).best.key, "VAN");
});

test("box targets vs guide", () => {
  const t = boxTargets("STUDIO", { S: 12, M: 3 });
  assert.deepEqual(t.find((x) => x.size === "S"), { size: "S", guide: 10, have: 12, short: 0 });
  assert.equal(t.find((x) => x.size === "M").short, 12);
  assert.equal(fmtVolume(1000, "metric"), "28.3 m³");
  assert.equal(fmtWeight(1000, "imperial"), "1,000 lb");
});

test("load plan order: heavy, mattress, heavy boxes, boxes, small, fragile/open-first last", () => {
  const p = loadPlan({ rooms, items, boxes }, 100);
  assert.deepEqual(p.steps.map((s) => s.id), ["i2", "i1", "b1", "b2", "i3", "b3", "i4"]);
  assert.equal(p.steps.at(-1).tier, "last");
  assert.ok(Math.abs(p.fill - 1.175) < 1e-9);
  assert.deepEqual(p.groups.map((g) => g.key), ["heavy", "mattress", "heavyBoxes", "boxes", "small", "last"]);
  const dish = loadPlan({ rooms, items: [], boxes: [{ id: "d", no: 9, roomId: "r1", size: "DISH", fragile: true }, { id: "f", no: 8, roomId: "r1", size: "M", fragile: true }] }, 100);
  assert.deepEqual(dish.steps.map((s) => [s.id, s.tier]), [["d", "heavyBoxes"], ["f", "last"]]);
});

test("labels round-trip, survive unicode, and reject junk", () => {
  const payload = encodeLabel({ moveKey: "abc12345", moveName: "Our move", box: { ...boxes[2], fragile: true, contents: ["Kettle", "Café mugs ☕", "Toaster"] }, room: rooms[0] });
  const l = decodeLabel(payload);
  assert.equal(l.no, 3);
  assert.equal(l.room, "Kitchen");
  assert.deepEqual(l.items, ["Kettle", "Café mugs ☕", "Toaster"]);
  assert.equal(l.fragile, true);
  assert.equal(l.openFirst, true);
  const url = labelUrl("https://example.test/boxbuddy/", payload);
  assert.equal(parseScan(url).label.no, 3);
  assert.deepEqual(parseScan(" 42 "), { type: "number", no: 42 });
  assert.equal(parseScan("https://evil.test/").type, "invalid");
  assert.equal(decodeLabel("!!!"), null);
  assert.equal(decodeLabel(Buffer.from('{"v":1,"n":"<x>"}').toString("base64url")), null);
  const evil = decodeLabel(Buffer.from(JSON.stringify({ v: 1, n: 5, r: "x".repeat(500), i: [{ a: 1 }, "ok", "y".repeat(100)], c: "red;bg", __proto__: { p: 1 } })).toString("base64url"));
  assert.equal(evil.room.length, 30);
  assert.deepEqual(evil.items, ["ok", "y".repeat(40)]);
  assert.equal(evil.color, "");
  const s = summarizeContents(Array.from({ length: 30 }, (_, i) => `Thing number ${i}`));
  assert.ok(s.items.join(", ").length <= 160);
  assert.equal(s.items.length + s.more, 30);
});

test("tasks and quotes", () => {
  assert.deepEqual(taskStatus({ offset: -7, done: false }, "2026-12-01", "2026-11-26"), { due: "2026-11-24", state: "overdue", daysLeft: -2 });
  assert.equal(taskStatus({ offset: -7 }, "2026-12-01", "2026-11-22").state, "soon");
  assert.equal(taskStatus({ offset: -7, done: true }, "2026-12-01", "2026-11-30").state, "done");
  assert.equal(templateTasks(() => "x").length > 15, true);
  assert.equal(quoteTotal({ type: "HOURLY", rate: 150, hours: 6, travelFee: 100, extras: 50 }), 1050);
  assert.equal(quoteTotal({ type: "TRUCK", price: 120, miles: 30, perMile: 1.2, insurance: 30 }), 186);
  const c = compareQuotes([{ id: "a", type: "FLAT", price: 1400 }, { id: "b", type: "HOURLY", rate: 150, hours: 6 }, { id: "c", type: "FLAT" }], 700);
  assert.deepEqual(c.map((r) => [r.q.id, r.cheapest]), [["b", true], ["a", false], ["c", false]]);
  assert.equal(c[0].perCuft, 900 / 700);
});

test("sanitizing hostile data", () => {
  const raw = JSON.parse(`{"rooms":[{"id":"r1","name":"<script>","color":"red;x"}],
    "items":[{"id":"i1","qty":"9e9","cuft":"lots","tier":"rocket","__proto__":{"x":1}},{"id":"../x"}],
    "boxes":[{"id":"b1","no":"1","contents":"notarray","size":"HUGE"},{"id":"b2","no":1},{"id":"b3","no":2,"contents":[{"a":1},"ok"]}],
    "tasks":[{"id":"t1","offset":"-9999"}],"quotes":[{"id":"q1","type":"EVIL","price":-5}]}`);
  const c = sanitizeCollections(raw);
  assert.equal(c.rooms[0].color, "gray");
  assert.equal(c.items.length, 1);
  assert.equal(c.items[0].qty, 1);
  assert.equal(c.items[0].cuft, 0);
  assert.equal(c.items[0].tier, "small");
  assert.equal(({}).x, undefined);
  assert.deepEqual(c.boxes.map((b) => [b.id, b.no, b.size, b.contents]), [["b1", 1, "M", []], ["b3", 2, "M", ["ok"]]]);
  assert.equal(c.tasks[0].offset, 0);
  assert.equal(c.quotes[0].type, "FLAT");
  assert.equal(c.quotes[0].price, null);
  const d = { moveName: "My move", moveKey: "abcdef12", moveDate: "2026-12-01", units: "imperial", homeSize: "BR2", efficiency: 0.8, nextBoxNo: 1 };
  const s = sanitizeSettings({ moveKey: "<x>", units: "furlongs", efficiency: 9, nextBoxNo: "x" }, d);
  assert.deepEqual([s.moveKey, s.units, s.efficiency, s.nextBoxNo], ["abcdef12", "imperial", 0.8, 1]);
  assert.equal(isSafeImage("data:image/svg+xml;base64,AA=="), false);
  assert.equal(sanitizePhoto({ id: "p", ownerId: "b1", dataUrl: "javascript:x" }), null);
});
