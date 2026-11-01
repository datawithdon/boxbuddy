// Reference data: common household items with typical moving volumes, box
// sizes, rental trucks and rule-of-thumb box counts. All figures are
// estimates in the spirit of movers' "cube sheets"; real items vary.

// tier = loading group (see loadplan.js):
//   heavy: appliances and very heavy pieces, loaded first against the cab
//   furniture: large furniture
//   mattress: mattresses and box springs, stood on edge along the walls
//   small: small furniture and loose items
export const ITEMS = [
  // Living room
  { key: "sofa3", name: "Sofa, 3-seat", cuft: 35, cat: "Living room", tier: "furniture" },
  { key: "sofa2", name: "Loveseat", cuft: 25, cat: "Living room", tier: "furniture" },
  { key: "sectional", name: "Sectional sofa (per section)", cuft: 30, cat: "Living room", tier: "furniture" },
  { key: "armchair", name: "Armchair", cuft: 15, cat: "Living room", tier: "furniture" },
  { key: "recliner", name: "Recliner", cuft: 25, cat: "Living room", tier: "furniture" },
  { key: "coffeetable", name: "Coffee table", cuft: 6, cat: "Living room", tier: "small" },
  { key: "endtable", name: "Side / end table", cuft: 4, cat: "Living room", tier: "small" },
  { key: "tvstand", name: "TV stand / media unit", cuft: 15, cat: "Living room", tier: "furniture" },
  { key: "tv55", name: "TV, up to 55\"", cuft: 10, cat: "Living room", tier: "small", fragile: true },
  { key: "tv75", name: "TV, 65\" or larger", cuft: 15, cat: "Living room", tier: "small", fragile: true },
  { key: "bookcase", name: "Bookcase", cuft: 20, cat: "Living room", tier: "furniture" },
  { key: "floorlamp", name: "Floor lamp", cuft: 3, cat: "Living room", tier: "small", fragile: true },
  { key: "rug", name: "Rug, rolled", cuft: 5, cat: "Living room", tier: "small" },
  { key: "piano", name: "Upright piano", cuft: 70, cat: "Living room", tier: "heavy", lbs: 500 },
  // Bedroom
  { key: "bedking", name: "King bed frame", cuft: 25, cat: "Bedroom", tier: "furniture" },
  { key: "bedqueen", name: "Queen bed frame", cuft: 20, cat: "Bedroom", tier: "furniture" },
  { key: "bedtwin", name: "Twin / single bed frame", cuft: 12, cat: "Bedroom", tier: "furniture" },
  { key: "mattking", name: "King mattress", cuft: 45, cat: "Bedroom", tier: "mattress" },
  { key: "mattqueen", name: "Queen mattress", cuft: 35, cat: "Bedroom", tier: "mattress" },
  { key: "matttwin", name: "Twin / single mattress", cuft: 20, cat: "Bedroom", tier: "mattress" },
  { key: "boxspring", name: "Box spring", cuft: 30, cat: "Bedroom", tier: "mattress" },
  { key: "dresser", name: "Dresser", cuft: 30, cat: "Bedroom", tier: "furniture" },
  { key: "chest", name: "Chest of drawers", cuft: 20, cat: "Bedroom", tier: "furniture" },
  { key: "nightstand", name: "Nightstand", cuft: 5, cat: "Bedroom", tier: "small" },
  { key: "wardrobe", name: "Wardrobe / armoire", cuft: 40, cat: "Bedroom", tier: "furniture" },
  { key: "crib", name: "Crib", cuft: 10, cat: "Bedroom", tier: "furniture" },
  { key: "mirror", name: "Large mirror", cuft: 5, cat: "Bedroom", tier: "small", fragile: true },
  // Kitchen & dining
  { key: "diningtable", name: "Dining table", cuft: 30, cat: "Kitchen & dining", tier: "furniture" },
  { key: "diningchair", name: "Dining chair", cuft: 5, cat: "Kitchen & dining", tier: "small" },
  { key: "barstool", name: "Bar stool", cuft: 3, cat: "Kitchen & dining", tier: "small" },
  { key: "hutch", name: "China cabinet / hutch", cuft: 40, cat: "Kitchen & dining", tier: "furniture", fragile: true },
  { key: "microwave", name: "Microwave", cuft: 3, cat: "Kitchen & dining", tier: "small" },
  // Appliances
  { key: "fridge", name: "Refrigerator", cuft: 45, cat: "Appliances", tier: "heavy", lbs: 300 },
  { key: "freezer", name: "Chest freezer", cuft: 30, cat: "Appliances", tier: "heavy", lbs: 200 },
  { key: "washer", name: "Washing machine", cuft: 25, cat: "Appliances", tier: "heavy", lbs: 200 },
  { key: "dryer", name: "Dryer", cuft: 25, cat: "Appliances", tier: "heavy", lbs: 130 },
  { key: "dishwasher", name: "Dishwasher", cuft: 20, cat: "Appliances", tier: "heavy", lbs: 100 },
  { key: "stove", name: "Stove / range", cuft: 30, cat: "Appliances", tier: "heavy", lbs: 200 },
  // Office
  { key: "desk", name: "Desk", cuft: 22, cat: "Office", tier: "furniture" },
  { key: "officechair", name: "Office chair", cuft: 8, cat: "Office", tier: "small" },
  { key: "filecab", name: "Filing cabinet", cuft: 12, cat: "Office", tier: "heavy", lbs: 100 },
  { key: "monitor", name: "Computer monitor", cuft: 3, cat: "Office", tier: "small", fragile: true },
  { key: "printer", name: "Printer", cuft: 3, cat: "Office", tier: "small" },
  // Garage & outdoor
  { key: "bike", name: "Bicycle", cuft: 10, cat: "Garage & outdoor", tier: "small" },
  { key: "mower", name: "Lawn mower", cuft: 15, cat: "Garage & outdoor", tier: "heavy", lbs: 80 },
  { key: "grill", name: "Barbecue grill", cuft: 15, cat: "Garage & outdoor", tier: "furniture" },
  { key: "patioset", name: "Patio table + 4 chairs", cuft: 35, cat: "Garage & outdoor", tier: "furniture" },
  { key: "toolchest", name: "Tool chest", cuft: 15, cat: "Garage & outdoor", tier: "heavy", lbs: 150 },
  { key: "shelf", name: "Shelving unit", cuft: 15, cat: "Garage & outdoor", tier: "furniture" },
  // Misc
  { key: "plant", name: "Large plant", cuft: 5, cat: "Other", tier: "small", fragile: true },
  { key: "art", name: "Framed art / picture", cuft: 2, cat: "Other", tier: "small", fragile: true },
  { key: "suitcase", name: "Suitcase", cuft: 4, cat: "Other", tier: "small" },
  { key: "stroller", name: "Stroller", cuft: 8, cat: "Other", tier: "small" },
  { key: "treadmill", name: "Treadmill", cuft: 30, cat: "Other", tier: "heavy", lbs: 250 },
];

