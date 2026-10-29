// Holt die Welt-Stats per FTP vom G-Portal-Server und schreibt stats.json für die Website.
// Läuft automatisch über GitHub Actions (siehe .github/workflows/stats.yml).
import { Client } from "basic-ftp";
import { Writable } from "node:stream";
import { writeFileSync, readFileSync } from "node:fs";

const {
  FTP_HOST, FTP_USER, FTP_PASS,
  FTP_PORT = "21",
  FTP_SECURE = "false",          // "true", falls G-Portal FTPS verlangt
  WORLD_NAME = "world"           // Name des Welt-Ordners (level-name in server.properties)
} = process.env;

if (!FTP_HOST || !FTP_USER || !FTP_PASS) {
  console.error("FTP_HOST, FTP_USER und FTP_PASS fehlen (GitHub → Settings → Secrets).");
  process.exit(1);
}

async function readText(client, path) {
  const chunks = [];
  const sink = new Writable({ write(c, _e, cb) { chunks.push(c); cb(); } });
  await client.downloadTo(sink, path);
  return Buffer.concat(chunks).toString("utf8");
}

// Sucht den Server-Ordner, in dem <world>/stats liegt (G-Portal legt ihn je nach Server unterschiedlich ab)
async function findRoot(client) {
  const candidates = ["", "minecraft", "server", "home", "data"];
  for (const base of candidates) {
    try {
      const list = await client.list(base ? `/${base}/${WORLD_NAME}` : `/${WORLD_NAME}`);
      if (list.some(f => f.name === "stats")) return base ? `/${base}` : "";
    } catch {}
  }
  throw new Error(`Ordner ${WORLD_NAME}/stats nicht gefunden. Prüfe WORLD_NAME oder den FTP-Zugang.`);
}

const UUID = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.json$/i;

function extract(uuid, name, s) {
  const c = s["minecraft:custom"] || {}, mined = s["minecraft:mined"] || {}, killed = s["minecraft:killed"] || {};
  const C = k => c["minecraft:" + k] || 0;
  const M = (...ks) => ks.reduce((a, k) => a + (mined["minecraft:" + k] || 0), 0);
  const K = k => killed["minecraft:" + k] || 0;
  const total = o => Object.values(o || {}).reduce((a, v) => a + v, 0);
  const logs = Object.entries(mined).filter(([k]) => /_(log|stem)$/.test(k)).reduce((a, [, v]) => a + v, 0);
  const dist = ["walk","sprint","crouch","swim","walk_on_water","walk_under_water","fly","aviate","boat","horse","minecart","climb","fall","strider","pig","happy_ghast"]
    .reduce((a, k) => a + C(k + "_one_cm"), 0);
  return {
    uuid, name,
    play: C("play_time") || C("play_one_minute"),
    alive: C("time_since_death"), joins: C("leave_game"), sleep: C("sleep_in_bed"),
    chests: C("open_chest"), crafted: total(s["minecraft:crafted"]), eaten: C("eat_cake_slice"),
    deaths: C("deaths"), mobs: C("mob_kills"), pvp: C("player_kills"),
    dealt: C("damage_dealt"), taken: C("damage_taken"),
    creeper: K("creeper"), zombie: K("zombie") + K("zombie_villager") + K("husk") + K("drowned"),
    enderman: K("enderman"), dragon: K("ender_dragon"), wither: K("wither"),
    mined: total(mined),
    diamond: M("diamond_ore", "deepslate_diamond_ore"), debris: M("ancient_debris"),
    iron: M("iron_ore", "deepslate_iron_ore"), gold: M("gold_ore", "deepslate_gold_ore", "nether_gold_ore"),
    coal: M("coal_ore", "deepslate_coal_ore"), logs,
    dist, walk: C("walk_one_cm") + C("sprint_one_cm"), elytra: C("aviate_one_cm"), boat: C("boat_one_cm"),
    jumps: C("jump"), fish: C("fish_caught"), bred: C("animals_bred"),
    trades: C("traded_with_villager"), enchant: C("enchant_item")
  };
}

const client = new Client(30000);
try {
  await client.access({ host: FTP_HOST, port: Number(FTP_PORT || 21), user: FTP_USER, password: FTP_PASS, secure: FTP_SECURE === "true" });
  const root = await findRoot(client);
  console.log("Server-Ordner:", root || "/");

  const names = {};
  try {
    JSON.parse(await readText(client, `${root}/usercache.json`)).forEach(e => { names[e.uuid.toLowerCase()] = e.name; });
  } catch { console.warn("usercache.json nicht gefunden – Namen fehlen evtl."); }

  const files = (await client.list(`${root}/${WORLD_NAME}/stats`)).filter(f => UUID.test(f.name));
  const players = [];
  for (const f of files) {
    const uuid = f.name.match(UUID)[1].toLowerCase();
    try {
      const data = JSON.parse(await readText(client, `${root}/${WORLD_NAME}/stats/${f.name}`));
      players.push(extract(uuid, names[uuid] || uuid.slice(0, 8), data.stats || {}));
    } catch (e) { console.warn("Übersprungen:", f.name, e.message); }
  }
  players.sort((a, b) => a.uuid.localeCompare(b.uuid));
  let old = null;
  try { old = JSON.parse(readFileSync("stats.json", "utf8")); } catch {}
  if (old && JSON.stringify(old.players) === JSON.stringify(players)) {
    console.log("Keine Änderungen seit dem letzten Lauf.");
  } else {
    writeFileSync("stats.json", JSON.stringify({ updated: new Date().toISOString(), players }, null, 2));
    console.log(`stats.json geschrieben: ${players.length} Spieler.`);
  }
} finally {
  client.close();
}
