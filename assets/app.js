/* =========================================================
   Minecraft 2026 – gemeinsamer Code für alle Seiten
   ========================================================= */

/* ========= EINSTELLUNGEN ========= */
const CONFIG = {
  name: "Minecraft 2026",
  host: "eu8786670.g-portal.game",
  port: 30985,
  version: "26.3",
  software: "Fabric",
  refreshSeconds: 30,
  github: "GFB1907109/minecraft2026",
  crew: [],         // Spieler, die immer angezeigt werden sollen, z. B. ["Steve","Alex"]
  discord: {
    invite: "https://discord.gg/M5Rr54WRMV",     // Einladungslink
    serverId: "1557866330714017823"    // Server-ID (Discord → Servereinstellungen → Widget)
  }
};
/* ================================== */

// Menü: [Datei, Name, im Hauptmenü?]
const PAGES = [
  ["index.html", "Start", 1], ["spieler.html", "Spieler", 1], ["stats.html", "Stats", 1], ["tode.html", "Tode", 1],
  ["aktivitaet.html", "Aktivität", 1], ["karte.html", "Karte", 1], ["bingo.html", "Bingo", 1], ["events.html", "Events", 1], ["discord.html", "Discord", 1],
  ["galerie.html", "Galerie", 0], ["projekte.html", "Projekte & Orte", 0], ["erfolge.html", "Erfolge", 0], ["archiv.html", "Archiv & Downloads", 0], ["infos.html", "Infos & Regeln", 0]
];

/* ---------- Helfer ---------- */
const $ = id => document.getElementById(id);
const addr = `${CONFIG.host}:${CONFIG.port}`;
const nf = new Intl.NumberFormat("de-DE");
const nf1 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
// Skins über die feste Spieler-ID (Crafatar erneuert Skins schnell), stündlich frisch geladen.
// Ohne bekannte ID (z. B. neuer Spieler) über den Namen bei mc-heads.net.
const skinHour = () => Math.floor(Date.now() / 36e5);
const uuidOf = n => (App.stats?.players || []).find(p => p.name.toLowerCase() === String(n).toLowerCase())?.uuid;
const head = n => { const u = uuidOf(n); return u ? `https://crafatar.com/avatars/${u}?size=64&overlay&v=${skinHour()}` : `https://mc-heads.net/avatar/${encodeURIComponent(n)}/64?v=${skinHour()}`; };
const body = n => { const u = uuidOf(n); return u ? `https://crafatar.com/renders/body/${u}?scale=6&overlay&v=${skinHour()}` : `https://mc-heads.net/body/${encodeURIComponent(n)}/120?v=${skinHour()}`; };
// Fällt Crafatar aus, springt jedes Bild auf mc-heads.net zurück
document.addEventListener("error", e => {
  const img = e.target;
  if (img.tagName !== "IMG" || !img.src.includes("crafatar.com") || img.dataset.fb) return;
  img.dataset.fb = 1;
  const isBody = img.src.includes("/renders/body/");
  const u = img.src.match(/[0-9a-f-]{36}/)?.[0];
  const p = (App.stats?.players || []).find(x => x.uuid === u);
  if (p) img.src = isBody ? `https://mc-heads.net/body/${encodeURIComponent(p.name)}/120` : `https://mc-heads.net/avatar/${encodeURIComponent(p.name)}/64`;
}, true);
const lc = s => String(s).toLowerCase();
const plink = n => `profil.html?name=${encodeURIComponent(n)}`;
const range = (a, b) => Array.from({ length: b - a }, (_, i) => a + i);
const set = (id, html) => { const el = $(id); if (el) el.innerHTML = html; return el; };
const empty = (title, text, full) => `<div class="empty"${full ? ' style="grid-column:1/-1"' : ""}><strong>${title}</strong>${text ? `<span>${text}</span>` : ""}</div>`;

const toDate = t => new Date(t.replace(" ", "T"));
const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const todayStr = () => ymd(new Date());
const yesterdayStr = () => { const d = new Date(); d.setDate(d.getDate()-1); return ymd(d); };
function dayLabel(day){ if (day === todayStr()) return "Heute"; if (day === yesterdayStr()) return "Gestern"; const [y,m,d] = day.split("-"); return `${d}.${m}.${y}`; }
function when(t){ if (!t) return "–"; const l = dayLabel(t.slice(0,10)); return (l === "Heute" || l === "Gestern" ? l.toLowerCase() : l.slice(0,6)) + " " + t.slice(11,16); }
function dur(ms){ const m = Math.round(ms/60000); if (m < 60) return `${m} min`; return `${Math.floor(m/60)} h ${String(m%60).padStart(2,"0")} min`; }
const fmtDate = d => d ? new Date(d).toLocaleDateString("de-DE", { dateStyle: "medium" }) : "?";

/* ---------- Kopf und Fuß ---------- */
function buildChrome(){
  const here = location.pathname.split("/").pop() || "index.html";
  const cur = f => f === here ? ' aria-current="page"' : "";
  const prim = PAGES.filter(p => p[2]), more = PAGES.filter(p => !p[2]);
  const top = $("top");
  if (top) top.innerHTML = `<div class="wrap">
    <a class="brand" href="index.html"><span class="block" aria-hidden="true"></span><span class="t">${esc(CONFIG.name)}</span></a>
    <nav class="main" aria-label="Hauptnavigation">
      ${prim.map(([f, n]) => `<a href="${f}"${cur(f)}>${n}</a>`).join("")}
      <details class="more"><summary${more.some(p => p[0] === here) ? ' class="cur"' : ""}>Mehr ▾</summary><div class="drop">${more.map(([f, n]) => `<a href="${f}"${cur(f)}>${n}</a>`).join("")}</div></details>
    </nav>
    <button class="menu-btn" type="button" id="menuBtn" aria-expanded="false" aria-controls="menuPanel">Menü</button>
    <div class="menu-panel" id="menuPanel">${PAGES.map(([f, n]) => `<a href="${f}"${cur(f)}>${n}</a>`).join("")}</div>
  </div>`;
  $("menuBtn")?.addEventListener("click", () => { const p = $("menuPanel"); const o = p.classList.toggle("open"); $("menuBtn").setAttribute("aria-expanded", o); $("menuBtn").textContent = o ? "Schließen" : "Menü"; });
  document.addEventListener("click", e => { const d = document.querySelector("details.more"); if (d && !d.contains(e.target)) d.open = false; });
  const foot = $("foot");
  if (foot) foot.innerHTML = `<div class="wrap">
    <strong style="font-family:var(--f-display);font-size:1.4rem;letter-spacing:-.02em">${esc(CONFIG.name)}</strong>
    <p>${PAGES.map(([f, n]) => `<a href="${f}" style="text-decoration:none;margin-right:14px">${n}</a>`).join("")}</p>
    <p>Unser privater Minecraft-Server · <code style="background:rgba(0,0,0,.25)">${esc(addr)}</code></p>
    <p>Live-Daten über api.mcsrvstat.us, Skins über crafatar.com und mc-heads.net, Item-Bilder über minecraft.wiki. Kein offizielles Minecraft-Produkt. Nicht von Mojang oder Microsoft genehmigt und nicht mit Mojang oder Microsoft verbunden.</p>
  </div>`;
  document.querySelectorAll(".cfg-addr").forEach(e => e.textContent = addr);
}

/* ---------- Daten ---------- */
const App = { stats: null, events: [], live: { online: false, players: [], count: 0, max: 0, checked: false }, subs: [] };
const onUpdate = fn => { App.subs.push(fn); fn(); };
const emit = () => App.subs.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
const players = () => App.stats?.players || [];
const isOnline = n => (App.live.players || []).some(x => lc(x) === lc(n));
const playerBy = name => players().find(x => lc(x.name) === lc(name));
const profileOf = name => { const p = playerBy(name); return p ? App.stats.profiles?.[p.uuid] : null; };

async function loadStats(){
  try {
    // Zuerst direkt von GitHub (sofort aktuell), sonst die Kopie der Website
    let s = null;
    try {
      const r = await fetch(`https://api.github.com/repos/${CONFIG.github}/contents/stats.json`, { cache: "no-store", headers: { Accept: "application/vnd.github.raw" } });
      if (r.ok) s = await r.json();
    } catch {}
    if (!s) { const r = await fetch("stats.json", { cache: "no-store" }); if (!r.ok) return; s = await r.json(); }
    App.stats = s;
    App.events = s?.log ? [...(s.log.archive || []), ...(s.log.current || [])].sort((a,b) => a[0].localeCompare(b[0])) : [];
    emit();
  } catch {}
}
async function fetchStatus(){
  try {
    const r = await fetch(`https://api.mcsrvstat.us/3/${addr}`, { cache: "no-store" });
    const d = await r.json();
    return { online: !!d.online, count: d.players?.online ?? 0, max: d.players?.max ?? 0,
      players: (d.players?.list || []).map(p => p.name).filter(Boolean), version: d.version || "", motd: (d.motd?.clean || []).join("\n") };
  } catch (e) {}
  const r = await fetch(`https://api.mcstatus.io/v2/status/java/${addr}`, { cache: "no-store" });
  const d = await r.json();
  return { online: !!d.online, count: d.players?.online ?? 0, max: d.players?.max ?? 0,
    players: (d.players?.list || []).map(p => p.name_clean).filter(Boolean), version: d.version?.name_clean || "", motd: d.motd?.clean || "" };
}
async function refreshLive(){
  try { App.live = { ...(await fetchStatus()), checked: true, error: false }; }
  catch { App.live = { online: false, players: [], count: 0, max: 0, checked: true, error: true }; }
  App.live.at = new Date();
  emit();
}
async function loadContent(name, fallback = []){
  try { const r = await fetch(`content/${name}.json`, { cache: "no-store" }); if (r.ok) return await r.json(); } catch {}
  return fallback;
}

