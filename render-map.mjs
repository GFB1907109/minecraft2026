// Rendert die Overworld aus dem Welt-Backup als Karte von oben (eine 512×512-Kachel pro Region).
// Aufruf: node render-map.mjs <Ordner mit der Welt> [Ausgabeordner]
// Läuft automatisch über GitHub Actions (siehe .github/workflows/welt.yml).
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { readNbt, readRegion, packed, encodePng, findKey, num } from "./mc-lib.mjs";

const [, , input = "download", outDir = "map"] = process.argv;

// Welt-Ordner (mit level.dat) im Eingabeordner suchen
function findWorld(dir, depth = 3) {
  if (existsSync(join(dir, "level.dat"))) return dir;
  if (depth === 0) return null;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { const r = findWorld(p, depth - 1); if (r) return r; }
  }
  return null;
}
const world = findWorld(input);
if (!world) { console.error("Keine Welt gefunden in", input); process.exit(1); }
const regionDir = [join(world, "dimensions/minecraft/overworld/region"), join(world, "region")].find(existsSync);
if (!regionDir) { console.error("Kein Region-Ordner gefunden."); process.exit(1); }
console.log("Rendere", regionDir);

/* ---------- Farben ---------- */
const C = {
  grass_block: [109, 153, 48], short_grass: [109, 153, 48], tall_grass: [109, 153, 48], fern: [96, 140, 45], large_fern: [96, 140, 45],
  dirt: [134, 96, 67], coarse_dirt: [119, 85, 59], rooted_dirt: [144, 103, 76], podzol: [91, 63, 24], mycelium: [111, 99, 105], dirt_path: [148, 121, 65], farmland: [110, 75, 45], mud: [60, 57, 60],
  stone: [125, 125, 125], cobblestone: [122, 122, 122], mossy_cobblestone: [110, 118, 94], andesite: [136, 136, 137], diorite: [188, 188, 188], granite: [149, 103, 85],
  deepslate: [80, 80, 82], tuff: [108, 109, 102], calcite: [223, 224, 220], gravel: [131, 127, 126], clay: [160, 166, 179], dripstone_block: [134, 107, 92],
  sand: [219, 207, 163], sandstone: [216, 203, 155], red_sand: [190, 102, 33], red_sandstone: [186, 99, 29], terracotta: [152, 94, 67],
  water: [52, 95, 218], ice: [145, 183, 253], packed_ice: [141, 180, 250], blue_ice: [116, 167, 253], snow: [249, 254, 254], snow_block: [249, 254, 254], powder_snow: [248, 253, 253],
  lava: [207, 92, 15], magma_block: [142, 63, 31], obsidian: [15, 10, 24], bedrock: [85, 85, 85],
  oak_leaves: [70, 120, 35], birch_leaves: [102, 140, 60], spruce_leaves: [60, 96, 60], jungle_leaves: [60, 140, 30], acacia_leaves: [90, 130, 30], dark_oak_leaves: [55, 100, 25],
  mangrove_leaves: [70, 120, 40], cherry_leaves: [229, 172, 194], azalea_leaves: [90, 117, 44], flowering_azalea_leaves: [110, 120, 70], pale_oak_leaves: [135, 145, 130],
  oak_log: [109, 85, 50], spruce_log: [58, 37, 16], birch_log: [216, 215, 210], jungle_log: [85, 67, 25], acacia_log: [103, 96, 86], dark_oak_log: [60, 46, 26], cherry_log: [54, 33, 44], mangrove_log: [84, 66, 36],
  oak_planks: [162, 130, 78], spruce_planks: [114, 84, 48], birch_planks: [192, 175, 121], jungle_planks: [160, 115, 80], acacia_planks: [168, 90, 50], dark_oak_planks: [66, 43, 20], cherry_planks: [226, 178, 172],
  moss_block: [89, 109, 45], moss_carpet: [89, 109, 45], lily_pad: [32, 128, 48], kelp: [70, 140, 40], seagrass: [52, 95, 218], tall_seagrass: [52, 95, 218],
  cactus: [85, 127, 43], pumpkin: [198, 118, 24], melon: [111, 145, 30], hay_block: [166, 136, 38], sugar_cane: [148, 192, 101], bamboo: [93, 144, 19],
  netherrack: [97, 38, 38], soul_sand: [81, 62, 50], soul_soil: [75, 57, 46], basalt: [80, 81, 86], blackstone: [42, 36, 41], glowstone: [171, 131, 84], end_stone: [219, 222, 158],
  bricks: [150, 97, 83], stone_bricks: [122, 121, 122], glass: [200, 220, 230], white_wool: [234, 236, 237], black_wool: [21, 21, 26], red_wool: [161, 39, 35], yellow_wool: [249, 198, 40],
  white_concrete: [207, 213, 214], black_concrete: [8, 10, 15], gray_concrete: [55, 58, 62], light_gray_concrete: [125, 125, 115], red_concrete: [142, 33, 33], blue_concrete: [45, 47, 143],
  quartz_block: [235, 229, 222], smooth_stone: [159, 159, 159], iron_block: [220, 220, 220], gold_block: [246, 208, 61], diamond_block: [98, 237, 228], emerald_block: [42, 203, 87],
  torch: [255, 200, 80], lantern: [255, 200, 80], rail: [130, 110, 90], powered_rail: [150, 120, 70]
};
const KEY = [
  [/water|bubble_column/, C.water], [/lava/, C.lava], [/_leaves$/, C.oak_leaves], [/_(log|wood|stem|hyphae)$/, C.oak_log], [/planks|_slab|_stairs|_fence|_door|trapdoor|_sign/, C.oak_planks],
  [/glass/, C.glass], [/snow/, C.snow], [/ice/, C.ice], [/sand/, C.sand], [/terracotta/, C.terracotta], [/deepslate/, C.deepslate], [/brick/, C.bricks],
  [/stone|ore|cobble|andesite|diorite|granite/, C.stone], [/grass|flower|tulip|poppy|dandelion|orchid|allium|bluet|daisy|cornflower|lily|bush|sapling|vine|roots/, C.grass_block],
  [/carpet|wool|concrete|bed$/, C.white_wool], [/nether|crimson|warped/, C.netherrack], [/copper/, [192, 107, 79]], [/gold/, C.gold_block], [/iron/, C.iron_block]
];
const cache = new Map();
function colorOf(name) {
  const n = name.replace(/^minecraft:/, "");
  if (cache.has(n)) return cache.get(n);
  let c = C[n];
  if (!c) for (const [re, col] of KEY) if (re.test(n)) { c = col; break; }
  c = c || [140, 140, 140];
  cache.set(n, c);
  return c;
}
const AIR = /(^|:)(air|cave_air|void_air|light|barrier|structure_void)$/;

