// Holt alle Daten per FTP vom G-Portal-Server und schreibt stats.json für die Website:
// Stats, Spielerdaten (Inventar, XP, Standort), Welt-Info, Server-Logs (Chat, Tode, Join/Leave),
// Wochen-Challenges und das Staffel-Archiv.
// Läuft automatisch über GitHub Actions (siehe .github/workflows/stats.yml).
import { Client } from "basic-ftp";
import { Writable } from "node:stream";
import { writeFileSync, readFileSync } from "node:fs";
import zlib from "node:zlib";
import { readNbt, findKey, num } from "./mc-lib.mjs";

const {
  FTP_HOST, FTP_USER, FTP_PASS,
  FTP_PORT = "21",
  FTP_SECURE = "false",
  WORLD_NAME = "world",
  SHOW_CHAT = "true"             // "false", wenn der Chat nicht auf der Website stehen soll
} = process.env;

if (!FTP_HOST || !FTP_USER || !FTP_PASS) {
  console.error("FTP_HOST, FTP_USER und FTP_PASS fehlen (GitHub → Settings → Secrets).");
  process.exit(1);
}

/* ---------- FTP-Helfer ---------- */
async function readBuf(client, path) {
  const chunks = [];
  const sink = new Writable({ write(c, _e, cb) { chunks.push(c); cb(); } });
  await client.downloadTo(sink, path);
  return Buffer.concat(chunks);
}
const readText = async (c, p) => (await readBuf(c, p)).toString("utf8");
async function tryList(client, path) { try { return await client.list(path); } catch { return null; } }

const SKIP_DIRS = new Set(["mods","config","logs","libraries","versions","crash-reports","region","entities","poi","playerdata","advancements","datapacks","data","DIM-1","DIM1","dimensions","cache",".fabric","resourcepacks","backups","players","stats"]);
async function findWorld(client) {
  const start = (await client.pwd()).replace(/\/$/, "");
  const seen = [];
  let queue = [start || ""];
  for (let depth = 0; depth <= 4 && queue.length; depth++) {
    const next = [], found = [];
    for (const dir of queue) {
      const list = await tryList(client, dir || "/");
      if (!list) continue;
      if (depth <= 1) seen.push(`${dir || "/"}: ${list.map(f => f.name).join(", ")}`);
      if (list.some(f => f.name === "level.dat")) found.push(dir);
      for (const f of list) if (f.isDirectory && !SKIP_DIRS.has(f.name) && !f.name.startsWith(".")) next.push(`${dir}/${f.name}`);
    }
    if (found.length) {
      const world = found.find(d => d.endsWith("/" + WORLD_NAME)) || found[0];
      return { world, root: world.slice(0, world.lastIndexOf("/")) };
    }
    queue = next;
  }
  console.log("Gefundene Ordner:\n" + seen.join("\n"));
  throw new Error("Welt-Ordner mit level.dat nicht gefunden.");
}
async function firstDir(client, dirs) {
  for (const d of dirs) { const l = await tryList(client, d); if (l && l.length) return { dir: d, list: l }; }
  return null;
}

/* ---------- Stats ---------- */
const UUID = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(json|dat)$/i;

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
    trades: C("traded_with_villager"), enchant: C("enchant_item"),
    horse: C("horse_one_cm"), pig: C("pig_one_cm"), strider: C("strider_one_cm"), ghast: C("happy_ghast_one_cm"),
    animalKills: ["cow","pig","sheep","chicken","rabbit","mooshroom","goat"].reduce((a, k) => a + K(k), 0),
    leads: (s["minecraft:used"] || {})["minecraft:lead"] || 0, sheared: (s["minecraft:used"] || {})["minecraft:shears"] || 0,
    eggs: (s["minecraft:used"] || {})["minecraft:egg"] || 0, bones: (s["minecraft:used"] || {})["minecraft:bone_meal"] || 0,
    killedBy: Object.entries(s["minecraft:killed_by"] || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => [k.replace(/^minecraft:/, ""), v])
  };
}

/* ---------- Spielerdaten (Inventar, XP, Standort) ---------- */
const item = it => it && it.id ? {
  s: it.Slot ?? null,
  id: String(it.id).replace(/^minecraft:/, ""),
  n: it.count ?? it.Count ?? 1,
  e: !!(it.components?.["minecraft:enchantments"] || it.components?.["minecraft:stored_enchantments"] || it.tag?.Enchantments) || undefined
} : null;