/* ---------- Stats-Definitionen ---------- */
const H = v => nf1.format(v / 72000) + " h";
const KM = v => nf1.format(v / 100000) + " km";
const N = v => nf.format(Math.round(v));
const HEARTS = v => nf.format(Math.round(v / 20)) + " ♥";
const STATS = [
  { key:"play",    g:"Allgemein", label:"Spielzeit",          fmt:H,  rec:"Meiste Spielzeit" },
  { key:"alive",   g:"Allgemein", label:"Lebt seit",          fmt:H,  rec:"Am längsten am Leben", hint:"Spielzeit seit dem letzten Tod." },
  { key:"joins",   g:"Allgemein", label:"Server verlassen",   fmt:N,  hint:"So oft hat jemand den Server verlassen – ungefähr die Anzahl der Sessions." },
  { key:"sleep",   g:"Allgemein", label:"Im Bett geschlafen", fmt:N,  rec:"Schlafmütze" },
  { key:"chests",  g:"Allgemein", label:"Truhen geöffnet",    fmt:N },
  { key:"crafted", g:"Allgemein", label:"Items hergestellt",  fmt:N,  rec:"Meiste Crafts" },
  { key:"eaten",   g:"Allgemein", label:"Kuchen gegessen",    fmt:N },
  { key:"deaths",  g:"Kampf", label:"Tode",               fmt:N, rec:"Meiste Tode" },
  { key:"mobs",    g:"Kampf", label:"Mobs getötet",       fmt:N, rec:"Monsterjäger" },
  { key:"pvp",     g:"Kampf", label:"Spieler getötet",    fmt:N, rec:"Meiste PvP-Kills" },
  { key:"kd",      g:"Kampf", label:"Kills pro Tod",      fmt:v => nf1.format(v), hint:"Mob- und Spieler-Kills geteilt durch Tode." },
  { key:"dealt",   g:"Kampf", label:"Schaden ausgeteilt", fmt:HEARTS },
  { key:"taken",   g:"Kampf", label:"Schaden eingesteckt",fmt:HEARTS },
  { key:"creeper", g:"Kampf", label:"Creeper getötet",    fmt:N },
  { key:"zombie",  g:"Kampf", label:"Zombies getötet",    fmt:N },
  { key:"enderman",g:"Kampf", label:"Endermen getötet",   fmt:N },
  { key:"dragon",  g:"Kampf", label:"Enderdrache besiegt",fmt:N, rec:"Drachentöter" },
  { key:"wither",  g:"Kampf", label:"Wither besiegt",     fmt:N },
  { key:"mined",   g:"Bergbau", label:"Blöcke abgebaut",   fmt:N, rec:"Fleißigster Miner" },
  { key:"diamond", g:"Bergbau", label:"Diamanterz",        fmt:N, rec:"Diamanten-König" },
  { key:"debris",  g:"Bergbau", label:"Antiker Schutt",    fmt:N, rec:"Netherit-Jäger" },
  { key:"iron",    g:"Bergbau", label:"Eisenerz",          fmt:N },
  { key:"gold",    g:"Bergbau", label:"Golderz",           fmt:N },
  { key:"coal",    g:"Bergbau", label:"Kohleerz",          fmt:N },
  { key:"logs",    g:"Bergbau", label:"Holzstämme gefällt",fmt:N, rec:"Holzfäller" },
  { key:"dist",    g:"Welt", label:"Strecke gesamt", fmt:KM, rec:"Weltenbummler" },
  { key:"walk",    g:"Welt", label:"Gelaufen & gerannt", fmt:KM },
  { key:"elytra",  g:"Welt", label:"Mit Elytra geflogen", fmt:KM, rec:"Pilot" },
  { key:"boat",    g:"Welt", label:"Boot gefahren", fmt:KM },
  { key:"jumps",   g:"Welt", label:"Sprünge", fmt:N },
  { key:"fish",    g:"Welt", label:"Fische gefangen", fmt:N, rec:"Bester Angler" },
  { key:"bred",    g:"Welt", label:"Tiere gezüchtet", fmt:N, rec:"Bauer des Jahres" },
  { key:"trades",  g:"Welt", label:"Mit Dorfbewohnern gehandelt", fmt:N, rec:"Händler" },
  { key:"enchant", g:"Welt", label:"Items verzaubert", fmt:N },
];
const GROUPS = [...new Set(STATS.map(s => s.g))];
const val = (p, k) => k === "kd" ? ((p.mobs||0) + (p.pvp||0)) / Math.max(1, p.deaths||0) : (p[k] || 0);
const sum = k => players().reduce((a,p) => a + val(p,k), 0);
const rankOf = (p, k) => [...players()].sort((a,b) => val(b,k) - val(a,k)).indexOf(p) + 1;
const weekDelta = (p, k) => Math.max(0, (p[k] || 0) - (App.stats?.week?.base?.[p.uuid]?.[k] ?? (p[k] || 0)));

