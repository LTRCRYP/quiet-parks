/**
 * Pixel-art sprites and scenes. Sprites are character grids; each character is
 * one pixel and maps to a CSS variable (see PALETTE and globals.css), so the art
 * follows light/dark mode. Geometric shapes are generated, organic ones are
 * drawn by hand. Nothing here is data: a park's biome is a *decorative* guess
 * from its name and NPS topics (see biomeFor).
 */

export type Rows = string[];

/** Pixel character → CSS variable name (without --px- prefix). "." is transparent. */
export const PALETTE: Record<string, string> = {
  k: "ink",
  g: "g", // dark green
  G: "G", // light green
  t: "t", // trunk
  s: "s", // sand
  S: "S", // light sand
  r: "r", // rock
  R: "R", // light rock
  w: "w", // water
  W: "W", // water highlight
  n: "n", // snow
  y: "y", // sun
  o: "o", // clay
  O: "O", // light clay
  c: "c", // cloud
  m: "m", // mountain shade
  M: "M", // mountain light
};

// ---------- generators ----------

function blank(w: number, h: number): string[][] {
  return Array.from({ length: h }, () => Array(w).fill("."));
}
const join = (g: string[][]): Rows => g.map((r) => r.join(""));

/** Triangle mountain: light left face, shaded right face, snow cap. */
export function mountain(h: number, cap = Math.max(2, Math.round(h / 4))): Rows {
  const w = 2 * h - 1;
  const g = blank(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = h - 1 - y; x <= h - 1 + y; x++) {
      const light = x < h - 1 + (y % 2 === 0 ? 0 : 1) - Math.floor(y / 6);
      g[y][x] = y < cap ? "n" : light ? "M" : "m";
    }
  }
  return join(g);
}

/** Flat-topped butte. */
export function mesa(topW: number, h: number, slope = 1): Rows {
  const w = topW + 2 * h * slope;
  const g = blank(w, h);
  for (let y = 0; y < h; y++) {
    const inset = (h - 1 - y) * slope;
    for (let x = inset; x < w - inset; x++) g[y][x] = x < w - inset - Math.ceil(topW / 3) - y ? "O" : "o";
  }
  return join(g);
}

/** Volcano: truncated cone with a lava rim and smoke. */
export function volcano(h: number): Rows {
  const topW = 6;
  const cone = mesa(topW, h, 1).map((r) => r.replace(/O/g, "R").replace(/o/g, "r"));
  const w = cone[0].length;
  const smoke = [
    ".".repeat(Math.floor(w / 2) - 3) + "cc" + ".".repeat(w - Math.floor(w / 2) - 1 + 2),
    ".".repeat(Math.floor(w / 2) - 1) + "ccc",
    ".".repeat(Math.floor(w / 2) - 4) + "cccc",
  ].map((r) => (r + ".".repeat(w)).slice(0, w));
  cone[0] = cone[0].replace(/R|r/g, "o");
  cone[1] = cone[1].replace(/^(\.*)(.)(.)/, "$1$2o");
  return [...smoke, ...cone];
}

/** Semi-ellipse hill or dune. */
export function hill(w: number, h: number, light: string, dark: string): Rows {
  const g = blank(w, h);
  for (let y = 0; y < h; y++) {
    const t = 1 - y / h; // 1 at top
    const half = (w / 2) * Math.sqrt(1 - t * t);
    for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - w / 2;
      if (Math.abs(dx) <= half) g[y][x] = dx < half * 0.35 ? light : dark;
    }
  }
  return join(g);
}

export function disc(d: number, ch: string): Rows {
  const g = blank(d, d);
  const r = d / 2;
  for (let y = 0; y < d; y++)
    for (let x = 0; x < d; x++)
      if ((x + 0.5 - r) ** 2 + (y + 0.5 - r) ** 2 <= r * r) g[y][x] = ch;
  return join(g);
}

export function band(w: number, h: number, ch: string): Rows {
  return Array(h).fill(ch.repeat(w));
}