function profile(nbt) {
  const inv = (nbt.Inventory || []).map(item).filter(Boolean);
  const eq = nbt.equipment || {};
  const eqSlots = { feet: 100, legs: 101, chest: 102, head: 103, offhand: -106 };
  for (const [k, slot] of Object.entries(eqSlots)) { const it = item(eq[k]); if (it) { it.s = slot; inv.push(it); } }
  const pos = nbt.Pos ? nbt.Pos.map(v => Math.round(num(v))) : null;
  return {
    xp: nbt.XpLevel ?? 0, xpP: Math.round((nbt.XpP ?? 0) * 100) / 100,
    health: Math.round((nbt.Health ?? 0) * 10) / 10, food: nbt.foodLevel ?? null,
    dim: String(nbt.Dimension ?? "minecraft:overworld").replace(/^minecraft:/, ""),
    pos, mode: nbt.playerGameType ?? null,
    inv, ender: (nbt.EnderItems || []).map(item).filter(Boolean)
  };
}

/* ---------- Welt-Info ---------- */
const DIFF = { 0: "Friedlich", 1: "Einfach", 2: "Normal", 3: "Schwer", peaceful: "Friedlich", easy: "Einfach", normal: "Normal", hard: "Schwer" };
function worldInfo(sources) {
  const get = keys => { for (const s of sources) { const v = findKey(s, keys); if (v !== undefined) return v; } };
  let diff = get(["Difficulty", "difficulty"]);
  if (diff && typeof diff === "object") diff = findKey(diff, ["difficulty", "value"]);
  let spawn = null;
  const sx = get(["SpawnX"]);
  if (sx !== undefined) spawn = [sx, get(["SpawnY"]), get(["SpawnZ"])].map(num);
  else { const sp = get(["spawn", "respawn"]); const p = sp && (sp.pos || sp.Pos); if (Array.isArray(p)) spawn = p.map(num); }
  const dayTime = num(get(["DayTime", "day_time"]) ?? get(["Time", "game_time"]) ?? 0);
  const version = get(["Version"]);
  return {
    name: get(["LevelName"]) ?? null,
    day: Math.floor(dayTime / 24000) + 1,
    time: ((dayTime % 24000) + 24000) % 24000,
    raining: !!get(["raining"]), thundering: !!get(["thundering"]),
    difficulty: DIFF[diff] ?? (diff != null ? String(diff) : null),
    hardcore: !!get(["hardcore"]),
    spawn,
    version: (version && version.Name) || null
  };
}

/* ---------- Server-Logs ---------- */
// Erkennt viele Log-Formate, z. B.
// [21:20:01] [Server thread/INFO]: Text
// [21:20:01] [Server thread/INFO] (Minecraft) Text
// [29Oct2026 21:20:01.123] [Server thread/INFO] [net.minecraft.server.MinecraftServer/]: Text
// [21:20:01 INFO]: Text      ·      2026-10-29 21:20:01 [INFO] Text
function splitLine(line) {
  const tm = line.slice(0, 48).match(/(\d{1,2}):(\d{2}):(\d{2})/);
  if (!tm) return null;
  const hms = `${tm[1].padStart(2, "0")}:${tm[2]}:${tm[3]}`;
  const rest = line.slice(tm.index + tm[0].length);
  let msg = null;
  const a = rest.match(/^[^\n]*?\]:\s(.*)$/);              // ...]: Text
  const b = rest.match(/^[^\n]*?\]\s\([^)]*\)\s(.*)$/);   // ...] (Minecraft) Text
  const c = rest.match(/^[^\n]*?\[(?:INFO|WARN)\]:?\s(.*)$/);
  if (b && (!a || b[1].length > a[1].length)) msg = b[1]; else if (a) msg = a[1]; else if (c) msg = c[1];
  if (msg == null) return null;
  msg = msg.replace(/\u001b\[[0-9;]*m/g, "").replace(/§./g, "").trim();
  // Ab 26.x: "System chat: …", "Player chat: …", "Chat: …" vorne abschneiden
  msg = msg.replace(/^(?:\[[^\]]*\]\s*)?(?:System chat|Player chat|Chat|Game chat|Server chat):\s*/i, "");
  return { hms, msg };
}
const NAME = "[A-Za-z0-9_]{2,16}";
const addDays = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