/* ---------- Rendern ---------- */
if (existsSync(outDir)) rmSync(outDir, { recursive: true });
mkdirSync(join(outDir, "tiles"), { recursive: true });

function blockAt(sections, y, x, z) {
  const s = sections.get(Math.floor(y / 16));
  if (!s) return null;
  const bs = s.block_states || s.BlockStates;
  const pal = bs?.palette;
  if (!pal || !pal.length) return null;
  if (pal.length === 1 || !bs.data) return pal[0].Name;
  const bits = Math.max(4, Math.ceil(Math.log2(pal.length)));
  return pal[packed(bs.data, bits, ((y & 15) * 256) + z * 16 + x)]?.Name ?? null;
}

const regions = [];
const files = readdirSync(regionDir).filter(f => /^r\.-?\d+\.-?\d+\.mca$/.test(f));
for (const f of files) {
  const [, rx, rz] = f.match(/^r\.(-?\d+)\.(-?\d+)\.mca$/).map(Number);
  const buf = readFileSync(join(regionDir, f));
  if (buf.length < 8192) continue;
  const rgba = Buffer.alloc(512 * 512 * 4);
  const height = new Int16Array(512 * 512).fill(-32768);
  let chunks = 0;
  for (const { cx, cz, nbt } of readRegion(buf)) {
    const c = nbt.Level || nbt;
    const status = String(c.Status || "");
    if (status && !/full|postprocessed|spawn|heightmaps|light/.test(status)) continue;
    const secList = c.sections || c.Sections || [];
    const sections = new Map(secList.map(s => [s.Y, s]));
    const hmAll = c.Heightmaps || {};
    const hm = hmAll.MOTION_BLOCKING || hmAll.WORLD_SURFACE;
    if (!hm || !hm.length) continue;
    const minY = (num(c.yPos ?? -4)) * 16;
    const hbits = Math.floor(64 / Math.ceil(256 / hm.length));
    chunks++;
    for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
      const h = packed(hm, hbits, z * 16 + x);
      if (!h) continue;
      let y = minY + h - 1;
      let name = blockAt(sections, y, x, z);
      while (name && AIR.test(name) && y > minY) { y--; name = blockAt(sections, y, x, z); }
      if (!name) continue;
      let [r, g, b] = colorOf(name);
      if (/water|seagrass|kelp/.test(name)) {
        let d = 0;
        while (d < 12 && /water|seagrass|kelp/.test(blockAt(sections, y - d - 1, x, z) || "")) d++;
        const k = 1 - d * 0.04;
        r *= k; g *= k; b *= k;
      }
      const px = cx * 16 + x, pz = cz * 16 + z, i = pz * 512 + px;
      height[i] = y;
      rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = 255;
    }
  }
  if (!chunks) continue;
  // Schattierung: höher als der nördliche Nachbar = heller, tiefer = dunkler
  for (let z = 1; z < 512; z++) for (let x = 0; x < 512; x++) {
    const i = z * 512 + x, n = i - 512;
    if (height[i] === -32768 || height[n] === -32768) continue;
    const d = height[i] - height[n];
    const k = d > 0 ? 1.12 : d < 0 ? 0.86 : 1;
    if (k !== 1) for (let j = 0; j < 3; j++) rgba[i * 4 + j] = Math.min(255, rgba[i * 4 + j] * k);
  }
  writeFileSync(join(outDir, "tiles", `${rx}.${rz}.png`), encodePng(512, 512, rgba));
  regions.push([rx, rz]);
  console.log(`Region ${rx},${rz}: ${chunks} Chunks`);
}

let spawn = null;
try {
  const lvl = readNbt(readFileSync(join(world, "level.dat")));
  const sx = findKey(lvl, ["SpawnX"]);
  if (sx !== undefined) spawn = [num(sx), num(findKey(lvl, ["SpawnZ"]))];
} catch {}
writeFileSync(join(outDir, "index.json"), JSON.stringify({ generated: new Date().toISOString(), regions, spawn }));
console.log(`Fertig: ${regions.length} Regionen gerendert.`);