/** Water band with wave highlights every 8 px. */
export function water(w: number, h: number): Rows {
  const rows = band(w, h, "w");
  const r0 = rows[0].split(""), r1 = (rows[1] ?? "").split("");
  for (let x = 0; x < w; x += 8) {
    if (r0[x + 1]) r0[x + 1] = "W";
    if (r0[x + 2]) r0[x + 2] = "W";
    if (r1[x + 5]) r1[x + 5] = "W";
  }
  rows[0] = r0.join("");
  if (rows[1]) rows[1] = r1.join("");
  return rows;
}

// ---------- hand-drawn sprites ----------

export const SPRITES = {
  pine: [
    ".....G.....",
    "....GGg....",
    "....GGg....",
    "...GGGgg...",
    "...GGGgg...",
    "..GGGGggg..",
    "..GGGGggg..",
    ".GGGGGgggg.",
    ".GGGGGgggg.",
    "GGGGGGggggg",
    ".....t.....",
    ".....t.....",
  ],
  pineSmall: [
    "...G...",
    "..GGg..",
    "..GGg..",
    ".GGGgg.",
    ".GGGgg.",
    "GGGGggg",
    "...t...",
    "...t...",
  ],
  spruce: [
    "...G...",
    "...G...",
    "..GGg..",
    "..GGg..",
    ".GGGgg.",
    "..GGg..",
    ".GGGgg.",
    "GGGGggg",
    ".GGGgg.",
    "GGGGggg",
    "...t...",
    "...t...",
  ],
  snowSpruce: [
    "...n...",
    "...G...",
    "..nnn..",
    "..GGg..",
    ".nnnnn.",
    "..GGg..",
    ".GGGgg.",
    "nnnnnnn",
    ".GGGgg.",
    "GGGGggg",
    "...t...",
    "...t...",
  ],
  roundTree: [
    "...GGGgg...",
    "..GGGGggg..",
    ".GGGGGgggg.",
    "GGGGGGggggg",
    "GGGGGGggggg",
    "GGGGGGggggg",
    ".GGGGGgggg.",
    "..GGGGggg..",
    "...GGggg...",
    ".....t.....",
    ".....t.....",
    ".....t.....",
  ],
  cypress: [
    "....GGg....",
    "...GGGgg...",
    "..GGGGggg..",
    ".GGGGGgggg.",
    "GGGGGGggggg",
    ".GGGGGgggg.",
    "..GGGGggg..",
    "....tt.....",
    "....tt.....",
    "....tt.....",
    "...tttt....",
    "..tttttt...",
  ],
  cactus: [
    "....G....",
    "....Gg...",
    ".G..Gg.G.",
    ".Gg.Gg.Gg",
    ".Gg.Gg.Gg",
    ".GGGGGGGg",
    "..gGGGgg.",
    "....Gg...",
    "....Gg...",
    "....Gg...",
    "....Gg...",
    "....Gg...",
  ],
  cactusSmall: [
    "..G..",
    "G.Gg.",
    "GgGgG",
    ".GGGg",
    "..Gg.",
    "..Gg.",
    "..Gg.",
  ],
  palm: [
    "..GG.....GG..",
    ".GGGG...GGGG.",
    "..GGGG.GGGG..",
    "GGG.GGGGG.GGG",
    ".GGGGGtGGGGG.",
    "....GGtGG....",
    "......t......",
    ".....t.......",
    ".....t.......",
    "....t........",
    "....t........",
    "....t........",
  ],
  grass: ["G.G.G", ".GgG."],
  reeds: [".G.G.", ".G.G.", "GG.GG", ".G.G."],
  cloud: [
    "...cccc.....",
    ".cccccccc...",
    "cccccccccccc",
    "..cccccccc..",
  ],
  cloudSmall: [".cccc.", "cccccc"],
  birds: ["k...k", ".k.k.", "..k.."],
  bird: ["k.k", ".k."],
  cave: [
    ".....rrrrrr.....",
    "...rrrrrrrrrr...",
    "..rrrRRRRrrrrr..",
    ".rrrrrkkkkrrrrr.",
    ".rrrrkkkkkkrrrr.",
    "rrrrkkkkkkkkrrrr",
    "rrrrkkkkkkkkrrrr",
    "rrrrkkkkkkkkrrrr",
    "rrrrkkkkkkkkrrrr",
    "rrrrkkkkkkkkrrrr",
  ],
  arch: [
    "....oooooooo....",
    "..oooooooooooo..",
    ".oooooOOOOoooooo",
    "oooo........oooo",
    "ooo..........ooo",
    "ooo..........ooo",
    "ooo..........ooo",
    "ooo..........ooo",
    "ooo..........ooo",
    "ooo..........ooo",
  ],
  lighthouse: [
    "..kkk..",
    "..yyy..",
    ".kkkkk.",
    "..nnn..",
    "..nnn..",
    "..ooo..",
    "..ooo..",
    "..nnn..",
    "..nnn..",
    ".ooooo.",
    ".ooooo.",
    ".nnnnn.",
    "kkkkkkk",
  ],
  tent: [
    "....k....",
    "...kok...",
    "..koOok..",
    ".koOOOok.",
    "koOOkOOok",
    "kkkkkkkkk",
  ],
  elk: [
    "k.k..",
    ".kk..",
    ".tt..",
    ".tttt",
    ".tttt",
    ".t.t.",
    ".t.t.",
  ],
  snowCap: ["nnnnnn"],
} satisfies Record<string, Rows>;