function parseLog(text, names, { start, end }) {
  const rows = [];
  let wraps = 0, prev = "";
  for (const line of text.split(/\r?\n/)) {
    const m = splitLine(line);
    if (!m) continue;
    if (prev && m.hms < prev) wraps++;
    prev = m.hms;
    rows.push([wraps, m.hms, m.msg]);
  }
  const day0 = start || addDays(end, -wraps);
  const ev = [];
  for (const [w, hms, msg] of rows) {
    const t = `${addDays(day0, w)} ${hms}`;
    let m;
    if ((m = msg.match(new RegExp(`^(?:\\[Not Secure\\] )?<(${NAME})> (.*)$`)))) ev.push([t, "c", m[1], m[2].slice(0, 300)]);
    else if ((m = msg.match(/^\[Server\] (.*)$/))) ev.push([t, "c", "Server", m[1].slice(0, 300)]);
    else if ((m = msg.match(new RegExp(`^(${NAME}) joined the game`)))) ev.push([t, "j", m[1]]);
    else if ((m = msg.match(new RegExp(`^(${NAME}) left the game`)))) ev.push([t, "l", m[1]]);
    else if (/^Stopping (the )?server/.test(msg)) ev.push([t, "s"]);
    else if (/^Starting minecraft server version/.test(msg)) ev.push([t, "b"]);
    else {
      const sp = msg.indexOf(" ");
      const who = msg.slice(0, sp);
      const rest = msg.slice(sp + 1);
      if (sp > 0 && names.has(who) && /^(was |were |died|drowned|blew up|hit the ground|fell |experienced|burned|went up|walked into|tried to swim|discovered the floor|starved|suffocated|froze|withered|didn't want|left the confines)/.test(rest) && !/^was (kicked|banned)/.test(rest))
        ev.push([t, "d", who, rest.slice(0, 200)]);
    }
  }
  return ev;
}

/* ---------- Wochen-Challenges ---------- */
const POOL = [
  ["fish", 10, "Fange 10 Fische"], ["bred", 15, "Züchte 15 Tiere"], ["diamond", 10, "Baue 10 Diamanterz ab"],
  ["debris", 4, "Finde 4 Antiken Schutt"], ["iron", 64, "Baue 64 Eisenerz ab"], ["coal", 128, "Baue 128 Kohleerz ab"],
  ["logs", 256, "Fälle 256 Holzstämme"], ["mined", 5000, "Baue 5.000 Blöcke ab"], ["mobs", 100, "Töte 100 Mobs"],
  ["creeper", 15, "Töte 15 Creeper"], ["zombie", 30, "Töte 30 Zombies"], ["enderman", 10, "Töte 10 Endermen"],
  ["trades", 20, "Handle 20-mal mit Dorfbewohnern"], ["enchant", 5, "Verzaubere 5 Items"], ["crafted", 500, "Stelle 500 Items her"],
  ["sleep", 5, "Schlafe 5-mal im Bett"], ["jumps", 1000, "Springe 1.000-mal"], ["walk", 1000000, "Laufe 10 km"],
  ["elytra", 500000, "Fliege 5 km mit Elytra"], ["boat", 200000, "Fahre 2 km Boot"], ["play", 360000, "Spiele 5 Stunden"],
  ["chests", 100, "Öffne 100 Truhen"], ["eaten", 7, "Iss einen ganzen Kuchen"], ["gold", 32, "Baue 32 Golderz ab"],
  ["alive", 216000, "Überlebe 3 Stunden am Stück", true]
];
function berlinDate(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
function isoWeek(dateStr) {
  const d = new Date(dateStr + "T12:00:00Z");
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const y = d.getUTCFullYear();
  const w = 1 + Math.round(((d - new Date(Date.UTC(y, 0, 4))) / 86400000 - 3 + ((new Date(Date.UTC(y, 0, 4)).getUTCDay() + 6) % 7)) / 7);
  return `${y}-W${String(w).padStart(2, "0")}`;
}
function pickChallenges(weekId) {
  let seed = [...weekId].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rnd = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296;
  const pool = [...POOL];
  const out = [];
  while (out.length < 9 && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out.map(([key, target, text, abs]) => ({ key, target, text, abs: !!abs || undefined }));
}

/* ---------- Hauptprogramm ---------- */
let old = null;
try { old = JSON.parse(readFileSync("stats.json", "utf8")); } catch {}

const client = new Client(60000);
try {
  await client.access({ host: FTP_HOST, port: Number(FTP_PORT || 21), user: FTP_USER, password: FTP_PASS, secure: FTP_SECURE === "true" });
  const { root, world } = await findWorld(client);
  console.log("Welt gefunden:", world);

  // Namen
  const names = {};
  try { JSON.parse(await readText(client, `${root}/usercache.json`)).forEach(e => { names[e.uuid.toLowerCase()] = e.name; }); }
  catch { console.warn("usercache.json nicht gefunden – Namen fehlen evtl."); }
  const nameSet = new Set(Object.values(names));

  // Stats
  const players = [];
  const st = await firstDir(client, [`${world}/players/stats`, `${world}/stats`]);
  if (!st) throw new Error("Kein Stats-Ordner gefunden. Ist schon jemand auf dem Server gewesen?");
  for (const f of st.list.filter(f => UUID.test(f.name))) {
    const uuid = f.name.match(UUID)[1].toLowerCase();
    try { players.push(extract(uuid, names[uuid] || uuid.slice(0, 8), JSON.parse(await readText(client, `${st.dir}/${f.name}`)).stats || {})); }
    catch (e) { console.warn("Stats übersprungen:", f.name, e.message); }
  }
  players.sort((a, b) => a.uuid.localeCompare(b.uuid));
  console.log(`Stats: ${players.length} Spieler`);

  // Spielerdaten
  const profiles = {};
  const pd = await firstDir(client, [`${world}/players/data`, `${world}/playerdata`]);
  for (const f of (pd?.list || []).filter(f => UUID.test(f.name) && f.name.endsWith(".dat"))) {
    const uuid = f.name.match(UUID)[1].toLowerCase();
    try { profiles[uuid] = profile(readNbt(await readBuf(client, `${pd.dir}/${f.name}`))); }
    catch (e) { console.warn("Spielerdaten übersprungen:", f.name, e.message); }
  }
  console.log(`Spielerdaten: ${Object.keys(profiles).length}`);

  // Welt-Info: level.dat plus kleine Dateien aus data/minecraft (ab 26.1 liegen dort Teile davon)
  const sources = [];
  try { sources.push(readNbt(await readBuf(client, `${world}/level.dat`))); } catch (e) { console.warn("level.dat:", e.message); }
  for (const dir of [`${world}/data/minecraft`, `${world}/data`]) {
    for (const f of (await tryList(client, dir)) || []) {
      if (f.isFile && f.name.endsWith(".dat") && f.size < 65536 && !/^(map_|raids|scoreboard|idcounts|chunks|random_sequences|command_storage)/.test(f.name)) {
        try { sources.push(readNbt(await readBuf(client, `${dir}/${f.name}`))); } catch {}
      }
    }
  }
  const worldData = worldInfo(sources);
  console.log("Welt:", JSON.stringify(worldData));

  // Logs
  const PARSER = 2;   // bei Änderungen am Log-Lesen erhöhen: dann werden alle Logs neu eingelesen
  const log = (old?.log && old.log.parser === PARSER) ? { ...old.log } : { parser: PARSER, processed: [], archive: [], current: [] };
  const logs = (await tryList(client, `${root}/logs`)) || [];
  console.log("Log-Dateien:", logs.map(f => f.name).slice(-10).join(", ") || "keine gefunden in " + root + "/logs");
  console.log("Bekannte Spieler:", [...nameSet].join(", ") || "keine (usercache.json fehlt?)");
  const gz = logs.filter(f => /^\d{4}-\d{2}-\d{2}-\d+\.log\.gz$/.test(f.name) && !log.processed.includes(f.name))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
  for (const f of gz) {
    try {
      const text = zlib.gunzipSync(await readBuf(client, `${root}/logs/${f.name}`)).toString("utf8");
      log.archive.push(...parseLog(text, nameSet, { start: f.name.slice(0, 10) }));
      log.processed.push(f.name);
    } catch (e) { console.warn("Log übersprungen:", f.name, e.message); }
  }
  if (logs.some(f => f.name === "latest.log")) {
    let end = berlinDate();
    try { end = berlinDate(await client.lastMod(`${root}/logs/latest.log`)); } catch {}
    const latest = await readText(client, `${root}/logs/latest.log`);
    log.current = parseLog(latest, nameSet, { end });
    const sample = latest.split(/\r?\n/).filter(l => /joined the game|left the game|<|was |fell |drowned|died/.test(l)).slice(-5);
    console.log("Beispielzeilen aus latest.log:\n" + (sample.length ? sample.join("\n") : latest.split(/\r?\n/).slice(0, 5).join("\n")));
    console.log("Erkannt in latest.log:", ["j","l","c","d"].map(t => `${t}=${log.current.filter(e => e[1] === t).length}`).join(" "));
  }
  if (SHOW_CHAT !== "true") { log.archive = log.archive.filter(e => e[1] !== "c"); log.current = log.current.filter(e => e[1] !== "c"); }
  // Begrenzen: Tode komplett (max. 3000), Chat die letzten 500, Join/Leave die letzten 4000
  log.archive.sort((a, b) => a[0].localeCompare(b[0]));
  const keep = (type, n) => log.archive.filter(e => type.includes(e[1])).slice(-n);
  log.archive = [...keep("d", 3000), ...keep("c", 500), ...keep("jlsb", 4000)].sort((a, b) => a[0].localeCompare(b[0]));
  log.processed = log.processed.slice(-400);
  console.log(`Logs: ${gz.length} neue Archiv-Dateien, ${log.archive.length + log.current.length} Ereignisse`);

  // Staffel-Archiv: Fällt die gesamte Spielzeit stark ab, wurde eine neue Welt gestartet
  const now = new Date().toISOString();
  let season = old?.season || { n: 1, from: now };
  const seasons = old?.seasons || [];
  const totalPlay = ps => (ps || []).reduce((a, p) => a + (p.play || 0), 0);
  const prevTotal = totalPlay(old?.players), curTotal = totalPlay(players);
  let week = old?.week;
  if (prevTotal > 144000 && curTotal < prevTotal * 0.5) {
    console.log("Neue Welt erkannt – alte Staffel wird archiviert.");
    seasons.push({ n: season.n, name: `Staffel ${season.n}`, from: season.from, to: now, world: old.world || null, players: old.players });
    season = { n: season.n + 1, from: now };
    week = null;
  }

  // Wochen-Challenges
  const weekId = isoWeek(berlinDate());
  if (!week || week.id !== weekId) week = { id: weekId, base: {} };
  const challenges = pickChallenges(weekId);
  // Basiswerte zum Wochenanfang (für Challenges und „Spieler der Woche“)
  const weekKeys = [...new Set([...challenges.map(c => c.key), "play", "deaths", "mined", "mobs", "diamond", "dist"])];
  for (const p of players) {
    week.base[p.uuid] ||= {};
    for (const k of weekKeys) if (!(k in week.base[p.uuid])) week.base[p.uuid][k] = p[k] || 0;
  }

  // Advancements (Fortschritte): erledigte Fortschritte mit Datum
  const adv = {};
  const ad = await firstDir(client, [`${world}/players/advancements`, `${world}/advancements`]);
  for (const f of (ad?.list || []).filter(f => UUID.test(f.name) && f.name.endsWith(".json"))) {
    const uuid = f.name.match(UUID)[1].toLowerCase();
    try {
      const data = JSON.parse(await readText(client, `${ad.dir}/${f.name}`));
      adv[uuid] = Object.entries(data)
        .filter(([k, v]) => v && v.done && !k.includes(":recipes/") && k !== "DataVersion")
        .map(([k, v]) => [k.replace(/^minecraft:/, ""), Object.values(v.criteria || {}).sort().pop()?.slice(0, 19) || null])
        .sort((a, b) => String(a[1]).localeCompare(String(b[1])));
    } catch (e) { console.warn("Advancements übersprungen:", f.name, e.message); }
  }
  console.log(`Advancements: ${Object.keys(adv).length} Spieler`);

  // Deutsche Namen der Fortschritte aus der offiziellen Sprachdatei von Mojang (nur wenn nötig neu laden)
  let advNames = old?.advNames || null;
  const wantVer = worldData.version || null;
  if (!advNames || advNames._v !== wantVer || !advNames._ent || !advNames._item) {
    try {
      const j = async u => { const r = await fetch(u); if (!r.ok) throw new Error(r.status + " " + u); return r.json(); };
      const man = await j("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json");
      const ver = man.versions.find(v => v.id === wantVer) || man.versions.find(v => v.id === man.latest.release);
      const vj = await j(ver.url);
      const idx = await j(vj.assetIndex.url);
      const hash = idx.objects["minecraft/lang/de_de.json"].hash;
      const de = await j(`https://resources.download.minecraft.net/${hash.slice(0, 2)}/${hash}`);
      advNames = { _v: wantVer, _ent: {}, _item: {} };
      for (const [k, v] of Object.entries(de)) { const m = k.match(/^(?:item|block)\.minecraft\.([a-z0-9_]+)$/); if (m && !advNames._item[m[1]]) advNames._item[m[1]] = v; }
      for (const [k, v] of Object.entries(de)) { const m = k.match(/^entity\.minecraft\.([a-z0-9_]+)$/); if (m) advNames._ent[m[1]] = v; }
      for (const [k, v] of Object.entries(de)) {
        const m = k.match(/^advancements\.([a-z_]+)\.([a-z0-9_.]+)\.(title|description)$/);
        if (!m) continue;
        const id = `${m[1]}/${m[2].replace(/\./g, "/")}`;
        (advNames[id] ||= {})[m[3] === "title" ? "t" : "d"] = v;
      }
      console.log(`Deutsche Fortschritt-Namen geladen (${ver.id}): ${Object.keys(advNames).length - 3}, Items: ${Object.keys(advNames._item).length}`);
    } catch (e) { console.warn("Deutsche Fortschritt-Namen nicht geladen:", e.message); }
  }

  // Tages-Historie für Diagramme und Wrapped: ein Schnappschuss pro Tag (zuletzt gespeicherter Stand des Tages)
  const HKEYS = ["play", "deaths", "mined", "mobs", "dist", "diamond", "fish", "jumps", "crafted", "bred", "debris", "pvp"];
  const history = { ...(old?.history || {}) };
  history[berlinDate()] = Object.fromEntries(players.map(p => [p.uuid, HKEYS.map(k => p[k] || 0)]));
  const hDays = Object.keys(history).sort();
  for (const d of hDays.slice(0, Math.max(0, hDays.length - 400))) delete history[d];

  // Aktuelle Skins direkt von Mojang (pro Spieler höchstens alle 20 Minuten neu abfragen)
  const skins = { ...(old?.skins || {}) };
  for (const p of players) {
    const prev = skins[p.uuid];
    if (prev && Date.now() - new Date(prev.at) < 20 * 60 * 1000) continue;
    try {
      const r = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${p.uuid.replace(/-/g, "")}`);
      if (!r.ok) throw new Error(String(r.status));
      const prof = await r.json();
      const tex = JSON.parse(Buffer.from(prof.properties.find(x => x.name === "textures").value, "base64").toString("utf8"));
      const url = tex.textures?.SKIN?.url || null;
      skins[p.uuid] = { tex: url ? url.split("/").pop() : null, slim: tex.textures?.SKIN?.metadata?.model === "slim" || undefined, name: prof.name, at: new Date().toISOString() };
    } catch (e) { console.warn("Skin nicht geladen:", p.name, e.message); }
  }

  // Mod-Liste
  const mods = ((await tryList(client, `${root}/mods`)) || []).filter(f => f.isFile && f.name.endsWith(".jar")).map(f => f.name).sort();

  const out = { players, profiles, world: worldData, log, season, seasons, week, challenges, adv, advNames, mods, skins, history, hkeys: HKEYS };
  const strip = o => JSON.stringify(o, (k, v) => k === "at" ? undefined : v);
  if (old && strip({ ...old, updated: undefined }) === strip({ ...out, updated: undefined })) {
    console.log("Keine Änderungen seit dem letzten Lauf.");
  } else {
    writeFileSync("stats.json", JSON.stringify({ updated: now, ...out }));
    console.log("stats.json geschrieben.");
  }
} finally {
  client.close();
}