/* ---------- Tode ---------- */
const MOB = {
  "Zombie":["Zombie","einem Zombie"], "Zombie Villager":["Zombiedorfbewohner","einem Zombiedorfbewohner"], "Husk":["Wüstenzombie","einem Wüstenzombie"],
  "Drowned":["Ertrunkener","einem Ertrunkenen"], "Skeleton":["Skelett","einem Skelett"], "Stray":["Eiswanderer","einem Eiswanderer"], "Bogged":["Sumpfskelett","einem Sumpfskelett"],
  "Creeper":["Creeper","einem Creeper"], "Spider":["Spinne","einer Spinne"], "Cave Spider":["Höhlenspinne","einer Höhlenspinne"], "Enderman":["Enderman","einem Enderman"],
  "Witch":["Hexe","einer Hexe"], "Slime":["Schleim","einem Schleim"], "Magma Cube":["Magmawürfel","einem Magmawürfel"], "Blaze":["Lohe","einer Lohe"], "Ghast":["Ghast","einem Ghast"],
  "Piglin":["Piglin","einem Piglin"], "Piglin Brute":["Piglin-Barbar","einem Piglin-Barbaren"], "Zombified Piglin":["Zombifizierter Piglin","einem zombifizierten Piglin"],
  "Hoglin":["Hoglin","einem Hoglin"], "Zoglin":["Zoglin","einem Zoglin"], "Wither Skeleton":["Witherskelett","einem Witherskelett"], "Wither":["Wither","dem Wither"],
  "Ender Dragon":["Enderdrache","dem Enderdrachen"], "Phantom":["Phantom","einem Phantom"], "Pillager":["Plünderer","einem Plünderer"], "Vindicator":["Diener","einem Diener"],
  "Evoker":["Magier","einem Magier"], "Ravager":["Verwüster","einem Verwüster"], "Vex":["Plagegeist","einem Plagegeist"], "Guardian":["Wächter","einem Wächter"],
  "Elder Guardian":["Großer Wächter","einem Großen Wächter"], "Warden":["Wärter","dem Wärter"], "Silverfish":["Silberfischchen","einem Silberfischchen"],
  "Endermite":["Endermilbe","einer Endermilbe"], "Bee":["Biene","einer Biene"], "Wolf":["Wolf","einem Wolf"], "Polar Bear":["Eisbär","einem Eisbären"], "Llama":["Lama","einem Lama"],
  "Trader Llama":["Händlerlama","einem Händlerlama"], "Goat":["Ziege","einer Ziege"], "Pufferfish":["Kugelfisch","einem Kugelfisch"], "Shulker":["Shulker","einem Shulker"],
  "Breeze":["Böe","einer Böe"], "Iron Golem":["Eisengolem","einem Eisengolem"], "Dolphin":["Delfin","einem Delfin"], "Panda":["Panda","einem Panda"], "Creaking":["Knarz","einem Knarz"],
  "Chicken":["Huhn","einem Huhn"], "Rabbit":["Kaninchen","einem Kaninchen"], "Fox":["Fuchs","einem Fuchs"], "Arrow":["Pfeil","einem Pfeil"], "Trident":["Dreizack","einem Dreizack"],
  "Fireball":["Feuerball","einem Feuerball"], "Small Fireball":["Feuerball","einem Feuerball"], "Firework Rocket":["Feuerwerk","einer Feuerwerksrakete"],
  "Primed TNT":["TNT","TNT"], "TNT":["TNT","TNT"], "End Crystal":["Endkristall","einem Endkristall"], "Lightning Bolt":["Blitz","einem Blitz"]
};
const WEAK = new Set(["Silverfish","Bee","Pufferfish","Endermite","Chicken","Rabbit","Llama","Trader Llama","Goat","Dolphin","Slime","Panda","Fox"]);
const RULES = [
  [/struck by lightning/, "Blitz", "wurde vom Blitz getroffen", 1],
  [/sweet berry bush/, "Beerenstrauch", "wurde von einem Beerenstrauch erstochen", 1],
  [/pricked to death|walked into a cactus/, "Kaktus", "wurde von einem Kaktus erstochen", 1],
  [/starved to death/, "Verhungert", "ist verhungert", 1],
  [/kinetic energy/, "Elytra-Crash", "ist mit der Elytra gegen eine Wand geflogen", 1],
  [/impaled on a stalagmite/, "Stalagmit", "wurde von einem Stalagmiten aufgespießt", 1],
  [/falling stalactite/, "Stalaktit", "wurde von einem Stalaktiten erschlagen", 1],
  [/falling anvil/, "Amboss", "wurde von einem Amboss zerquetscht", 1],
  [/suffocated in a wall/, "Erstickt", "ist in einer Wand erstickt", 1],
  [/squashed|squished/, "Zerquetscht", "wurde zerquetscht", 0],
  [/drowned/, "Ertrunken", "ist ertrunken", 1],
  [/froze to death|frozen to death/, "Erfroren", "ist erfroren", 1],
  [/fell out of the world|left the confines|didn't want to live/, "Void", "ist aus der Welt gefallen", 0],
  [/tried to swim in lava/, "Lava", "wollte in Lava schwimmen", 0],
  [/floor was lava|walked into the danger zone/, "Magmablock", "hat gemerkt, dass der Boden Lava ist", 1],
  [/burned to death|went up in flames|burnt to a crisp|walked into fire/, "Feuer", "ist verbrannt", 0],
  [/hit the ground too hard|fell from|fell off|fell while climbing|doomed to fall|fell too far/, "Fallschaden", "ist zu tief gefallen", 0],
  [/dragon's breath/, "Drachenatem", "wurde im Drachenatem geröstet", 0],
  [/withered away/, "Wither-Effekt", "ist verdorrt", 0],
  [/sonically-charged shriek/, "Wärter", "wurde vom Wärter pulverisiert", 0],
  [/blew up$/, "Explosion", "hat sich in die Luft gesprengt", 0],
];
function deathInfo(rest){
  for (const [re, cause, de, sh] of RULES) if (re.test(rest)) return { cause, de, shame: !!sh };
  const km = rest.match(/ by (.+?)(?: using .+| while .+| whilst .+)?$/);
  if (km) {
    const killer = km[1].replace(/^(a |an |the )/i, "");
    const isPlayer = players().some(p => p.name === killer);
    const [nom, dat] = isPlayer ? ["Andere Spieler", killer] : (MOB[killer] || [killer, killer]);
    const verb = /blown up/.test(rest) ? "in die Luft gesprengt" : /shot/.test(rest) ? "erschossen" : /stung/.test(rest) ? "zu Tode gestochen" : /fireballed/.test(rest) ? "mit einem Feuerball abgeschossen" : "getötet";
    return { cause: nom, de: `wurde von ${dat} ${verb}`, shame: WEAK.has(killer) };
  }
  if (/magic/.test(rest)) return { cause: "Magie", de: "wurde durch Magie getötet", shame: false };
  return { cause: "Sonstiges", de: "ist gestorben", shame: false };
}
const deaths = () => App.events.filter(e => e[1] === "d").map(e => ({ t: e[0], p: e[2], ...deathInfo(e[3]) }));

/* ---------- Sessions ---------- */
function sessions(){
  const open = {}, out = [];
  for (const [t, ty, p] of App.events) {
    if (ty === "j") open[p] = t;
    else if (ty === "l" && open[p]) { out.push({ p, from: open[p], to: t }); delete open[p]; }
    else if (ty === "s") { for (const k in open) { out.push({ p: k, from: open[k], to: t }); delete open[k]; } }
    else if (ty === "b") { for (const k in open) delete open[k]; }
  }
  for (const k in open) out.push({ p: k, from: open[k], to: null });
  return out;
}
function lastSeen(){ const m = {}; for (const [t, ty, p] of App.events) if ((ty === "j" || ty === "l") && p) m[p] = t; return m; }
const sessionEnd = s => s.to ? toDate(s.to) : new Date(isOnline(s.p) ? Date.now() : toDate(s.from).getTime() + 60000);

/* ---------- Abzeichen ---------- */
const BADGES = [
  ["vielspieler", "Vielspieler", "100 Stunden gespielt", "#6fbf3f", c => c.p.play >= 7200000],
  ["miner", "Bergarbeiter", "10.000 Blöcke abgebaut", "#9a9a9a", c => c.p.mined >= 10000],
  ["diamant", "Diamantenfieber", "50 Diamanterz abgebaut", "#62ede4", c => c.p.diamond >= 50],
  ["netherit", "Netherit-Jäger", "16 Antiken Schutt gefunden", "#7b5c52", c => c.p.debris >= 16],
  ["holz", "Holzfäller", "1.000 Stämme gefällt", "#a2824e", c => c.p.logs >= 1000],
  ["jaeger", "Monsterjäger", "1.000 Mobs getötet", "#ef5b5b", c => c.p.mobs >= 1000],
  ["drache", "Drachentöter", "Den Enderdrachen besiegt", "#b05cff", c => c.p.dragon >= 1],
  ["unsterblich", "Unsterblich", "10 Stunden am Stück überlebt", "#f2c14e", c => c.p.alive >= 720000],
  ["pechvogel", "Pechvogel", "50-mal gestorben", "#5a4a66", c => c.p.deaths >= 50],
  ["peinlich", "Peinlich", "3 Tode auf der Wall of Shame", "#d08a4e", c => c.shame >= 3],
  ["weltenbummler", "Weltenbummler", "100 km zurückgelegt", "#5a7bd8", c => c.p.dist >= 10000000],
  ["pilot", "Pilot", "50 km mit Elytra geflogen", "#8fb3ff", c => c.p.elytra >= 5000000],
  ["angler", "Angler", "100 Fische gefangen", "#3fa0bf", c => c.p.fish >= 100],
  ["bauer", "Bauer", "100 Tiere gezüchtet", "#c6a14b", c => c.p.bred >= 100],
  ["haendler", "Händler", "100-mal gehandelt", "#2acb57", c => c.p.trades >= 100],
  ["nachteule", "Nachteule", "5 Sessions nach Mitternacht begonnen", "#3b3a7a", c => c.night >= 5],
  ["quassel", "Quasselstrippe", "100 Chat-Nachrichten", "#e07bb0", c => c.chat >= 100],
  ["erfolge", "Erfolgsjäger", "50 Fortschritte geschafft", "#f2c14e", c => c.adv >= 50],
];
function badgesOf(p){
  const ctx = {
    p,
    shame: deaths().filter(d => d.p === p.name && d.shame).length,
    night: sessions().filter(s => s.p === p.name && +s.from.slice(11,13) < 5).length,
    chat: App.events.filter(e => e[1] === "c" && e[2] === p.name).length,
    adv: advDone(p).length
  };
  return BADGES.map(([id, name, desc, color, test]) => ({ id, name, desc, color, has: !!test(ctx) }));
}
const badgeHtml = b => `<span class="badge${b.has ? "" : " locked"}" title="${esc(b.desc)}"><span class="gem" style="background:${b.color}">${esc(b.name.slice(0,2).toUpperCase())}</span><span><b>${esc(b.name)}</b><span>${esc(b.desc)}</span></span></span>`;

/* ---------- Fortschritte ---------- */
const ADV_CAT = { story: "Minecraft", nether: "Nether", end: "Das Ende", adventure: "Abenteuer", husbandry: "Landwirtschaft" };
const advDone = p => (App.stats?.adv?.[p.uuid] || []).filter(([id]) => !id.endsWith("/root"));
const advName = id => id.split("/").pop().split("_").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
const advCat = id => ADV_CAT[id.split("/")[0]] || id.split("/")[0];

/* ---------- Gemeinsame Bausteine ---------- */
function tilesHtml(){
  const L = App.live, has = players().length;
  const t = [
    { k:"Online", v: L.online ? L.count : 0, s: !L.checked ? "wird geprüft …" : L.online ? `von ${L.max} Plätzen` : "Server ist offline", main:true },
    { k:"Spieler gesamt", v: has ? players().length : "–", s:"waren schon mal da" },
    { k:"Stunden gespielt", v: has ? N(sum("play")/72000) : "–", s:"alle zusammen" },
    { k:"Tode", v: has ? N(sum("deaths")) : "–", s:"alle zusammen" },
    { k:"Mobs getötet", v: has ? N(sum("mobs")) : "–", s:"alle zusammen" },
    { k:"Blöcke abgebaut", v: has ? N(sum("mined")) : "–", s:"alle zusammen" },
    { k:"Diamanterz", v: has ? N(sum("diamond")) : "–", s:"alle zusammen" },
    { k:"Strecke", v: has ? N(sum("dist")/100000) + " km" : "–", s:"alle zusammen" },
  ];
  return t.map(x => `<div class="tile${x.main ? " main" : ""}"><span class="k">${x.k}</span><span class="v">${x.v}</span><span class="s">${x.s}</span></div>`).join("");
}
function worldHtml(){
  const w = App.stats?.world;
  if (!w) return "";
  const hr = Math.floor((w.time / 1000 + 6) % 24), mi = Math.floor((w.time % 1000) * 0.06);
  const phase = w.time < 5000 ? "Vormittag" : w.time < 7000 ? "Mittag" : w.time < 12000 ? "Nachmittag" : w.time < 13800 ? "Abend" : w.time < 22500 ? "Nacht" : "Morgen";
  const chips = [
    ["Tag", nf.format(w.day)],
    ["Uhrzeit", `${String(hr).padStart(2,"0")}:${String(mi).padStart(2,"0")} · ${phase}`],
    ["Wetter", w.thundering ? "Gewitter" : w.raining ? "Regen" : "Klar"],
    w.difficulty && ["Schwierigkeit", w.difficulty + (w.hardcore ? " (Hardcore)" : "")],
    w.spawn && ["Spawn", w.spawn.join(" / ")]
  ].filter(Boolean);
  return chips.map(([l, v]) => `<span class="chip"><span class="lbl">${l}</span><b>${esc(v)}</b></span>`).join("") + `<span class="chip small muted">Weltstand vom letzten Abgleich</span>`;
}
function liveStatusInto(){
  const L = App.live, pill = $("statusPill");
  if (pill && L.checked) {
    pill.classList.toggle("on", L.online); pill.classList.toggle("off", !L.online && !L.error);
    set("statusText", L.error ? "Status nicht erreichbar" : L.online ? `Online · ${L.count}/${L.max}` : "Offline");
  }
  if (L.at) set("updated", "Aktualisiert um " + L.at.toLocaleTimeString("de-DE", { hour:"2-digit", minute:"2-digit", second:"2-digit" }));
}
function recordsInto(id, limit){
  const box = $(id); if (!box) return;
  if (!players().length) { box.innerHTML = empty("Hier stehen bald eure Rekordhalter.", "Sobald die ersten Stats da sind.", true); return; }
  const recs = STATS.filter(s => s.rec).map(s => ({ s, best: [...players()].sort((a,b) => val(b,s.key) - val(a,s.key))[0] })).filter(r => r.best && val(r.best, r.s.key));
  box.innerHTML = recs.slice(0, limit || 99).map(({ s, best }) => `<a class="rec" href="${plink(best.name)}" style="text-decoration:none"><img alt="" loading="lazy" src="${head(best.name)}"><div style="min-width:0"><div class="t">${esc(s.rec)}</div><div class="n">${esc(best.name)}</div><div class="v">${s.fmt(val(best,s.key))}</div></div></a>`).join("");
}
const deathRow = d => `<div class="fi${d.shame ? " shame" : ""}"><img alt="" loading="lazy" src="${head(d.p)}"><span class="tx"><a href="${plink(d.p)}" style="text-decoration:none"><b>${esc(d.p)}</b></a> ${esc(d.de)}</span><span class="tm">${when(d.t)}</span></div>`;
function deathFeedInto(id, n, who){
  const el = $(id); if (!el) return;
  const all = deaths().filter(d => !who || d.p === who);
  el.innerHTML = all.length ? all.slice(-n).reverse().map(deathRow).join("") : empty(who ? "Noch keine Tode." : "Noch keine Tode in den Logs.", who ? "" : "Erstaunlich vorsichtig, ihr alle.");
}
function causesInto(id){
  const el = $(id); if (!el) return;
  const all = deaths();
  if (!all.length) { el.innerHTML = `<p class="muted small">Noch keine Daten.</p>`; return; }
  const by = {};
  for (const d of all) { const c = by[d.cause] ||= { n: 0, who: {} }; c.n++; c.who[d.p] = (c.who[d.p] || 0) + 1; }
  const top = Object.entries(by).sort((a,b) => b[1].n - a[1].n).slice(0, 12);
  const max = top[0][1].n;
  el.innerHTML = top.map(([c, v]) => {
    const w = Object.entries(v.who).sort((a,b) => b[1]-a[1])[0];
    return `<div class="bar-row"><div class="top"><span>${esc(c)}</span><span>${v.n}×</span></div><div class="track"><i style="width:${v.n/max*100}%"></i></div><div class="who">Am häufigsten: ${esc(w[0])} (${w[1]}×)</div></div>`;
  }).join("");
}
function shameInto(id, n){
  const el = $(id); if (!el) return;
  const sh = deaths().filter(d => d.shame);
  if (!sh.length) { el.innerHTML = `<p class="muted small">Noch niemand hat sich blamiert. Noch nicht.</p>`; return; }
  const cnt = {}; sh.forEach(d => cnt[d.p] = (cnt[d.p] || 0) + 1);
  const [king, kn] = Object.entries(cnt).sort((a,b) => b[1]-a[1])[0];
  el.innerHTML = `<div class="shame-king"><img alt="" src="${head(king)}"><div><div class="eyebrow" style="color:var(--gold)">Shame-König</div><div style="font:800 1.4rem var(--f-display)">${esc(king)}</div><div class="small muted">${kn} peinliche Tode</div></div></div>
    <div class="feed">${sh.slice(-(n || 5)).reverse().map(deathRow).join("")}</div>`;
}

/* Online-Zeitleiste */
let onlineDay = null;
function timelineInto(){
  const ss = sessions();
  const days = [...new Set(ss.flatMap(s => [s.from.slice(0,10), (s.to || s.from).slice(0,10)]))].sort().reverse().slice(0, 7);
  if (!ss.length) { set("daySeg", ""); set("tlAxis", ""); set("timeline", empty("Noch keine Sessions in den Logs.", "Sobald jemand joint, erscheint er hier mit Uhrzeit und Dauer.")); return; }
  if (!onlineDay || !days.includes(onlineDay)) onlineDay = days[0];
  set("daySeg", days.map(d => `<button type="button" data-d="${d}" aria-pressed="${d === onlineDay}">${dayLabel(d)}</button>`).join(""));
  $("daySeg").querySelectorAll("button").forEach(b => b.onclick = () => { onlineDay = b.dataset.d; timelineInto(); });
  const dayStart = toDate(onlineDay + " 00:00:00"), dayEnd = new Date(dayStart.getTime() + 864e5);
  const rows = {};
  for (const s of ss) {
    const a = toDate(s.from), b = sessionEnd(s);
    if (b <= dayStart || a >= dayEnd) continue;
    const x0 = Math.max(a, dayStart), x1 = Math.min(b, dayEnd);
    (rows[s.p] ||= { segs: [], total: 0 }).segs.push({ l: (x0 - dayStart) / 864e5 * 100, w: (x1 - x0) / 864e5 * 100, live: !s.to && isOnline(s.p), title: `${s.from.slice(11,16)}–${s.to ? s.to.slice(11,16) : "jetzt"}` });
    rows[s.p].total += x1 - x0;
  }
  const names = Object.keys(rows).sort((a,b) => rows[b].total - rows[a].total);
  set("timeline", names.length ? names.map(n => `<div class="tl-row"><a class="nm" href="${plink(n)}" style="text-decoration:none"><img alt="" src="${head(n)}"><span>${esc(n)}</span></a>
    <div style="min-width:0"><div class="tl-track">${rows[n].segs.map(s => `<i class="${s.live ? "live" : ""}" style="left:${s.l}%;width:${s.w}%" title="${s.title}"></i>`).join("")}</div>
    <div class="small muted">${dur(rows[n].total)} · ${rows[n].segs.map(s => s.title).join(", ")}</div></div></div>`).join("") : `<p class="muted">An diesem Tag war niemand online.</p>`);
  set("tlAxis", ["00","06","12","18","24"].map(h => `<span>${h}:00</span>`).join(""));
}
function seenInto(id){
  const seen = lastSeen();
  const all = [...new Set([...players().map(p => p.name), ...Object.keys(seen)])];
  set(id, all.sort((a,b) => (isOnline(b) - isOnline(a)) || String(seen[b]||"").localeCompare(String(seen[a]||""))).map(n =>
    `<a href="${plink(n)}" style="text-decoration:none"><span><img alt="" src="${head(n)}">${esc(n)} · ${isOnline(n) ? `<span class="on">jetzt online</span>` : (seen[n] ? when(seen[n]) : "unbekannt")}</span></a>`).join("") || `<span class="muted">Noch keine Daten.</span>`);
}
function chatInto(id, n){
  const box = $(id); if (!box) return;
  const msgs = App.events.filter(e => e[1] === "c").slice(-(n || 150));
  if (!msgs.length) { box.innerHTML = `<p class="muted" style="margin:0">Noch keine Nachrichten in den Logs.</p>`; return; }
  let day = "", html = "";
  for (const [t, , p, m] of msgs) {
    if (t.slice(0,10) !== day) { day = t.slice(0,10); html += `<div class="msg day">${dayLabel(day)}</div>`; }
    html += `<div class="msg${p === "Server" ? " srv" : ""}"><span class="tm">${t.slice(11,16)}</span><span class="body"><b>${esc(p)}</b> ${esc(m)}</span></div>`;
  }
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
  box.innerHTML = html;
  if (atBottom || !box.dataset.init) { box.scrollTop = box.scrollHeight; box.dataset.init = 1; }
}
function heatInto(id){
  const el = $(id); if (!el) return;
  const per = {};
  for (const s of sessions()) {
    let a = toDate(s.from); const b = sessionEnd(s);
    while (a < b) { const d = ymd(a); const next = new Date(a); next.setHours(24,0,0,0); const e = b < next ? b : next; per[d] = (per[d] || 0) + (e - a); a = next; }
  }
  const end = new Date(); end.setHours(0,0,0,0);
  const start = new Date(end); start.setDate(start.getDate() - 7 * 16 - ((end.getDay() + 6) % 7));
  let html = "";
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const h = (per[ymd(d)] || 0) / 36e5;
    const l = h === 0 ? 0 : h < 1 ? 1 : h < 3 ? 2 : h < 6 ? 3 : 4;
    html += `<i data-l="${l}" title="${dayLabel(ymd(d))}: ${nf1.format(h)} h"></i>`;
  }
  el.innerHTML = html;
}

/* Crew */
const DIM = { overworld: "Overworld", the_nether: "Nether", the_end: "End" };
function crewInto(id){
  const grid = $(id); if (!grid) return;
  const names = new Map();
  (App.live.players || []).forEach(n => names.set(lc(n), { name: n, on: true }));
  [...CONFIG.crew, ...players().map(p => p.name)].forEach(n => { if (n && !names.has(lc(n))) names.set(lc(n), { name: n, on: false }); });
  if (!names.size) { grid.innerHTML = empty("Noch keine Spieler.", "Sobald jemand joint, taucht sein Skin hier auf.", true); return; }
  const seen = lastSeen();
  grid.innerHTML = [...names.values()].sort((a,b) => (b.on - a.on) || a.name.localeCompare(b.name)).map(m => {
    const pr = profileOf(m.name);
    return `<a class="member" href="${plink(m.name)}" style="text-decoration:none"><img class="body" alt="Skin von ${esc(m.name)}" loading="lazy" src="${body(m.name)}"><h3>${esc(m.name)}</h3>
      <span class="st ${m.on ? "on" : ""}">${m.on ? "Online" : "Offline"}${pr ? " · " + (DIM[pr.dim] || esc(pr.dim)) : ""}</span>
      <span class="ls">${m.on ? "spielt gerade" : seen[m.name] ? "zuletzt " + when(seen[m.name]) : ""}</span></a>`;
  }).join("");
}

/* Bingo */
function weekEnd(){ const d = new Date(); const add = (8 - d.getDay()) % 7 || 7; d.setDate(d.getDate() + add); d.setHours(0,0,0,0); return d; }
function bingoProgress(p, c){ const cur = p[c.key] || 0; const base = App.stats.week?.base?.[p.uuid]?.[c.key] ?? cur; return c.abs ? cur : Math.max(0, cur - base); }
const fmtCh = (c, v) => ["play","alive"].includes(c.key) ? nf1.format(v/72000) + " h" : ["walk","elytra","boat"].includes(c.key) ? nf1.format(v/100000) + " km" : nf.format(v);
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function bingoInto(){
  const ch = App.stats?.challenges || [], grid = $("bingoGrid"), sel = $("bingoPlayer");
  if (!grid) return;
  if (!ch.length || !players().length) { grid.innerHTML = empty("Das Bingo startet mit dem nächsten Abgleich.", "Dann gibt es neun Aufgaben für diese Woche.", true); return; }
  const sorted = [...players()].sort((a,b) => a.name.localeCompare(b.name));
  const cur = sel.value;
  sel.innerHTML = sorted.map(p => `<option value="${esc(p.uuid)}">${esc(p.name)}</option>`).join("");
  sel.value = cur && players().some(p => p.uuid === cur) ? cur : (players().find(p => isOnline(p.name)) || sorted[0]).uuid;
  const me = players().find(p => p.uuid === sel.value);
  const done = ch.map(c => bingoProgress(me, c) >= c.target);
  grid.innerHTML = ch.map((c, i) => {
    const v = bingoProgress(me, c), who = players().filter(p => bingoProgress(p, c) >= c.target);
    return `<div class="cell${done[i] ? " done" : ""}">${done[i] ? `<span class="ok">Geschafft</span>` : ""}<div class="task">${esc(c.text)}</div>
      <div class="prog"><i style="width:${Math.min(100, v / c.target * 100)}%"></i></div><div class="pv">${fmtCh(c, Math.min(v, c.target))} / ${fmtCh(c, c.target)}</div>
      <div class="heads">${who.map(p => `<img alt="${esc(p.name)}" title="${esc(p.name)}" src="${head(p.name)}">`).join("")}</div></div>`;
  }).join("");
  const lines = LINES.filter(l => l.every(i => done[i])).length;
  set("bingoBanner", lines ? (lines === 1 ? "BINGO!" : `${lines}× BINGO!`) : "");
  const left = weekEnd() - new Date();
  set("bingoEnd", `Neue Aufgaben in ${Math.floor(left/864e5)} T ${Math.floor(left/36e5)%24} h`);
}

/* Bestenlisten */
let activeGroup = "Allgemein", activeKey = "play", activeSeason = "current";
const seasonPlayers = () => activeSeason === "current" ? players() : (App.stats?.seasons || []).find(s => String(s.n) === activeSeason)?.players || [];
function boardTabs(){
  const g = $("groups"); if (!g) return;
  const seasons = App.stats?.seasons || [];
  g.innerHTML = GROUPS.map(x => `<button type="button" role="tab" data-g="${x}" aria-selected="${x === activeGroup}">${x}</button>`).join("") +
    (seasons.length ? `<select class="sel" id="seasonSel" aria-label="Staffel"><option value="current">Staffel ${App.stats.season?.n || seasons.length + 1} (aktuell)</option>${seasons.slice().reverse().map(x => `<option value="${x.n}">${esc(x.name)}</option>`).join("")}</select>` : "");
  g.querySelectorAll("button").forEach(b => b.onclick = () => { activeGroup = b.dataset.g; activeKey = STATS.find(s => s.g === activeGroup).key; boardTabs(); boardInto(); });
  if ($("seasonSel")) { $("seasonSel").value = activeSeason; $("seasonSel").onchange = e => { activeSeason = e.target.value; boardInto(); }; }
  set("tabs", STATS.filter(s => s.g === activeGroup).map(s => `<button type="button" role="tab" data-k="${s.key}" aria-selected="${s.key === activeKey}">${s.label}</button>`).join(""));
  $("tabs").querySelectorAll("button").forEach(b => b.onclick = () => { activeKey = b.dataset.k; boardTabs(); boardInto(); });
  const st = STATS.find(s => s.key === activeKey);
  const hint = $("hint"); if (hint) { hint.textContent = st.hint || ""; hint.hidden = !st.hint; }
}
function boardInto(){
  const board = $("board"); if (!board) return;
  const list0 = seasonPlayers();
  if (!list0.length) { board.innerHTML = empty("Hier erscheinen eure Bestenlisten.", "Über 30 Kategorien von Spielzeit über Diamanten bis Angeln."); return; }
  const s = STATS.find(x => x.key === activeKey);
  const list = [...list0].sort((a,b) => val(b,s.key) - val(a,s.key));
  const top = val(list[0], s.key) || 1;
  board.innerHTML = list.map((p, i) => { const v = val(p, s.key);
    return `<a class="row" href="${plink(p.name)}" style="text-decoration:none"><span class="rk">${i+1}</span><img alt="" loading="lazy" src="${head(p.name)}">
      <div style="min-width:0"><div class="nm">${esc(p.name)}</div><div class="bar"><i style="width:${Math.max(2, v/top*100)}%"></i></div></div><span class="val">${s.fmt(v)}</span></a>`; }).join("");
}

/* Inventar */
const ITEM_ALIAS = { cooked_beef: "Steak", beef: "Raw_Beef", porkchop: "Raw_Porkchop", chicken: "Raw_Chicken", mutton: "Raw_Mutton", rabbit: "Raw_Rabbit", cod: "Raw_Cod", salmon: "Raw_Salmon" };
const itemTitle = id => id.split("_").map(w => w[0].toUpperCase() + w.slice(1)).join("_");
const itemName = id => itemTitle(id).replace(/_/g, " ");
const itemImg = id => `https://minecraft.wiki/w/Special:FilePath/Invicon_${ITEM_ALIAS[id] || itemTitle(id)}.png`;
function slotHtml(it){
  if (!it) return `<div class="slot"></div>`;
  return `<div class="slot${it.e ? " ench" : ""}" title="${esc(itemName(it.id))}${it.n > 1 ? " ×" + it.n : ""}"><img alt="${esc(itemName(it.id))}" loading="lazy" src="${itemImg(it.id)}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'fb',textContent:this.alt}))">${it.n > 1 ? `<span class="cnt">${it.n}</span>` : ""}</div>`;
}
const invGrid = (items, slots) => { const m = new Map((items || []).map(i => [i.s, i])); return slots.map(s => slotHtml(m.get(s))).join(""); };

/* Karte */
let map = null, markerLayer = null, mapInfo = null, mapExtra = [];
async function mapInto(id, opts = {}){
  const el = $(id); if (!el) return;
  try { const r = await fetch("map/index.json", { cache: "no-store" }); if (!r.ok) throw 0; mapInfo = await r.json(); }
  catch { el.outerHTML = `<div class="empty" id="${id}"><strong>Die Karte wird beim nächsten Welt-Backup gezeichnet.</strong><span>Das passiert automatisch jeden Sonntag. Sofort geht es auf GitHub unter Actions → „Welt hochladen“ → Run workflow.</span></div>`; return; }
  if (!window.L || !mapInfo.regions?.length) return;
  map = L.map(id, { crs: L.CRS.Simple, minZoom: -5, maxZoom: 3, zoomSnap: 0.5, attributionControl: false });
  const v = encodeURIComponent(mapInfo.generated || "");
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const [rx, rz] of mapInfo.regions) {
    const x0 = rx * 512, z0 = rz * 512;
    L.imageOverlay(`map/tiles/${rx}.${rz}.png?v=${v}`, [[-z0, x0], [-(z0 + 512), x0 + 512]]).addTo(map);
    minX = Math.min(minX, x0); maxX = Math.max(maxX, x0 + 512); minZ = Math.min(minZ, z0); maxZ = Math.max(maxZ, z0 + 512);
  }
  const sp = App.stats?.world?.spawn ? [App.stats.world.spawn[0], App.stats.world.spawn[2]] : mapInfo.spawn;
  const q = new URLSearchParams(location.search);
  if (q.has("x") && q.has("z")) map.setView([-Number(q.get("z")), Number(q.get("x"))], 1);
  else if (sp) map.setView([-sp[1], sp[0]], 0); else map.fitBounds([[-minZ, minX], [-maxZ, maxX]]);
  if (sp) L.marker([-sp[1], sp[0]], { icon: L.divIcon({ className: "spawnmark", iconSize: [14,14] }) }).bindTooltip("Spawn").addTo(map);
  for (const pr of opts.places || []) {
    if (pr.x == null || pr.z == null || (pr.dimension && pr.dimension !== "overworld")) continue;
    const color = pr.typ === "ort" ? "#5a7bd8" : pr.status === "fertig" ? "#6fbf3f" : "#f2c14e";
    L.marker([-pr.z, pr.x], { icon: L.divIcon({ className: "pin", html: "", iconSize: [14,14] }) }).addTo(map)
      .bindTooltip(`${esc(pr.name)}<br>${pr.x} / ${pr.y ?? "?"} / ${pr.z}`).getElement()?.style.setProperty("background", color);
  }
  markerLayer = L.layerGroup().addTo(map);
  map.on("mousemove", e => set("mapNote", `X ${Math.round(e.latlng.lng)} · Z ${Math.round(-e.latlng.lat)}`));
  set("mapNote", `Stand der Karte: ${new Date(mapInfo.generated).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}`);
  onUpdate(mapMarkers);
}
function mapMarkers(){
  if (!markerLayer) return;
  markerLayer.clearLayers();
  for (const p of players()) {
    const pr = App.stats.profiles?.[p.uuid];
    if (!pr?.pos || pr.dim !== "overworld") continue;
    const m = L.marker([-pr.pos[2], pr.pos[0]], { icon: L.icon({ iconUrl: head(p.name), iconSize: [32,32], className: "phead" }) })
      .bindTooltip(`${esc(p.name)}${isOnline(p.name) ? " · online" : ""}<br>${pr.pos.join(" / ")}`);
    m.on("click", () => location.href = plink(p.name));
    markerLayer.addLayer(m);
  }
}