export type SpriteName = keyof typeof SPRITES;

export const width = (r: Rows) => Math.max(...r.map((x) => x.length));
export const height = (r: Rows) => r.length;

// ---------- scenes ----------

export const BIOMES = [
  "mountain", "forest", "desert", "dunes", "coast", "tropics", "lake", "river",
  "cave", "volcano", "arctic", "prairie", "wetland", "panorama",
] as const;
export type Biome = (typeof BIOMES)[number];

export interface Placement {
  rows: Rows;
  x: number;
  /** Bottom edge, measured from the ground line (0 = standing on the ground, negative = sunk). Default 0. */
  lift?: number;
  /** Absolute top y, for sky objects. Overrides lift. */
  y?: number;
  /** Drawn once per scene (anchored to the right edge) instead of once per tile. */
  sky?: boolean;
}

export interface Scene {
  /** Tile width in pixels; tiles seamlessly. */
  w: number;
  h: number;
  /** y of the ground line. */
  ground: number;
  /** Ground fill rows (drawn from the ground line down). */
  groundRows: Rows;
  items: Placement[];
}

const S = SPRITES;
const TILE_W = 192;
const TILE_H = 48;
const GROUND = 40;

function scene(groundRows: Rows, items: Placement[], w = TILE_W, h = TILE_H, ground = GROUND): Scene {
  return { w, h, ground, groundRows, items };
}
const grass = (w = TILE_W) => [...band(w, 1, "G"), ...band(w, TILE_H - GROUND - 1, "g")];
const sand = (w = TILE_W) => [...band(w, 1, "S"), ...band(w, TILE_H - GROUND - 1, "s")];
const snow = (w = TILE_W) => [...band(w, 2, "n"), ...band(w, TILE_H - GROUND - 2, "R")];
const rock = (w = TILE_W) => [...band(w, 1, "R"), ...band(w, TILE_H - GROUND - 1, "r")];
const sea = (w = TILE_W) => water(w, TILE_H - GROUND);

