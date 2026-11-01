// Demo move: a two-bedroom apartment, partly packed, about three weeks out.

import { addDays, localDate } from "./engine/dates.js";
import { ITEMS } from "./engine/catalog.js";
import { TASK_TEMPLATE } from "./engine/plan.js";
import { DEFAULT_SETTINGS } from "./state.js";

export function sampleData(now = new Date()) {
  const T = localDate(now);
  const rooms = [
    { id: "rm-kit", name: "Kitchen", color: "orange" },
    { id: "rm-liv", name: "Living room", color: "blue" },
    { id: "rm-bd1", name: "Main bedroom", color: "green" },
    { id: "rm-bd2", name: "Kids' room", color: "purple" },
    { id: "rm-bath", name: "Bathroom", color: "teal" },
    { id: "rm-off", name: "Office", color: "yellow" },
  ];
  const cat = Object.fromEntries(ITEMS.map((i) => [i.key, i]));
  let n = 0;
  const item = (roomId, key, qty = 1, extra = {}) => {
    const c = cat[key];
    return { id: `it-${++n}`, roomId, name: c.name, catalogKey: key, qty, cuft: c.cuft, lbs: c.lbs ?? null, tier: c.tier, fragile: Boolean(c.fragile), notes: "", loaded: false, delivered: false, damaged: false, damageNote: "", ...extra };
  };
  const items = [
    item("rm-kit", "fridge"), item("rm-kit", "diningtable"), item("rm-kit", "diningchair", 4), item("rm-kit", "microwave"),
    item("rm-liv", "sofa3"), item("rm-liv", "armchair"), item("rm-liv", "coffeetable"), item("rm-liv", "tvstand"), item("rm-liv", "tv55"), item("rm-liv", "bookcase", 2), item("rm-liv", "rug"),
    item("rm-bd1", "bedqueen"), item("rm-bd1", "mattqueen"), item("rm-bd1", "dresser"), item("rm-bd1", "nightstand", 2), item("rm-bd1", "mirror", 1, { notes: "Wrap in blanket" }),
    item("rm-bd2", "bedtwin"), item("rm-bd2", "matttwin"), item("rm-bd2", "chest"),
    item("rm-off", "desk"), item("rm-off", "officechair"), item("rm-off", "monitor", 2),
  ];
  const boxDefs = [
    ["rm-kit", "DISH", ["Dinner plates", "Side plates", "Bowls"], { fragile: true }],
    ["rm-kit", "DISH", ["Wine glasses", "Tumblers", "Mugs"], { fragile: true }],
    ["rm-kit", "M", ["Kettle", "Coffee maker", "Toaster", "Tea and coffee", "Dish soap"], { openFirst: true }],
    ["rm-kit", "M", ["Pots", "Frying pans", "Lids"], {}],
    ["rm-kit", "S", ["Cookbooks"], { heavy: true }],
    ["rm-liv", "S", ["Novels", "Board games"], { heavy: true }],
    ["rm-liv", "S", ["Photo albums", "Records"], { heavy: true }],
    ["rm-liv", "L", ["Throw blankets", "Cushions"], {}],
    ["rm-liv", "M", ["Game console", "Controllers", "HDMI cables", "Speaker"], { fragile: true }],
    ["rm-bd1", "WARDROBE", ["Coats", "Dresses", "Shirts"], {}],
    ["rm-bd1", "L", ["Bed linen", "Towels"], {}],
    ["rm-bd1", "M", ["Sweaters", "Jeans"], {}],
    ["rm-bd2", "L", ["Stuffed animals", "Kids' bedding", "Night light"], { openFirst: true }],
    ["rm-bd2", "M", ["Lego", "Puzzles", "Art supplies"], {}],
    ["rm-bath", "M", ["Toiletries", "First-aid kit", "Hair dryer", "Toilet paper"], { openFirst: true }],
    ["rm-off", "S", ["Files", "Passports & documents folder"], { heavy: true }],
    ["rm-off", "M", ["Laptop dock", "Keyboard", "Cables", "Desk lamp"], { fragile: true }],
  ];
  const boxes = boxDefs.map(([roomId, size, contents, flags], i) => ({
    id: `bx-${i + 1}`, no: i + 1, roomId, size, contents, lbs: null, fragile: false, heavy: false, openFirst: false,
    packed: i < 13, printed: i < 10, loaded: false, delivered: false, damaged: false, damageNote: "", ...flags,
  }));
  const tasks = TASK_TEMPLATE.map(([offset, title], i) => ({ id: `tk-${i + 1}`, title, offset, done: offset <= -28, custom: false }));
  tasks.push({ id: "tk-c1", title: "Book piano tuner at the new place", offset: 10, done: false, custom: true });
  const quotes = [
    { id: "q-1", company: "Blue Door Movers (example)", type: "HOURLY", price: null, rate: 165, hours: 6, crew: 3, travelFee: 120, extras: 40, insurance: null, miles: null, perMile: null, notes: "3 movers, 20 ft truck, 2 h minimum", date: addDays(T, -10) },
    { id: "q-2", company: "Cedar Lane Moving (example)", type: "BINDING", price: 1450, rate: null, hours: null, crew: 3, travelFee: null, extras: null, insurance: 85, miles: null, perMile: null, notes: "Includes mattress bags and TV box", date: addDays(T, -8) },
    { id: "q-3", company: "Truck rental (DIY)", type: "TRUCK", price: 89, rate: null, hours: null, crew: null, travelFee: null, extras: 60, insurance: 30, miles: 40, perMile: 1.29, notes: "15 ft truck, dolly and pads extra", date: addDays(T, -6) },
  ];
  const settings = { ...DEFAULT_SETTINGS(), moveName: "Elm St → Harbour View", moveDate: addDays(T, 21), fromPlace: "12 Elm St, Apt 4", toPlace: "88 Harbour View Rd", homeSize: "BR2", nextBoxNo: boxes.length + 1 };
  return { settings, rooms, items, boxes, tasks, quotes };
}