/* Downloads */
async function downloadsInto(id){
  const box = $(id); if (!box) return;
  try {
    const r = await fetch(`https://api.github.com/repos/${CONFIG.github}/releases?per_page=20`);
    if (!r.ok) throw 0;
    const rel = (await r.json()).filter(x => !x.draft && x.assets?.some(a => a.name.endsWith(".zip")));
    if (!rel.length) { box.innerHTML = empty("Noch keine Welt hochgeladen.", "Die erste Sicherung erscheint hier automatisch am Sonntag."); return; }
    box.innerHTML = rel.map((x, i) => {
      const a = x.assets.find(a => a.name.endsWith(".zip")), mb = a.size / 1048576;
      const size = mb >= 1024 ? nf1.format(mb / 1024) + " GB" : nf.format(Math.round(mb)) + " MB";
      return `<div class="dl-item${i === 0 ? " latest" : ""}"><span class="ico" aria-hidden="true"></span><div style="min-width:0"><h3>${esc(x.name || x.tag_name)}${i === 0 ? '<span class="tag">Neueste</span>' : ""}</h3>
        <div class="meta">${new Date(x.published_at || x.created_at).toLocaleDateString("de-DE", { dateStyle: "long" })} · ${size} · ${nf.format(a.download_count)}× geladen</div></div><a class="btn" href="${esc(a.browser_download_url)}">Welt herunterladen</a></div>`;
    }).join("");
  } catch { box.innerHTML = empty("Downloads gerade nicht erreichbar.", "Bitte die Seite in ein paar Minuten neu laden."); }
}