export const SCENES: Record<Biome, Scene> = {
  mountain: scene(grass(), [
    { rows: disc(8, "y"), x: 150, y: 4, sky: true },
    { rows: S.cloud, x: 40, y: 6 },
    { rows: S.birds, x: 110, y: 12 },
    { rows: mountain(26), x: -6 },
    { rows: mountain(18), x: 44 },
    { rows: mountain(30), x: 96 },
    { rows: mountain(20), x: 154 },
    { rows: S.pineSmall, x: 4 },
    { rows: S.pine, x: 30 },
    { rows: S.pineSmall, x: 58 },
    { rows: S.pine, x: 84 },
    { rows: S.pineSmall, x: 108 },
    { rows: S.pine, x: 140 },
    { rows: S.pineSmall, x: 172 },
  ]),
  forest: scene(grass(), [
    { rows: S.cloudSmall, x: 20, y: 8 },
    { rows: S.cloud, x: 120, y: 5 },
    { rows: hill(80, 10, "G", "g"), x: 10 },
    { rows: hill(90, 12, "G", "g"), x: 110 },
    { rows: S.pine, x: 2 },
    { rows: S.roundTree, x: 18 },
    { rows: S.pine, x: 40 },
    { rows: S.pineSmall, x: 58 },
    { rows: S.roundTree, x: 72 },
    { rows: S.pine, x: 96 },
    { rows: S.pine, x: 114 },
    { rows: S.elk, x: 132 },
    { rows: S.roundTree, x: 146 },
    { rows: S.pine, x: 170 },
    { rows: S.grass, x: 64 },
    { rows: S.grass, x: 160 },
  ]),
  desert: scene(sand(), [
    { rows: disc(10, "y"), x: 28, y: 3, sky: true },
    { rows: S.birds, x: 150, y: 10 },
    { rows: mesa(14, 16), x: 56 },
    { rows: mesa(22, 11), x: 120 },
    { rows: mesa(8, 7), x: 170 },
    { rows: S.cactus, x: 8 },
    { rows: S.cactusSmall, x: 40 },
    { rows: S.cactus, x: 100 },
    { rows: S.cactusSmall, x: 142 },
    { rows: S.grass, x: 80 },
    { rows: S.grass, x: 182 },
  ]),
  dunes: scene(sand(), [
    { rows: disc(10, "y"), x: 140, y: 4, sky: true },
    { rows: hill(110, 16, "S", "s"), x: -20 },
    { rows: hill(120, 20, "S", "s"), x: 70 },
    { rows: hill(80, 10, "S", "s"), x: 150 },
    { rows: S.grass, x: 30 },
    { rows: S.grass, x: 120 },
    { rows: S.cactusSmall, x: 174 },
  ]),
  coast: scene(sea(), [
    { rows: disc(8, "y"), x: 120, y: 5, sky: true },
    { rows: S.cloud, x: 20, y: 6 },
    { rows: S.birds, x: 90, y: 12 },
    { rows: S.bird, x: 150, y: 18 },
    { rows: hill(70, 12, "G", "g"), x: 0, lift: -2 },
    { rows: S.pineSmall, x: 10, lift: 8 },
    { rows: S.pine, x: 26, lift: 10 },
    { rows: S.pineSmall, x: 48, lift: 6 },
    { rows: hill(40, 6, "R", "r"), x: 150, lift: -3 },
    { rows: S.lighthouse, x: 166, lift: 2 },
  ]),
  tropics: scene(sea(), [
    { rows: disc(10, "y"), x: 30, y: 3, sky: true },
    { rows: S.cloudSmall, x: 110, y: 10 },
    { rows: S.birds, x: 70, y: 14 },
    { rows: hill(60, 8, "S", "s"), x: 60, lift: -2 },
    { rows: S.palm, x: 74, lift: 4 },
    { rows: S.palm, x: 96, lift: 2 },
    { rows: hill(36, 6, "S", "s"), x: 150, lift: -2 },
    { rows: S.palm, x: 160, lift: 2 },
  ]),
  lake: scene(sea(), [
    { rows: S.cloud, x: 70, y: 4 },
    { rows: mountain(22), x: 20, lift: 0 },
    { rows: mountain(16), x: 70, lift: 0 },
    { rows: mountain(26), x: 110, lift: 0 },
    { rows: hill(100, 8, "G", "g"), x: -10, lift: -2 },
    { rows: S.pine, x: 6, lift: 4 },
    { rows: S.pineSmall, x: 24, lift: 6 },
    { rows: S.pine, x: 44, lift: 5 },
    { rows: S.pineSmall, x: 66, lift: 3 },
    { rows: hill(50, 6, "G", "g"), x: 150, lift: -2 },
    { rows: S.pine, x: 164, lift: 3 },
  ]),
  river: scene(grass(), [
    { rows: S.cloudSmall, x: 140, y: 6 },
    { rows: S.birds, x: 40, y: 10 },
    { rows: mountain(16), x: 100 },
    { rows: hill(80, 10, "G", "g"), x: 20 },
    { rows: S.roundTree, x: 4 },
    { rows: S.pine, x: 32 },
    { rows: S.roundTree, x: 130 },
    { rows: S.pine, x: 160 },
    { rows: S.elk, x: 60 },
    { rows: water(TILE_W, 4), x: 0, lift: -5 },
    { rows: S.reeds, x: 90, lift: -2 },
    { rows: S.reeds, x: 176, lift: -2 },
  ]),
  cave: scene(rock(), [
    { rows: S.cloud, x: 100, y: 5 },
    { rows: hill(90, 18, "R", "r"), x: 10 },
    { rows: hill(70, 14, "R", "r"), x: 120 },
    { rows: S.cave, x: 40 },
    { rows: S.pineSmall, x: 8 },
    { rows: S.pine, x: 98 },
    { rows: S.pineSmall, x: 150 },
    { rows: S.grass, x: 28 },
    { rows: S.grass, x: 170 },
  ]),
  volcano: scene(rock(), [
    { rows: S.cloudSmall, x: 20, y: 8 },
    { rows: volcano(24), x: 60 },
    { rows: mesa(6, 8), x: 10 },
    { rows: S.spruce, x: 0 },
    { rows: S.spruce, x: 40 },
    { rows: S.spruce, x: 140 },
    { rows: S.spruce, x: 170 },
    { rows: S.grass, x: 120 },
  ]),
  arctic: scene(snow(), [
    { rows: disc(8, "y"), x: 20, y: 10, sky: true },
    { rows: mountain(28, 10), x: 40 },
    { rows: mountain(20, 8), x: 110 },
    { rows: mountain(14, 6), x: 150 },
    { rows: S.snowSpruce, x: 6 },
    { rows: S.snowSpruce, x: 24 },
    { rows: S.snowSpruce, x: 96 },
    { rows: S.snowSpruce, x: 170 },
    { rows: S.elk, x: 130 },
  ]),
  prairie: scene(grass(), [
    { rows: disc(10, "y"), x: 100, y: 3, sky: true },
    { rows: S.cloud, x: 10, y: 6 },
    { rows: S.cloudSmall, x: 150, y: 12 },
    { rows: hill(140, 6, "G", "g"), x: 60 },
    { rows: S.roundTree, x: 40 },
    { rows: S.grass, x: 6 },
    { rows: S.grass, x: 22 },
    { rows: S.grass, x: 70 },
    { rows: S.grass, x: 110 },
    { rows: S.elk, x: 130 },
    { rows: S.grass, x: 150 },
    { rows: S.grass, x: 180 },
  ]),
  wetland: scene(sea(), [
    { rows: S.cloud, x: 60, y: 5 },
    { rows: S.bird, x: 140, y: 14 },
    { rows: S.cypress, x: 10, lift: -2 },
    { rows: S.cypress, x: 50, lift: -1 },
    { rows: S.reeds, x: 34, lift: -2 },
    { rows: S.reeds, x: 80, lift: -1 },
    { rows: S.cypress, x: 100, lift: -2 },
    { rows: S.reeds, x: 126, lift: -2 },
    { rows: S.cypress, x: 150, lift: -1 },
    { rows: S.reeds, x: 176, lift: -2 },
  ]),
  // Home page: mountains → forest → desert → coast in one 384-wide tile.
  panorama: scene(
    [], // ground is drawn as items because it changes along the tile
    [
      { rows: band(200, 1, "G"), x: 0, lift: -1 },
      { rows: band(200, TILE_H - GROUND - 1, "g"), x: 0, lift: -(TILE_H - GROUND) },
      { rows: band(100, 1, "S"), x: 200, lift: -1 },
      { rows: band(100, TILE_H - GROUND - 1, "s"), x: 200, lift: -(TILE_H - GROUND) },
      { rows: sea(84), x: 300, lift: -(TILE_H - GROUND) },
      { rows: disc(10, "y"), x: 250, y: 3, sky: true },
      { rows: S.cloud, x: 30, y: 5 },
      { rows: S.cloudSmall, x: 150, y: 9 },
      { rows: S.birds, x: 330, y: 10 },
      { rows: mountain(28), x: -4 },
      { rows: mountain(20), x: 48 },
      { rows: mountain(24), x: 90 },
      { rows: S.pineSmall, x: 6 },
      { rows: S.pine, x: 30 },
      { rows: S.pineSmall, x: 60 },
      { rows: S.pine, x: 84 },
      { rows: S.roundTree, x: 110 },
      { rows: S.pine, x: 134 },
      { rows: S.elk, x: 156 },
      { rows: S.roundTree, x: 170 },
      { rows: mesa(14, 14), x: 214 },
      { rows: S.cactus, x: 200 },
      { rows: S.cactusSmall, x: 256 },
      { rows: S.cactus, x: 270 },
      { rows: mesa(8, 8), x: 286 },
      { rows: hill(40, 8, "S", "s"), x: 296, lift: -2 },
      { rows: S.palm, x: 306, lift: 2 },
      { rows: S.lighthouse, x: 364, lift: 0 },
    ],
    384,
  ),
};