export const CATEGORIES = [...new Set(ITEMS.map((i) => i.cat))];

/** Boxes: cubic feet and a typical packed weight in pounds. */
export const BOX_SIZES = {
  S: { label: "Small", cuft: 1.5, lbs: 30, hint: "books, tools, tins" },
  M: { label: "Medium", cuft: 3, lbs: 35, hint: "kitchen, toys, small appliances" },
  L: { label: "Large", cuft: 4.5, lbs: 35, hint: "linens, pillows, lampshades" },
  XL: { label: "Extra large", cuft: 6, lbs: 35, hint: "duvets, cushions, bulky light items" },
  DISH: { label: "Dish pack", cuft: 5, lbs: 50, hint: "plates, glasses (with dividers)" },
  WARDROBE: { label: "Wardrobe box", cuft: 10, lbs: 40, hint: "hanging clothes" },
};

/** Rental trucks and containers (approximate interior volume and payload). */
export const VEHICLES = [
  { key: "VAN", name: "Cargo van", cuft: 245, maxLbs: 3800 },
  { key: "T10", name: "10 ft truck", cuft: 400, maxLbs: 2800 },
  { key: "T15", name: "15 ft truck", cuft: 760, maxLbs: 6300 },
  { key: "T20", name: "20 ft truck", cuft: 1015, maxLbs: 5600 },
  { key: "T26", name: "26 ft truck", cuft: 1680, maxLbs: 9900 },
  { key: "C20", name: "20 ft shipping container", cuft: 1170, maxLbs: 47000 },
  { key: "C40", name: "40 ft shipping container", cuft: 2390, maxLbs: 58000 },
];

export const HOME_SIZES = {
  STUDIO: "Studio", BR1: "1 bedroom", BR2: "2 bedrooms", BR3: "3 bedrooms", BR4: "4+ bedrooms",
};

/** Rule-of-thumb box counts by home size. */
export const BOX_GUIDE = {
  STUDIO: { S: 10, M: 15, L: 5, XL: 2, DISH: 1, WARDROBE: 1 },
  BR1: { S: 15, M: 20, L: 8, XL: 3, DISH: 2, WARDROBE: 2 },
  BR2: { S: 20, M: 30, L: 12, XL: 4, DISH: 3, WARDROBE: 3 },
  BR3: { S: 30, M: 45, L: 18, XL: 6, DISH: 4, WARDROBE: 4 },
  BR4: { S: 40, M: 60, L: 24, XL: 8, DISH: 5, WARDROBE: 5 },
};

/** Room colours for labels: distinct hues with names, so colour is never the only cue. */
export const ROOM_COLORS = [
  { key: "blue", name: "Blue", hex: "#2563eb" },
  { key: "orange", name: "Orange", hex: "#ea580c" },
  { key: "green", name: "Green", hex: "#16a34a" },
  { key: "purple", name: "Purple", hex: "#7c3aed" },
  { key: "red", name: "Red", hex: "#dc2626" },
  { key: "teal", name: "Teal", hex: "#0d9488" },
  { key: "pink", name: "Pink", hex: "#db2777" },
  { key: "yellow", name: "Yellow", hex: "#ca8a04" },
  { key: "brown", name: "Brown", hex: "#92400e" },
  { key: "gray", name: "Gray", hex: "#4b5563" },
];
export const colorOf = (key) => ROOM_COLORS.find((c) => c.key === key) || ROOM_COLORS[ROOM_COLORS.length - 1];

export const LBS_PER_CUFT = 7; // movers' standard density for household goods
export const CUFT_TO_M3 = 0.0283168;
export const LB_TO_KG = 0.453592;