/* Sternenhimmel (Startseite) */
function stars(){
  const c = $("stars"); if (!c) return;
  const x = c.getContext("2d");
  const draw = () => {
    const r = c.getBoundingClientRect(); c.width = r.width; c.height = r.height;
    x.clearRect(0,0,c.width,c.height);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < Math.round(c.width*c.height/5000); i++) {
      const s = rnd() < .85 ? 2 : 4;
      x.fillStyle = `rgba(241,236,247,${.25 + rnd()*.6})`;
      x.fillRect(Math.floor(rnd()*c.width/2)*2, Math.floor(rnd()*c.height*.8/2)*2, s, s);
    }
    x.fillStyle = "#f4ecd2"; const m = 44, mx = c.width - m - 40, my = 36;
    x.fillRect(mx, my, m, m); x.fillStyle = "#ddd2b2"; x.fillRect(mx+8, my+10, 10, 8); x.fillRect(mx+26, my+26, 8, 8);
  };
  draw(); addEventListener("resize", draw);
}

/* =========================================================
   Seiten
   ========================================================= */
const PAGE_INIT = {

  start(){
    stars();
    const parts = CONFIG.name.split(" "); const last = parts.pop();
    $("heroTitle").innerHTML = esc(parts.join(" ")) + (parts.length ? " " : "") + `<em>${esc(last)}</em>`;
    $("copyBtn").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(addr); $("copyBtn").textContent = "Kopiert!"; }
      catch { const r = document.createRange(); r.selectNodeContents($("ipText")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); $("copyBtn").textContent = "Markiert"; }
      setTimeout(() => $("copyBtn").textContent = "IP kopieren", 1800);
    });
    if (CONFIG.discord?.invite) $("statusPill").insertAdjacentHTML("afterend", `<a class="pill" href="${esc(CONFIG.discord.invite)}" target="_blank" rel="noopener" style="text-decoration:none;border-color:#5865f2">Discord beitreten →</a>`);
    const items = [CONFIG.name, CONFIG.software + " " + CONFIG.version, "Live-Stats", "Karte", "Wochen-Bingo", "Todes-Feed", "Events", "Discord", addr];
    const run = items.map(t => `<span>${esc(t)}</span><span>✦</span>`).join("");
    set("tickerInner", run + run);
    let events = [];
    loadContent("events").then(e => { events = e; renderEvent(); });
    function renderEvent(){
      const now = new Date();
      const next = events.map(e => ({ ...e, d: new Date(String(e.datum).replace(" ", "T")) })).filter(e => e.d > now - 3 * 36e5).sort((a,b) => a.d - b.d)[0];
      set("nextEvent", next ? `<div class="next-event"><span class="ttl">${esc(next.titel)}</span><span class="muted">${next.d.toLocaleString("de-DE", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} Uhr${next.ort ? " · " + esc(next.ort) : ""}</span><span class="countdown">${countdown(next.d)}</span></div>`
        : `<p class="muted" style="margin:0">Gerade ist nichts geplant. Neue Events tragt ihr in <code>content/events.json</code> ein.</p>`);
    }
    setInterval(renderEvent, 1000);
    onUpdate(() => {
      liveStatusInto();
      set("tiles", tilesHtml()); set("worldbar", worldHtml());
      const on = App.live.players || [];
      set("onlineNow", on.length ? `<div class="online-now">${on.map(n => `<a href="${plink(n)}"><img alt="" src="${head(n)}">${esc(n)}</a>`).join("")}</div>` : `<p class="muted" style="margin:0">${App.live.checked ? "Gerade ist niemand online." : "Wird geprüft …"}</p>`);
      const ps = players();
      const best = ps.length ? [...ps].sort((a,b) => weekDelta(b,"play") - weekDelta(a,"play"))[0] : null;
      set("potw", best && weekDelta(best, "play") > 0 ? `<div class="potw"><img alt="" src="${body(best.name)}"><div><div class="big"><a href="${plink(best.name)}" style="text-decoration:none">${esc(best.name)}</a></div>
        <div class="muted">${H(weekDelta(best,"play"))} diese Woche gespielt</div><div class="small muted">${N(weekDelta(best,"mined"))} Blöcke · ${N(weekDelta(best,"mobs"))} Mobs · ${N(weekDelta(best,"deaths"))} Tode</div></div></div>`
        : `<p class="muted" style="margin:0">Diese Woche hat noch niemand gespielt.</p>`);
      deathFeedInto("startDeaths", 5);
      recordsInto("startRecords", 6);
      const ch = App.stats?.challenges || [];
      set("startBingo", ch.length && ps.length ? `<div class="feed">${ch.slice(0, 9).map(c => { const who = ps.filter(p => bingoProgress(p, c) >= c.target);
        return `<div class="fi" style="grid-template-columns:minmax(0,1fr) auto"><span class="tx">${esc(c.text)}</span><span class="tm">${who.length ? who.map(p => esc(p.name)).join(", ") : "offen"}</span></div>`; }).join("")}</div>` : `<p class="muted" style="margin:0">Startet mit dem nächsten Abgleich.</p>`);
    });
  },

  spieler(){ onUpdate(() => crewInto("crewGrid")); },

  profil(){
    const name = new URLSearchParams(location.search).get("name") || "";
    let places = [];
    onUpdate(() => {
      const p = playerBy(name);
      const real = p ? p.name : name;
      document.title = `${real} · ${CONFIG.name}`;
      set("pName", esc(real)); $("pSkin").src = body(real);
      const pr = p && App.stats.profiles?.[p.uuid];
      const on = isOnline(real), seen = lastSeen()[real];
      set("pState", on ? "● Gerade online" : "Spielerprofil");
      set("pFacts", [
        `<span class="chip"><span class="lbl">Status</span><b>${on ? "online" : seen ? "zuletzt " + when(seen) : "offline"}</b></span>`,
        p && `<span class="chip"><span class="lbl">Spielzeit</span><b>${H(p.play)}</b></span>`,
        p && `<span class="chip"><span class="lbl">Rang</span><b>#${rankOf(p, "play")}</b></span>`,
        pr && `<span class="chip"><span class="lbl">Level</span><b>${pr.xp}</b></span>`,
        pr && `<span class="chip"><span class="lbl">${DIM[pr.dim] || esc(pr.dim)}</span><b>${pr.pos ? pr.pos.join(" / ") : "?"}</b></span>`,
        pr?.pos && pr.dim === "overworld" && `<a class="chip" href="karte.html?x=${pr.pos[0]}&z=${pr.pos[2]}" style="text-decoration:none">Auf der Karte zeigen →</a>`
      ].filter(Boolean).join(""));
      if (!App.stats) return;
      $("pMain").hidden = !p;
      set("pEmpty", p ? "" : `<section class="block-sec"><div class="wrap">${empty(`Noch keine Daten für ${esc(name)}.`, "Sobald der Spieler auf dem Server war und der nächste Abgleich lief, steht hier alles.")}</div></section>`);
      if (!p) return;
      set("pBadges", badgesOf(p).sort((a,b) => b.has - a.has).map(badgeHtml).join(""));
      if (pr) {
        const hearts = Math.round(pr.health) / 2;
        set("pVitals", `<div class="hearts" title="${nf1.format(pr.health / 2)} von 10 Herzen">${range(0,10).map(i => i < hearts ? "♥" : `<span class="e">♥</span>`).join("")}</div>
          <div class="small muted">Leben ${nf1.format(pr.health / 2)} / 10 · Hunger ${pr.food ?? "?"} / 20 · Level ${pr.xp}</div><div class="xpbar"><i style="width:${(pr.xpP || 0) * 100}%"></i></div>`);
        set("pInv", `<div class="armor">${invGrid(pr.inv, [103,102,101,100,-106])}</div><div class="inv sep">${invGrid(pr.inv, range(9,36))}</div><div class="inv sep">${invGrid(pr.inv, range(0,9))}</div>`);
        set("pEnder", `<div class="inv">${invGrid(pr.ender, range(0,27))}</div>`);
      } else { set("pVitals", `<p class="muted small">Noch keine Spielerdaten.</p>`); set("pInv", ""); set("pEnder", ""); }
      deathFeedInto("pDeaths", 8, real);
      const ss = sessions().filter(s => s.p === real).slice(-8).reverse();
      set("pSessions", ss.length ? ss.map(s => `<div class="fi" style="grid-template-columns:minmax(0,1fr) auto"><span class="tx">${when(s.from)} – ${s.to ? s.to.slice(11,16) : "jetzt"}</span><span class="tm">${dur(sessionEnd(s) - toDate(s.from))}</span></div>`).join("") : `<p class="muted small">Noch keine Sessions in den Logs.</p>`);
      set("pStats", GROUPS.map(g => `<div><h4>${g}</h4><div class="kv">` + STATS.filter(s => s.g === g).map(s => { const r = rankOf(p, s.key);
        return `<div><span>${s.label}</span><b>${s.fmt(val(p,s.key))}${r === 1 && val(p,s.key) > 0 ? " <small>#1</small>" : ""}</b></div>`; }).join("") + `</div></div>`).join(""));
      const adv = advDone(p).slice().reverse();
      set("pAdv", adv.length ? `<p class="muted small" style="margin:0 0 8px">${adv.length} Fortschritte geschafft</p><div class="adv-list">${adv.slice(0, 12).map(([id, t]) => `<div class="adv"><div><div class="cat">${advCat(id)}</div><div class="nm">${esc(advName(id))}</div></div><span class="tm small muted">${t ? when(t) : ""}</span></div>`).join("")}</div>` : `<p class="muted small">Noch keine Fortschritte erfasst.</p>`);
      const sorted = [...players()].sort((a,b) => a.name.localeCompare(b.name)), i = sorted.indexOf(p);
      set("pNav", sorted.length > 1 ? `<a class="more-link" href="${plink(sorted[(i - 1 + sorted.length) % sorted.length].name)}">← ${esc(sorted[(i - 1 + sorted.length) % sorted.length].name)}</a><a class="more-link" href="${plink(sorted[(i + 1) % sorted.length].name)}">${esc(sorted[(i + 1) % sorted.length].name)} →</a>` : "");
    });
  },

  stats(){
    onUpdate(() => {
      const d = App.stats?.updated ? new Date(App.stats.updated) : null;
      set("statsInfo", players().length ? `Stand: ${d ? d.toLocaleString("de-DE",{dateStyle:"medium",timeStyle:"short"}) : "unbekannt"}. Klick auf einen Spieler für sein Profil.` : "Noch keine Welt-Stats geladen.");
      boardTabs(); boardInto(); recordsInto("records");
      // Vergleich
      const a = $("cmpA"), b = $("cmpB"), ps = [...players()].sort((x,y) => x.name.localeCompare(y.name));
      if (ps.length < 2) { set("cmp", empty("Für den Vergleich braucht es mindestens zwei Spieler.")); return; }
      const va = a.value, vb = b.value;
      const opts = ps.map(p => `<option value="${esc(p.uuid)}">${esc(p.name)}</option>`).join("");
      a.innerHTML = opts; b.innerHTML = opts;
      a.value = va || ps[0].uuid; b.value = vb || ps[1].uuid;
      cmp();
    });
    function cmp(){
      const A = players().find(p => p.uuid === $("cmpA").value), B = players().find(p => p.uuid === $("cmpB").value);
      if (!A || !B) return;
      let wa = 0, wb = 0;
      const rows = GROUPS.map(g => `<tr class="grp"><td colspan="3">${g}</td></tr>` + STATS.filter(s => s.g === g).map(s => {
        const x = val(A, s.key), y = val(B, s.key); const good = s.key === "deaths" || s.key === "taken" ? -1 : 1;
        const winA = (x - y) * good > 0, winB = (y - x) * good > 0; wa += winA; wb += winB;
        return `<tr><td>${s.label}</td><td class="${winA ? "win" : ""}">${s.fmt(x)}</td><td class="${winB ? "win" : ""}">${s.fmt(y)}</td></tr>`; }).join("")).join("");
      set("cmp", `<div class="cmp-wrap"><table class="cmp"><thead><tr><th></th><th>${esc(A.name)}</th><th>${esc(B.name)}</th></tr></thead><tbody>
        <tr><td>Gewonnene Kategorien</td><td class="${wa > wb ? "win" : ""}">${wa}</td><td class="${wb > wa ? "win" : ""}">${wb}</td></tr>${rows}</tbody></table></div>`);
    }
    $("cmpA").addEventListener("change", cmp); $("cmpB").addEventListener("change", cmp);
  },

  tode(){
    onUpdate(() => {
      deathFeedInto("deathFeed", 50); causesInto("causes"); shameInto("shame", 10);
      const by = {}; deaths().forEach(d => by[d.p] = (by[d.p] || 0) + 1);
      const list = Object.entries(by).sort((a,b) => b[1]-a[1]);
      set("deathRank", list.length ? list.map(([n, c], i) => `<a class="row" href="${plink(n)}" style="text-decoration:none"><span class="rk">${i+1}</span><img alt="" src="${head(n)}"><div class="nm">${esc(n)}</div><span class="val">${c} Tode</span></a>`).join("") : `<p class="muted small">Noch keine Daten.</p>`);
    });
  },

  aktivitaet(){
    onUpdate(() => { timelineInto(); seenInto("seen"); heatInto("heat"); chatInto("chatBox", 300); });
  },

  karte(){
    loadContent("projekte").then(places => {
      mapInto("map", { places });
      set("legend", `<span><i class="phead" style="width:16px!important;height:16px!important;display:inline-block;border-width:1px"></i>Spieler</span><span><i class="spawnmark" style="display:inline-block;width:10px!important;height:10px!important"></i>Spawn</span><span><i class="pin" style="display:inline-block;background:#f2c14e"></i>Projekt im Bau</span><span><i class="pin" style="display:inline-block;background:#6fbf3f"></i>Projekt fertig</span><span><i class="pin" style="display:inline-block;background:#5a7bd8"></i>Ort</span>`);
    });
  },

  bingo(){ $("bingoPlayer").addEventListener("change", bingoInto); onUpdate(bingoInto); },

  events(){
    loadContent("events").then(list => {
      const all = list.map(e => ({ ...e, d: new Date(String(e.datum).replace(" ", "T")) })).filter(e => !isNaN(e.d)).sort((a,b) => a.d - b.d);
      const draw = () => {
        const now = new Date();
        const up = all.filter(e => e.d > now - 3 * 36e5), past = all.filter(e => e.d <= now - 3 * 36e5).reverse();
        const card = (e, isPast) => `<article class="event${isPast ? " past" : e.d - now < 864e5 ? " soon" : ""}"><div class="date"><span>${e.d.toLocaleDateString("de-DE", { weekday: "short" })}</span><b>${e.d.getDate()}</b><span>${e.d.toLocaleDateString("de-DE", { month: "short" })}</span></div>
          <div style="min-width:0"><h3>${esc(e.titel)}</h3><div class="small muted">${e.d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr${e.ort ? " · " + esc(e.ort) : ""}${isPast ? "" : ` · <span class="countdown" style="font-size:.9rem">${countdown(e.d)}</span>`}</div>
          ${e.text ? `<p>${esc(e.text)}</p>` : ""}${(e.wer || []).length ? `<div class="heads" style="display:flex;gap:4px;margin-top:8px">${e.wer.map(n => `<a href="${plink(n)}" title="${esc(n)}"><img alt="${esc(n)}" src="${head(n)}" style="width:26px;height:26px;border-radius:3px;image-rendering:pixelated"></a>`).join("")}</div>` : ""}</div></article>`;
        set("upcoming", up.length ? up.map(e => card(e)).join("") : empty("Gerade ist kein Event geplant.", "Neue Events tragt ihr in content/events.json ein – Anleitung unten."));
        set("past", past.length ? past.map(e => card(e, true)).join("") : `<p class="muted small">Noch keine vergangenen Events.</p>`);
      };
      draw(); setInterval(draw, 1000);
    });
  },

  galerie(){
    loadContent("galerie").then(list => {
      if (!list.length) { set("gallery", empty("Noch keine Bilder in der Galerie.", "Bilder in den Ordner content/galerie hochladen und in content/galerie.json eintragen – Anleitung unten.")); $("gallery").style.columns = "auto"; return; }
      set("gallery", list.slice().reverse().map((g, i) => `<figure data-i="${list.length - 1 - i}"><img loading="lazy" src="${esc(g.bild)}" alt="${esc(g.titel || "Screenshot")}"><figcaption><b>${esc(g.titel || "")}</b><span>${[g.von, g.datum].filter(Boolean).map(esc).join(" · ")}</span></figcaption></figure>`).join(""));
      $("gallery").querySelectorAll("figure").forEach(f => f.onclick = () => { const g = list[f.dataset.i]; $("lbImg").src = g.bild; $("lbImg").alt = g.titel || ""; set("lbText", esc([g.titel, g.von, g.datum].filter(Boolean).join(" · "))); $("lightbox").showModal(); });
      $("lbClose").onclick = () => $("lightbox").close();
      $("lightbox").addEventListener("click", e => { if (e.target === $("lightbox")) $("lightbox").close(); });
    });
  },

  projekte(){
    let filter = "alle";
    loadContent("projekte").then(list => {
      const draw = () => {
        set("filters", [["alle","Alle"],["projekt","Projekte"],["ort","Orte"]].map(([k,l]) => `<button type="button" data-f="${k}" aria-pressed="${k === filter}">${l}</button>`).join(""));
        $("filters").querySelectorAll("button").forEach(b => b.onclick = () => { filter = b.dataset.f; draw(); });
        const shown = list.filter(p => filter === "alle" || (p.typ || "projekt") === filter);
        set("projects", shown.length ? shown.map(p => {
          const st = (p.typ === "ort") ? ["ort", "Ort"] : p.status === "fertig" ? ["fertig", "Fertig"] : p.status === "im Bau" ? ["bau", "Im Bau"] : ["", p.status || "Geplant"];
          const coords = p.x != null ? `${p.x} / ${p.y ?? "?"} / ${p.z}` : "";
          return `<article class="project">${p.bild ? `<img class="cover" loading="lazy" src="${esc(p.bild)}" alt="">` : ""}<div class="in"><span class="status ${st[0]}">${st[1]}</span><h3>${esc(p.name)}</h3>
            ${p.text ? `<p class="muted" style="margin:0">${esc(p.text)}</p>` : ""}${coords ? `<code>${DIM[p.dimension] || "Overworld"} · ${coords}</code>` : ""}
            ${(p.von || []).length ? `<div class="who">${p.von.map(n => `<a href="${plink(n)}" title="${esc(n)}"><img alt="${esc(n)}" src="${head(n)}"></a>`).join("")}</div>` : ""}
            ${coords && (!p.dimension || p.dimension === "overworld") ? `<a class="more-link" href="karte.html?x=${p.x}&z=${p.z}">Auf der Karte zeigen →</a>` : ""}</div></article>`;
        }).join("") : empty("Noch nichts eingetragen.", "Projekte und Orte tragt ihr in content/projekte.json ein – Anleitung unten.", true));
      };
      draw();
    });
  },

  erfolge(){
    onUpdate(() => {
      const ps = players();
      set("badgeAll", ps.length ? BADGES.map(([id, name, desc, color]) => {
        const who = ps.filter(p => badgesOf(p).find(b => b.id === id).has);
        return `<div class="adv"><div style="display:flex;gap:12px;align-items:center">${badgeHtml({ name, desc, color, has: who.length > 0 })}</div><div class="who">${who.map(p => `<a href="${plink(p.name)}" title="${esc(p.name)}"><img alt="${esc(p.name)}" src="${head(p.name)}"></a>`).join("") || `<span class="small muted">noch niemand</span>`}</div></div>`;
      }).join("") : empty("Noch keine Spieler."));
      const rank = ps.map(p => [p, advDone(p).length]).sort((a,b) => b[1] - a[1]);
      set("advRank", rank.length ? rank.map(([p, n], i) => `<a class="row" href="${plink(p.name)}" style="text-decoration:none"><span class="rk">${i+1}</span><img alt="" src="${head(p.name)}"><div class="nm">${esc(p.name)}</div><span class="val">${n}</span></a>`).join("") : `<p class="muted small">Noch keine Daten.</p>`);
      const all = {};
      for (const p of ps) for (const [id, t] of advDone(p)) (all[id] ||= []).push([p.name, t]);
      const ids = Object.keys(all).sort((a,b) => { const ta = all[a].map(x => x[1]).sort().pop() || "", tb = all[b].map(x => x[1]).sort().pop() || ""; return tb.localeCompare(ta); });
      set("advAll", ids.length ? ids.map(id => { const who = all[id].sort((a,b) => String(a[1]).localeCompare(String(b[1])));
        return `<div class="adv"><div><div class="cat">${advCat(id)}</div><div class="nm">${esc(advName(id))}</div><div class="small muted">Zuerst: ${esc(who[0][0])}${who[0][1] ? " · " + when(who[0][1]) : ""}</div></div>
          <div class="who">${who.map(([n], i) => `<a href="${plink(n)}" title="${esc(n)}"><img class="${i === 0 ? "first" : ""}" alt="${esc(n)}" src="${head(n)}"></a>`).join("")}</div></div>`; }).join("")
        : empty("Noch keine Fortschritte erfasst.", "Kommt mit dem nächsten Abgleich."));
    });
  },

  archiv(){
    downloadsInto("dlList");
    onUpdate(() => {
      const ss = App.stats?.seasons || [], cur = App.stats?.season;
      set("seasons", (cur ? `<div class="panel season" style="border-color:var(--grass-deep)"><span class="eyebrow">Läuft gerade</span><h3>Staffel ${cur.n}</h3><p class="muted small" style="margin:6px 0 0">seit ${fmtDate(cur.from)} · ${players().length} Spieler · ${N(sum("play")/72000)} Stunden</p></div>` : "") +
        ss.slice().reverse().map(s => { const top = [...s.players].sort((a,b) => (b.play||0) - (a.play||0)).slice(0, 3);
          return `<div class="panel season"><span class="eyebrow" style="color:var(--muted)">Archiv</span><h3>${esc(s.name)}</h3><p class="muted small" style="margin:6px 0 0">${fmtDate(s.from)} – ${fmtDate(s.to)} · ${s.players.length} Spieler · ${N(s.players.reduce((a,p) => a + (p.play||0), 0) / 72000)} Stunden</p>
            <ol>${top.map(p => `<li>${esc(p.name)} · ${H(p.play||0)}</li>`).join("")}</ol><a class="btn" style="display:inline-block;margin-top:12px" href="stats.html">Zu den Bestenlisten</a></div>`; }).join("") ||
        empty("Noch keine Daten."));
    });
  },

  discord(){
    const D = CONFIG.discord || {};
    set("dJoin", D.invite
      ? `<a class="btn" href="${esc(D.invite)}" target="_blank" rel="noopener" style="font-size:1.1rem;padding:14px 22px;display:inline-block">Discord beitreten</a><p class="small muted" style="margin:10px 0 0">Oder diesen Link teilen: <code>${esc(D.invite)}</code></p>`
      : `<p class="muted" style="margin:0">Der Einladungslink wird gerade eingerichtet. Frag einen Admin nach dem Link.</p>`);
    if (!D.serverId) { set("dLive", empty("Live-Anzeige noch nicht eingerichtet.", "Ein Admin muss in Discord das Server-Widget einschalten und die Server-ID eintragen – Anleitung unten.")); return; }
    async function load(){
      try {
        const r = await fetch(`https://discord.com/api/guilds/${encodeURIComponent(D.serverId)}/widget.json`, { cache: "no-store" });
        if (!r.ok) throw r.status;
        const w = await r.json();
        const members = w.members || [];
        const inVoice = members.filter(m => m.channel_id);
        const voice = (w.channels || []).map(c => ({ ...c, who: inVoice.filter(m => m.channel_id === c.id) }));
        const dot = st => `<span style="width:10px;height:10px;border-radius:50%;flex:none;background:${st === "online" ? "var(--grass)" : st === "idle" ? "var(--gold)" : st === "dnd" ? "var(--red)" : "var(--muted)"}"></span>`;
        set("dLive", `<div class="tiles" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
            <div class="tile main"><span class="k">Online im Discord</span><span class="v">${w.presence_count ?? members.length}</span><span class="s">${esc(w.name || "")}</span></div>
            <div class="tile"><span class="k">In Sprachkanälen</span><span class="v">${inVoice.length}</span><span class="s">gerade am Reden</span></div></div>
          <div class="two" style="margin-top:16px">
            <div class="panel"><h3 class="sub">Sprachkanäle</h3><div class="feed">${voice.length ? voice.map(c => `<div class="fi" style="grid-template-columns:minmax(0,1fr) auto"><span class="tx"><b>🔊 ${esc(c.name)}</b>${c.who.length ? `<br><span class="small muted">${c.who.map(m => esc(m.username)).join(", ")}</span>` : ""}</span><span class="tm">${c.who.length} drin</span></div>`).join("") : `<p class="muted small">Keine öffentlichen Sprachkanäle.</p>`}</div></div>
            <div class="panel"><h3 class="sub">Gerade online</h3><div class="feed">${members.length ? members.slice(0, 60).map(m => `<div class="fi"><img alt="" loading="lazy" src="${esc(m.avatar_url || "")}" style="border-radius:50%"><span class="tx"><b>${esc(m.username)}</b>${m.game?.name ? `<br><span class="small muted">spielt ${esc(m.game.name)}</span>` : ""}</span>${dot(m.status)}</div>`).join("") : `<p class="muted small">Gerade ist niemand online.</p>`}</div></div>
          </div><p class="updated" style="margin:10px 0 0">Aktualisiert um ${new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} · Discord zeigt hier höchstens 100 Mitglieder</p>`);
      } catch (e) {
        set("dLive", empty("Discord-Daten gerade nicht erreichbar.", e === 403 ? "Das Server-Widget ist in Discord ausgeschaltet. Ein Admin muss es unter Servereinstellungen → Widget einschalten." : "Bitte die Seite gleich nochmal laden."));
      }
    }
    load(); setInterval(load, 60000);
  },

  infos(){
    loadContent("infos", {}).then(info => {
      const rules = info.regeln || [];
      set("rules", rules.length ? rules.map(r => `<li><span>${esc(r)}</span></li>`).join("") : `<li><span class="muted">Noch keine Regeln eingetragen. Das geht in <code>content/infos.json</code>.</span></li>`);
      if (info.text) set("about", esc(info.text));
    });
    onUpdate(() => {
      set("iVersion", `${CONFIG.software} ${CONFIG.version}${App.live.version ? ` (meldet: ${esc(App.live.version)})` : ""}`);
      if (App.live.motd) set("iMotd", esc(App.live.motd));
      set("worldbar", worldHtml());
      const mods = App.stats?.mods || [];
      set("mods", mods.length ? mods.map(m => `<li>${esc(m.replace(/\.jar$/, ""))}</li>`).join("") : `<li class="muted">Noch keine Liste. Kommt mit dem nächsten Abgleich.</li>`);
    });
  }
};
function countdown(d){
  const s = Math.max(0, Math.floor((d - new Date()) / 1000));
  if (!s) return "läuft gerade";
  const t = Math.floor(s / 86400), h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60, sec = s % 60;
  return `noch ${t ? t + " T " : ""}${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}

/* ---------- Start ---------- */
buildChrome();
PAGE_INIT[document.body.dataset.page]?.();
loadStats();
refreshLive();
setInterval(refreshLive, CONFIG.refreshSeconds * 1000);
setInterval(loadStats, 90 * 1000);