/** A representative sprite for small inline icons. */
export const BIOME_ICON: Record<Biome, Rows> = {
  mountain: mountain(8, 3),
  forest: S.pine,
  desert: S.cactus,
  dunes: hill(14, 7, "S", "s"),
  coast: S.lighthouse,
  tropics: S.palm,
  lake: water(12, 4),
  river: water(12, 4),
  cave: S.cave,
  volcano: volcano(8),
  arctic: S.snowSpruce,
  prairie: S.roundTree,
  wetland: S.cypress,
  panorama: S.pine,
};

/**
 * Decorative biome for a park, guessed from its name and NPS topics. Order
 * matters: specific names first, then topics, then a forest fallback. This
 * only picks artwork; it never feeds any number on the site.
 */
export function biomeFor(p: { name: string; fullName: string; designation: string; topics: string[]; states: string[] }): Biome {
  const n = p.fullName;
  const t = new Set(p.topics);
  const has = (...keys: string[]) => keys.some((k) => t.has(k));
  if (/Cave|Cavern/i.test(n)) return "cave";
  if (/Volcan|Crater|Lava|Capulin|Malpais|Postpile/i.test(n)) return "volcano";
  if (/Dunes|White Sands/i.test(n)) return "dunes";
  if (/Everglades|Cypress|Thicket|Congaree|Timucuan/i.test(n)) return "wetland";
  if (has("Arctic", "Tundra") || /Kobuk|Noatak|Bering|Krusenstern|Gates of the Arctic|Yukon|Aniakchak/i.test(n)) return "arctic";
  if (has("The Tropics", "Coral Reefs")) return "tropics";
  if (/Seashore|Lakeshore|Island|Fjords|Glacier Bay|Cape |Harbor|Point Reyes|Acadia|Olympic|Redwood|Gateway National/i.test(n)) return "coast";
  if (/Lake|Reservoir|Glen Canyon|Amistad|Curecanti|Whiskeytown|Meredith|Mead|Bighorn Canyon/i.test(n)) return "lake";
  if (/River|Riverway|Gorge|Delaware|Gauley|Bluestone|Niobrara|Obed|Ozark|Croix|Chattahoochee/i.test(n)) return "river";
  if (/Canyon|Arches|Badlands|Petrified|Saguaro|Pipe Cactus|Joshua|Death Valley|Mojave|Big Bend|Guadalupe|Capitol Reef|Zion|Bryce|Bridge|Hovenweep|Chiricahua|Colorado National|Scotts Bluff|Fossil|Castle Mountains|Cedar Breaks|Walnut|Bandelier|Gila|Mesa Verde|Pinnacles|Devils Tower/i.test(n)) return "desert";
  if (/Prairie|Grassland|Tallgrass|Theodore Roosevelt|Wind Cave|Agate/i.test(n)) return "prairie";
  if (/Great Basin|Rocky Mountain|Glacier National|Rainier|Cascades|Teton|Denali|Lassen|Wrangell|Shenandoah|Great Smoky|Guadalupe|Katahdin/i.test(n)) return "mountain";
  if (has("Mountains", "Glaciers", "Waterfalls")) return "mountain";
  if (has("Wetlands", "Swamps", "Marshes", "Estuaries and Mangroves")) return "wetland";
  if (has("Canyons and Canyonlands", "Plateaus and Mesas", "Buttes", "Arches")) return "desert";
  if (has("Prairies", "Grasslands")) return "prairie";
  if (has("Oceans", "Coasts, Islands and Atolls")) return "coast";
  if (has("Lakes")) return "lake";
  if (has("River and Riparian")) return "river";
  return "forest";
}
