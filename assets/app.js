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
  ["aktivitaet.html", "Aktivität", 1], ["bingo.html", "Bingo", 1], ["casino.html", "Casino", 1], ["wrapped.html", "Wrapped", 1], ["discord.html", "Discord", 1],
  ["galerie.html", "Galerie", 0], ["projekte.html", "Projekte & Orte", 0], ["erfolge.html", "Erfolge", 0], ["archiv.html", "Archiv & Downloads", 0], ["infos.html", "Infos & Regeln", 0]
];

/* ---------- Helfer ---------- */
const $ = id => document.getElementById(id);
const addr = CONFIG.host;                          // angezeigte Adresse
const fullAddr = `${CONFIG.host}:${CONFIG.port}`;   // für die Live-Abfrage
const nf = new Intl.NumberFormat("de-DE");
const nf1 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
// Skins: aktuelle Skin-Kennung direkt von Mojang (über die Automatik), angezeigt über mc-heads.net.
// Die Kennung ändert sich mit jedem neuen Skin, dadurch gibt es keine alten Skins aus dem Zwischenspeicher.
const skinKey = n => {
  const p = (App.stats?.players || []).find(x => x.name.toLowerCase() === String(n).toLowerCase());
  return (p && App.stats?.skins?.[p.uuid]?.tex) || (p && p.uuid.replace(/-/g, "")) || encodeURIComponent(n);
};
const head = n => `https://mc-heads.net/avatar/${skinKey(n)}/64`;
const body = n => `https://mc-heads.net/body/${skinKey(n)}/120`;
// Bild nicht ladbar? Einmal mit dem Namen erneut versuchen, sonst ein neutraler Platzhalter statt eines unsichtbaren Bildes
const SKIN_FALLBACK = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges"><rect width="8" height="8" fill="#6b4a33"/><rect y="3" width="8" height="5" fill="#c8946a"/><rect x="1" y="4" width="2" height="1" fill="#fff"/><rect x="5" y="4" width="2" height="1" fill="#fff"/><rect x="2" y="4" width="1" height="1" fill="#3b2a7a"/><rect x="5" y="4" width="1" height="1" fill="#3b2a7a"/><rect x="3" y="6" width="2" height="1" fill="#8a5a3c"/></svg>');
document.addEventListener("error", e => {
  const img = e.target;
  if (img.tagName !== "IMG" || !img.src.includes("mc-heads.net")) return;
  const tries = +(img.dataset.tries || 0);
  img.dataset.tries = tries + 1;
  if (tries === 0) { const name = img.closest("[data-name]")?.dataset.name || img.alt.replace(/^Skin von /, ""); if (name) { img.src = img.src.replace(/\/(avatar|body)\/[^/]+/, (m, t) => `/${t}/${encodeURIComponent(name)}`); return; } }
  img.src = SKIN_FALLBACK;
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
    <p>Live-Daten über api.mcsrvstat.us, Skins über mc-heads.net, Item-Bilder über minecraft.wiki. Kein offizielles Minecraft-Produkt. Nicht von Mojang oder Microsoft genehmigt und nicht mit Mojang oder Microsoft verbunden.</p>
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
    const r = await fetch(`https://api.mcsrvstat.us/3/${fullAddr}`, { cache: "no-store" });
    const d = await r.json();
    return { online: !!d.online, count: d.players?.online ?? 0, max: d.players?.max ?? 0,
      players: (d.players?.list || []).map(p => p.name).filter(Boolean), version: d.version || "", motd: (d.motd?.clean || []).join("\n") };
  } catch (e) {}
  const r = await fetch(`https://api.mcstatus.io/v2/status/java/${fullAddr}`, { cache: "no-store" });
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
const advName = id => App.stats?.advNames?.[id]?.t || id.split("/").pop().split("_").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
const advDesc = id => App.stats?.advNames?.[id]?.d || "";
const advCat = id => ADV_CAT[id.split("/")[0]] || id.split("/")[0];


/* ---------- Verlauf, Erzfeind, Was-wäre-wenn ---------- */
const ENT_FALLBACK = id => (MOB[Object.keys(MOB).find(k => k.toLowerCase().replace(/ /g, "_") === id)] || [id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())])[0];
const entName = id => App.stats?.advNames?._ent?.[id] || ENT_FALLBACK(id);
const hIndex = k => (App.stats?.hkeys || []).indexOf(k);
const hDays = () => Object.keys(App.stats?.history || {}).sort();
// Stand eines Spielers zu Beginn eines Tages (letzter Schnappschuss davor), oder null
function valueAt(p, k, day){
  const i = hIndex(k); if (i < 0) return null;
  const ds = hDays().filter(d => d < day);
  for (let j = ds.length - 1; j >= 0; j--) { const v = App.stats.history[ds[j]]?.[p.uuid]; if (v) return v[i]; }
  return null;
}
function firstValue(p, k){ const i = hIndex(k); for (const d of hDays()) { const v = App.stats.history[d]?.[p.uuid]; if (v) return v[i]; } return null; }
const monthStart = (off = 0) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + off); return ymd(d); };
const MONTHS = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
// Zeitraum: "month" (dieser Monat), "last" (letzter Monat), "all"
function periodRange(per){
  if (per === "month") return { from: monthStart(0), to: null, label: MONTHS[new Date().getMonth()] };
  if (per === "last") { const d = new Date(); d.setMonth(d.getMonth() - 1); return { from: monthStart(-1), to: monthStart(0), label: MONTHS[d.getMonth()] }; }
  return { from: null, to: null, label: "Insgesamt" };
}
function periodValue(p, k, per){
  const r = periodRange(per);
  if (!r.from) return { v: val(p, k), partial: false };
  const end = r.to ? valueAt(p, k, r.to) : (p[k] || 0);
  const start = valueAt(p, k, r.from);
  // Für diesen Zeitraum gibt es noch keinen gespeicherten Anfangsstand: Gesamtwert zeigen
  if (start == null || end == null) return { v: val(p, k), partial: true };
  return { v: Math.max(0, end - start), partial: false };
}
const inRange = (t, per) => { const r = periodRange(per); const d = t.slice(0, 10); return (!r.from || d >= r.from) && (!r.to || d < r.to); };
function funFacts(T){
  const out = [];
  const km = T.dist / 100000, h = T.play / 72000, jumpsM = T.jumps * 1.25, blocks = T.mined;
  if (km > 0) {
    if (km >= 384400) out.push(["🌕", `${nf1.format(km / 384400)}× bis zum Mond`, `${N(km)} km gelaufen, geflogen und geschwommen`]);
    else if (km >= 40075) out.push(["🌍", `${nf1.format(km / 40075)}× um die ganze Erde`, `${N(km)} km zurückgelegt`]);
    else if (km >= 20) out.push(["🗺️", km >= 2000 ? `${nf1.format(km / 2000)}× von Bremen nach Istanbul` : `${nf.format(Math.round(km / 2000 * 100))} % der Strecke Bremen–Istanbul`, `${N(km)} km zurückgelegt (Luftlinie ca. 2.000 km)`]);
    else out.push(["🗺️", `${nf1.format(km)} km unterwegs`, `das sind ${N(km * 1000 / 105)} Fußballfelder hintereinander`]);
  }
  if (h > 0) out.push(["⚽", `${N(h * 60 / 90)} Fußballspiele lang`, `${N(h)} Stunden gespielt, das sind ${nf1.format(h / 24)} Tage am Stück`]);
  if (T.mobs > 0) out.push(["🏟️", T.mobs >= 47000 ? `${nf1.format(T.mobs / 47000)}× das Şükrü-Saracoğlu-Stadion voll` : `${nf.format(Math.round(T.mobs / 47000 * 100))} % vom Şükrü-Saracoğlu-Stadion`, `${N(T.mobs)} Mobs besiegt (Stadion: ca. 47.000 Plätze)`]);
  if (blocks >= 250) out.push(["🏊", `${nf1.format(blocks / 2500)} Olympia-Schwimmbecken`, `${N(blocks)} Blöcke abgebaut, jeder Block ist 1 m³`]);
  if (jumpsM > 0) out.push(["🗼", jumpsM >= 8849 ? `${nf1.format(jumpsM / 8849)}× auf den Mount Everest` : `${nf1.format(jumpsM / 330)}× auf den Eiffelturm`, `${N(T.jumps)} Sprünge à 1,25 m`]);
  if (T.deaths > 0) out.push(["💀", `${N(T.deaths)} Leben verbraucht`, T.deaths >= 100 ? "Mehr als 100 Mal neu gespawnt" : "und trotzdem immer weitergemacht"]);
  if (T.fish > 0) out.push(["🐟", `${N(T.fish)} Fische geangelt`, `genug für ${N(T.fish * 2)} Portionen Fischbrötchen`]);
  return out;
}

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


/* Verlaufs-Diagramm (SVG) */
const LINE_COLORS = ["#6fbf3f", "#f2c14e", "#5a9bff", "#ef5b5b", "#c58bff", "#3fd3c8", "#ff9f43", "#e0e0e0"];
const CH_METRICS = [["play", "Spielzeit", v => v / 72000, "h"], ["mined", "Blöcke abgebaut", v => v, ""], ["mobs", "Mobs getötet", v => v, ""], ["deaths", "Tode", v => v, ""], ["dist", "Strecke", v => v / 100000, "km"], ["diamond", "Diamanterz", v => v, ""]];
let chMetric = "play", chMode = "day";
function chartInto(){
  const box = $("chart"); if (!box) return;
  const days = hDays().slice(-30);
  set("chMetric", CH_METRICS.map(([k, l]) => `<option value="${k}">${l}</option>`).join("")); $("chMetric").value = chMetric;
  $("chMetric").onchange = e => { chMetric = e.target.value; chartInto(); };
  set("chMode", [["day", "Pro Tag"], ["sum", "Insgesamt"]].map(([k, l]) => `<button type="button" data-m="${k}" aria-pressed="${k === chMode}">${l}</button>`).join(""));
  $("chMode").querySelectorAll("button").forEach(b => b.onclick = () => { chMode = b.dataset.m; chartInto(); });
  if (days.length < 2) { box.innerHTML = empty("Das Diagramm füllt sich ab morgen.", "Jeden Tag wird ein Stand gespeichert. Ab dem zweiten Tag siehst du hier den Verlauf."); set("chLegend", ""); return; }
  const [key, , conv, unit] = CH_METRICS.find(m => m[0] === chMetric), i = hIndex(key);
  const allDays = hDays(), series = players().map((p, n) => {
    const pts = days.map(d => { const v = App.stats.history[d]?.[p.uuid]; if (!v) return null;
      if (chMode === "sum") return conv(v[i]);
      const prevDay = allDays[allDays.indexOf(d) - 1], pv = prevDay && App.stats.history[prevDay]?.[p.uuid];
      return pv ? Math.max(0, conv(v[i] - pv[i])) : null; });
    return { p, pts, color: LINE_COLORS[n % LINE_COLORS.length] };
  }).filter(s => s.pts.some(v => v != null && v > 0));
  const W = 800, Hh = 300, L = 54, R = 16, T = 14, B = 34;
  const maxV = Math.max(1, ...series.flatMap(s => s.pts.filter(v => v != null)));
  const nice = (() => { const m = Math.pow(10, Math.floor(Math.log10(maxV))); return Math.ceil(maxV / m) * m; })();
  const x = j => L + (W - L - R) * (j / (days.length - 1)), y = v => T + (Hh - T - B) * (1 - v / nice);
  const fmt = v => (v >= 100 ? N(v) : nf1.format(v)) + (unit ? " " + unit : "");
  let g = "";
  for (let k = 0; k <= 4; k++) { const v = nice * k / 4; g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--muted)">${fmt(v)}</text>`; }
  const step = Math.max(1, Math.ceil(days.length / 8));
  days.forEach((d, j) => { if ((j % step === 0 && days.length - 1 - j >= step / 2) || j === days.length - 1) g += `<text x="${x(j)}" y="${Hh - 10}" text-anchor="middle" font-size="11" fill="var(--muted)">${d.slice(8, 10)}.${d.slice(5, 7)}.</text>`; });
  for (const s of series) {
    const segs = []; let cur = [];
    s.pts.forEach((v, j) => { if (v == null) { if (cur.length) segs.push(cur); cur = []; } else cur.push(`${x(j).toFixed(1)},${y(v).toFixed(1)}`); });
    if (cur.length) segs.push(cur);
    g += segs.map(c => `<polyline points="${c.join(" ")}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`).join("");
    const lastJ = s.pts.map((v, j) => v != null ? j : -1).filter(j => j >= 0).pop();
    if (lastJ != null) g += `<circle cx="${x(lastJ)}" cy="${y(s.pts[lastJ])}" r="4" fill="${s.color}"><title>${esc(s.p.name)}: ${fmt(s.pts[lastJ])}</title></circle>`;
  }
  box.innerHTML = `<div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Verlauf ${esc(chMetric)}" style="width:100%;min-width:520px;height:auto;display:block">${g}</svg></div>`;
  set("chLegend", series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.p.name)}</span>`).join("") || `<span class="muted">Noch keine Werte in diesem Zeitraum.</span>`);
}
function factsInto(id){
  const T = { dist: sum("dist"), play: sum("play"), jumps: sum("jumps"), mined: sum("mined"), mobs: sum("mobs"), deaths: sum("deaths"), fish: sum("fish") };
  set(id, players().length ? funFacts(T).map(f => `<div class="fact"><b>${esc(f[1])}</b><span>${esc(f[2])}</span></div>`).join("") : empty("Kommt mit dem nächsten Abgleich."));
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
  const get = async u => { const r = await fetch(u, { cache: "no-cache" }); if (!r.ok) throw 0; return r.json(); };
  let list = null;
  try { list = await get("downloads.json?" + Date.now()); } catch {}
  if (!Array.isArray(list)) try { list = await get(`https://api.github.com/repos/${CONFIG.github}/releases?per_page=20`); } catch {}
  if (!Array.isArray(list)) { box.innerHTML = empty("Downloads gerade nicht erreichbar.", `Du findest alle Sicherungen auch direkt hier: <a href="https://github.com/${CONFIG.github}/releases">GitHub-Downloads</a>`); return; }
  const isPart = n => /\.(zip|z\d+|7z|7z\.\d+)$/.test(n);
  const rel = list.filter(x => !x.draft && x.assets?.some(a => isPart(a.name)));
  if (!rel.length) { box.innerHTML = empty("Noch keine Welt hochgeladen.", "Die erste Sicherung erscheint hier automatisch am Sonntag."); return; }
  const fmt = n => { const mb = n / 1048576; return mb >= 1024 ? nf1.format(mb / 1024) + " GB" : nf.format(Math.round(mb)) + " MB"; };
  box.innerHTML = rel.map((x, i) => {
    const parts = x.assets.filter(a => isPart(a.name)).sort((a, b) => (a.name.endsWith(".zip") - b.name.endsWith(".zip")) || a.name.localeCompare(b.name));
    const size = parts.reduce((s, a) => s + a.size, 0), dl = Math.max(...parts.map(a => a.download_count || 0)), multi = parts.length > 1;
    const sevenZ = parts.some(a => /\.7z/.test(a.name));
    const hint = multi ? `Alle Teile in denselben Ordner laden, dann den ersten Teil mit 7-Zip entpacken.` : sevenZ ? `Eine <code>.7z</code>-Datei: Unter Windows 11 Rechtsklick → „Alle extrahieren“, sonst mit 7-Zip.` : "";
    return `<div class="dl-item${i === 0 ? " latest" : ""}"${i > 2 ? ' style="display:none" data-old' : ""}><span class="ico" aria-hidden="true"></span><div style="min-width:0"><h3>${esc(x.name || x.tag_name)}${i === 0 ? '<span class="tag">Neueste</span>' : ""}</h3>
      <div class="meta">${new Date(x.published_at || x.created_at).toLocaleDateString("de-DE", { dateStyle: "long" })} · ${fmt(size)} · ${nf.format(dl)}× geladen${multi ? ` · ${parts.length} Teile` : ""}</div>
      ${hint ? `<p class="small muted" style="margin:6px 0 0">${hint}</p>` : ""}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end">${parts.map((a, k) => `<a class="btn" href="${esc(a.browser_download_url)}">${multi ? `Teil ${k + 1} (${fmt(a.size)})` : "Welt herunterladen"}</a>`).join("")}</div></div>`;
  }).join("") + (rel.length > 3 ? `<button type="button" class="g-btn ghost" onclick="this.remove();document.querySelectorAll('[data-old]').forEach(e=>e.style.display='')">Ältere Sicherungen zeigen</button>` : "");
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

/* ---------- Marktplatz (aus dem Chat: !biete / !suche / !weg) ---------- */
function marktInto(){
  const el = $("marktList"); if (!el || !App.stats) return;
  const MAX = 14 * 864e5, now = Date.now(), offers = [];
  for (const e of App.events) {
    if (e[1] !== "c") continue;
    const m = String(e[3] || "").trim().match(/^!(biete|suche|weg)\b\s*(.*)$/i);
    if (!m) continue;
    const kind = m[1].toLowerCase(), t = new Date(e[0]).getTime();
    if (kind === "weg") { for (const o of offers) if (o.p === e[2]) o.gone = true; continue; }
    if (m[2]) offers.push({ p: e[2], kind, text: m[2], t });
  }
  const filter = $("marktFilter")?.value || "alle";
  const list = offers.filter(o => !o.gone && now - o.t < MAX && (filter === "alle" || o.kind === filter)).reverse();
  const when = t => { const h = Math.round((now - t) / 36e5); return h < 1 ? "gerade eben" : h < 24 ? `vor ${h} Std.` : `vor ${Math.round(h / 24)} Tagen`; };
  el.innerHTML = list.length ? list.map(o => `<div class="markt-card ${o.kind}">
      <span class="markt-tag">${o.kind === "biete" ? "Biete" : "Suche"}</span>
      <p class="markt-text">${esc(o.text)}</p>
      <div class="markt-who"><img src="${head(o.p)}" alt="" width="28" height="28"><b>${esc(o.p)}</b><span class="small muted">${when(o.t)}</span></div>
    </div>`).join("") : `<p class="muted">Gerade gibt es keine Angebote. Schreib im Spiel zum Beispiel <code>!biete 64 Eisen für 3 Diamanten</code>.</p>`;
}

/* ---------- Marktplatz: Angebot zusammenklicken ---------- */
const MARKT_TOP = ["diamond","iron_ingot","gold_ingot","emerald","netherite_ingot","netherite_scrap","ancient_debris","coal","redstone","lapis_lazuli","copper_ingot","quartz","amethyst_shard","diamond_block","iron_block","gold_block","emerald_block","elytra","totem_of_undying","enchanted_golden_apple","golden_apple","golden_carrot","cooked_beef","bread","experience_bottle","enchanted_book","shulker_box","shulker_shell","ender_pearl","blaze_rod","slime_ball","gunpowder","string","leather","bone","arrow","trident","mending","netherite_sword","netherite_pickaxe","diamond_sword","diamond_pickaxe","diamond_axe","diamond_chestplate","beacon","nether_star","oak_log","spruce_log","stone","cobblestone","deepslate","glass","obsidian","sand","dirt","oak_planks","white_wool","sugar_cane","wheat","carrot","potato","saddle","name_tag","trial_key","heavy_core","mace"];
const MARKT_DE = {diamond:"Diamant",iron_ingot:"Eisenbarren",gold_ingot:"Goldbarren",emerald:"Smaragd",netherite_ingot:"Netheritbarren",netherite_scrap:"Netheritplatten",ancient_debris:"Antiker Schutt",coal:"Kohle",redstone:"Redstone-Staub",lapis_lazuli:"Lapislazuli",copper_ingot:"Kupferbarren",quartz:"Netherquarz",amethyst_shard:"Amethystscherbe",diamond_block:"Diamantblock",iron_block:"Eisenblock",gold_block:"Goldblock",emerald_block:"Smaragdblock",elytra:"Elytren",totem_of_undying:"Totem der Unsterblichkeit",enchanted_golden_apple:"Verzauberter goldener Apfel",golden_apple:"Goldener Apfel",golden_carrot:"Goldene Karotte",cooked_beef:"Steak",bread:"Brot",experience_bottle:"Erfahrungsfläschchen",enchanted_book:"Verzaubertes Buch",shulker_box:"Shulker-Kiste",shulker_shell:"Shulker-Schale",ender_pearl:"Enderperle",blaze_rod:"Lohenrute",slime_ball:"Schleimball",gunpowder:"Schwarzpulver",string:"Faden",leather:"Leder",bone:"Knochen",arrow:"Pfeil",trident:"Dreizack",mending:"Reparatur-Buch",netherite_sword:"Netheritschwert",netherite_pickaxe:"Netheritspitzhacke",diamond_sword:"Diamantschwert",diamond_pickaxe:"Diamantspitzhacke",diamond_axe:"Diamantaxt",diamond_chestplate:"Diamantharnisch",beacon:"Leuchtfeuer",nether_star:"Netherstern",oak_log:"Eichenstamm",spruce_log:"Fichtenstamm",stone:"Stein",cobblestone:"Bruchstein",deepslate:"Tiefenschiefer",glass:"Glas",obsidian:"Obsidian",sand:"Sand",dirt:"Erde",oak_planks:"Eichenholzbretter",white_wool:"Weiße Wolle",sugar_cane:"Zuckerrohr",wheat:"Weizen",carrot:"Karotte",potato:"Kartoffel",saddle:"Sattel",name_tag:"Namensschild",trial_key:"Prüfungsschlüssel",heavy_core:"Schwerer Kern",mace:"Streitkolben",creeper_head:"Creeper-Kopf",tnt:"TNT"};
const deItem = id => App.stats?.advNames?._item?.[id] || MARKT_DE[id] || itemName(id);
function marktItems(){
  const all = Object.keys(App.stats?.advNames?._item || {}).filter(id => !/^(air|cave_air|void_air|.*_wall_.*|potted_.*|.*_stem|moving_piston|piston_head|end_gateway|end_portal|nether_portal|fire|soul_fire|water|lava|bubble_column)$/.test(id));
  return [...new Set([...MARKT_TOP.filter(i => i !== "mending"), ...all])];
}
function marktBuilder(){
  const st = { kind: "biete", give: null, giveN: 1, want: null, wantN: 1, slot: "give" };
  const grid = $("mbGrid"), search = $("mbSearch"), out = $("mbOut");
  const btn = id => `<button type="button" class="mb-item" data-id="${id}" title="${esc(deItem(id))}"><img loading="lazy" alt="" src="${itemImg(id)}" onerror="this.style.visibility='hidden'"><span>${esc(deItem(id))}</span></button>`;
  const drawGrid = () => {
    const q = search.value.trim().toLowerCase();
    const list = marktItems().filter(id => !q || deItem(id).toLowerCase().includes(q) || id.includes(q.replace(/ /g, "_")));
    grid.innerHTML = list.slice(0, q ? 120 : 66).map(btn).join("") || `<p class="muted">Nichts gefunden.</p>`;
  };
  const pick = (which) => { const id = st[which]; return id ? `<img src="${itemImg(id)}" alt=""><b>${esc(deItem(id))}</b>` : `<span class="muted">Item wählen</span>`; };
  const draw = () => {
    document.querySelectorAll(".mb-kind button").forEach(b => b.classList.toggle("on", b.dataset.k === st.kind));
    $("mbGiveLbl").textContent = st.kind === "biete" ? "Ich gebe" : "Ich suche";
    $("mbWantLbl").textContent = st.kind === "biete" ? "Ich will dafür" : "Ich zahle";
    $("mbGive").innerHTML = pick("give"); $("mbWant").innerHTML = pick("want");
    $("mbGive").classList.toggle("on", st.slot === "give"); $("mbWant").classList.toggle("on", st.slot === "want");
    $("mbGiveN").value = st.giveN; $("mbWantN").value = st.wantN;
    const a = st.give ? `${st.giveN} ${deItem(st.give)}` : "";
    const b = st.want ? `${st.wantN} ${deItem(st.want)}` : "";
    const cmd = a ? `!${st.kind} ${a}${b ? (st.kind === "biete" ? " für " : ", zahle ") + b : ""}` : "";
    out.textContent = cmd || "Wähle zuerst ein Item aus.";
    $("mbCopy").disabled = !cmd;
  };
  document.querySelectorAll(".mb-kind button").forEach(b => b.onclick = () => { st.kind = b.dataset.k; draw(); });
  $("mbGive").onclick = () => { st.slot = "give"; draw(); search.focus(); };
  $("mbWant").onclick = () => { st.slot = "want"; draw(); search.focus(); };
  grid.onclick = e => { const b = e.target.closest(".mb-item"); if (!b) return; st[st.slot] = b.dataset.id; if (st.slot === "give") st.slot = "want"; draw(); };
  $("mbGiveN").oninput = e => { st.giveN = Math.max(1, Math.min(9999, +e.target.value || 1)); draw(); };
  $("mbWantN").oninput = e => { st.wantN = Math.max(1, Math.min(9999, +e.target.value || 1)); draw(); };
  document.querySelectorAll(".mb-n button").forEach(b => b.onclick = () => { const k = b.dataset.f; st[k] = b.dataset.v === "64" ? 64 : Math.max(1, st[k] + +b.dataset.v); draw(); });
  $("mbCopy").onclick = async () => { try { await navigator.clipboard.writeText(out.textContent); $("mbCopy").textContent = "Kopiert ✓"; setTimeout(() => $("mbCopy").textContent = "Befehl kopieren", 2000); } catch {} };
  search.oninput = drawGrid;
  drawGrid(); draw();
  onUpdate(() => { drawGrid(); draw(); });
}

/* ---------- Spiele ---------- */
const rnd = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => a.map(x => [Math.random(), x]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
const gameStats = () => STATS.filter(s => players().filter(p => val(p, s.key) > 0).length >= 2);
const best = k => { try { return +localStorage.getItem("mc26_" + k) || 0; } catch { return 0; } };
const saveBest = (k, v) => { try { if (v > best(k)) localStorage.setItem("mc26_" + k, v); } catch {} };
const confetti = () => { for (let i = 0; i < 40; i++) { const c = document.createElement("i"); c.className = "conf"; c.style.left = Math.random() * 100 + "vw"; c.style.background = rnd(["#7bd34f","#f5c542","#5ad1f0","#e2557b","#fff"]); c.style.animationDelay = Math.random() * .4 + "s"; document.body.appendChild(c); setTimeout(() => c.remove(), 2200); } };

function gameHL(){ // Höher oder tiefer
  const el = $("gHL"); let streak = 0, cur = null;
  const next = () => {
    const st = rnd(gameStats()); if (!st) { el.innerHTML = `<p class="muted">Noch zu wenig Daten.</p>`; return; }
    const ps = shuffle(players().filter(p => val(p, st.key) !== undefined)).slice(0, 2);
    if (ps.length < 2) return;
    cur = { st, a: ps[0], b: ps[1] };
    el.innerHTML = `<p class="g-q">Wer hat mehr <b>${esc(st.label)}</b>?</p>
      <div class="g-duo">${ps.map((p, i) => `<button type="button" class="g-pl" data-i="${i}"><img src="${body(p.name)}" alt=""><b>${esc(p.name)}</b><span class="g-val" hidden>${st.fmt(val(p, st.key))}</span></button>`).join(`<span class="g-vs">VS</span>`)}</div>
      <p class="g-score">Serie: <b>${streak}</b> · Rekord: <b>${best("hl")}</b></p>`;
    el.querySelectorAll(".g-pl").forEach(b => b.onclick = () => answer(+b.dataset.i));
  };
  const answer = i => {
    const { st, a, b } = cur, va = val(a, st.key), vb = val(b, st.key);
    const ok = va === vb || (i === 0 ? va > vb : vb > va);
    el.querySelectorAll(".g-pl").forEach((x, j) => { x.disabled = true; x.querySelector(".g-val").hidden = false; x.classList.add((j === 0 ? va >= vb : vb >= va) ? "win" : "lose"); });
    if (ok) { streak++; saveBest("hl", streak); if (streak % 5 === 0) confetti(); setTimeout(next, 1300); }
    else { el.insertAdjacentHTML("beforeend", `<p class="g-msg bad">Falsch! Deine Serie: ${streak}</p><button type="button" class="g-btn" id="hlAgain">Nochmal</button>`); streak = 0; $("hlAgain").onclick = next; }
  };
  next();
}

function gameWho(){ // Wer bin ich + Skin-Rätsel
  const el = $("gWho"); let pts = 0, round = 0;
  const next = () => {
    const ps = players(); if (ps.length < 3) { el.innerHTML = `<p class="muted">Noch zu wenig Spieler.</p>`; return; }
    const p = rnd(ps), mode = Math.random() < .5 ? "stats" : "skin";
    const clues = shuffle(gameStats().filter(s => val(p, s.key) > 0)).slice(0, 3);
    const opts = shuffle([p, ...shuffle(ps.filter(x => x !== p)).slice(0, 3)]);
    el.innerHTML = (mode === "skin"
      ? `<p class="g-q">Wessen Skin ist das?</p><div class="g-pix"><img src="${head(p.name)}" alt="" id="whoImg"></div>`
      : `<p class="g-q">Wer bin ich?</p><ul class="g-clues">${clues.map(s => `<li>${esc(s.label)}: <b>${s.fmt(val(p, s.key))}</b></li>`).join("")}</ul>`)
      + `<div class="g-opts">${opts.map(o => `<button type="button" class="g-btn ghost" data-n="${esc(o.name)}">${esc(o.name)}</button>`).join("")}</div>
      <p class="g-score">Runde ${round + 1}/10 · Punkte: <b>${pts}</b> · Rekord: <b>${best("who")}</b>/10</p>`;
    el.querySelectorAll("[data-n]").forEach(b => b.onclick = () => {
      const ok = b.dataset.n === p.name; if (ok) pts++;
      el.querySelectorAll("[data-n]").forEach(x => { x.disabled = true; if (x.dataset.n === p.name) x.classList.add("win"); else if (x === b) x.classList.add("lose"); });
      const img = $("whoImg"); if (img) img.classList.add("clear");
      round++;
      setTimeout(() => round < 10 ? next() : end(), 1400);
    });
  };
  const end = () => { saveBest("who", pts); if (pts >= 8) confetti();
    el.innerHTML = `<p class="g-big">${pts}/10</p><p class="g-q">${pts >= 9 ? "Du kennst den Server auswendig!" : pts >= 6 ? "Nicht schlecht!" : "Da musst du mehr online sein …"}</p><button type="button" class="g-btn" id="whoAgain">Nochmal spielen</button>`;
    $("whoAgain").onclick = () => { pts = 0; round = 0; next(); }; };
  next();
}

function gameWheel(canvasId, btnId, outId, itemsFn, colors){
  const cv = $(canvasId), ctx = cv.getContext("2d"); let ang = 0, spinning = false;
  const draw = () => {
    const it = itemsFn(), n = it.length, r = cv.width / 2; ctx.clearRect(0, 0, cv.width, cv.width);
    it.forEach((t, i) => {
      const a0 = ang + i * 2 * Math.PI / n, a1 = a0 + 2 * Math.PI / n;
      ctx.beginPath(); ctx.moveTo(r, r); ctx.arc(r, r, r - 4, a0, a1); ctx.fillStyle = colors[i % colors.length]; ctx.fill();
      ctx.save(); ctx.translate(r, r); ctx.rotate((a0 + a1) / 2); ctx.fillStyle = "#14101c"; ctx.font = "700 " + (it.length > 12 ? 20 : 28) + "px Outfit, sans-serif"; ctx.textAlign = "right";
      ctx.fillText(t.length > 22 ? t.slice(0, 21) + "…" : t, r - 16, 5); ctx.restore();
    });
    ctx.beginPath(); ctx.arc(r, r, 18, 0, 7); ctx.fillStyle = "#1c1426"; ctx.fill();
  };
  $(btnId).onclick = () => {
    if (spinning) return; spinning = true; $(outId).textContent = "…";
    const it = itemsFn(), start = ang, target = ang + 8 * Math.PI + Math.random() * 2 * Math.PI, t0 = performance.now(), dur = 3800;
    const step = now => { const k = Math.min(1, (now - t0) / dur); ang = start + (target - start) * (1 - Math.pow(1 - k, 4)); draw();
      if (k < 1) return requestAnimationFrame(step);
      spinning = false; const n = it.length, a = ((-Math.PI / 2 - ang) % (2 * Math.PI) + 4 * Math.PI) % (2 * Math.PI);
      $(outId).textContent = it[Math.floor(a / (2 * Math.PI / n))]; confetti(); };
    requestAnimationFrame(step);
  };
  draw();
  return draw;
}
const CHALLENGES = ["Ohne Rüstung in den Nether","Baue ein Haus in 20 Minuten","Nur Holzwerkzeug für 1 Stunde","Finde 5 Diamanten","Töte 10 Creeper","Zähme ein Tier","Baue eine Brücke über einen Fluss","Lauf 2 km ohne Sprint","Hol einen Netherstern","Fang 10 Fische","Kein Essen bis zum Abend","Bau einen Farm-Automaten","Besuche alle Basen","Überlebe eine Nacht draußen ohne Bett","Mach jemandem ein Geschenk","Erkunde eine Ruine oder einen Tempel","Nur mit Pfeil und Bogen kämpfen","Sammle 1 Stack von jedem Holz"];
const JOBS = ["Holz farmen","Essen besorgen","Mob-Farm bauen","Diamanten suchen","Lager aufräumen","Nether-Portal bauen","Tiere züchten","Straße bauen"];
function spieleInit(){
  if (!App.stats) return;
  if (!spieleInit.done) { spieleInit.done = 1; gameHL(); gameWho();
    gameWheel("wheelC", "wheelCBtn", "wheelCOut", () => CHALLENGES.slice(0, 12), ["#7bd34f","#5ad1f0","#f5c542","#e2557b","#b38cf5","#ffa14a"]);
    gameWheel("wheelP", "wheelPBtn", "wheelPOut", () => players().map(p => p.name), ["#f5c542","#7bd34f","#e2557b","#5ad1f0","#b38cf5","#ffa14a"]);
    $("jobOut").textContent = rnd(JOBS); $("jobNew").onclick = () => $("jobOut").textContent = rnd(JOBS);
  }
}

/* ---------- Casino (nur Spielgeld, im Browser gespeichert) ---------- */
const Bank = {
  get(){ try { const v = localStorage.getItem("mc26_dia"); return v == null ? 100 : +v; } catch { return this._v ?? 100; } },
  set(v){ this._v = Math.max(0, Math.round(v)); try { localStorage.setItem("mc26_dia", this._v); } catch {} Bank.draw(); },
  last(){ try { return +localStorage.getItem("mc26_refill") || 0; } catch { return 0; } },
  wait(){ return Math.max(0, Bank.last() + 24 * 36e5 - Date.now()); },
  draw(){ const v = Bank.get(); document.querySelectorAll(".bank-v").forEach(e => e.textContent = nf.format(v));
    const r = $("bankRefill"); if (!r) return; r.hidden = v >= 10;
    const w = Bank.wait(); r.disabled = w > 0;
    r.textContent = w > 0 ? (m => `Nachschub in ${Math.floor(m / 60)} Std. ${m % 60} Min.`)(Math.ceil(w / 6e4)) : "Nachschub holen (+30)"; }
};
const betOf = id => { const v = Math.floor(+$(id).value || 0); if (v < 1) { $(id).value = 1; return 1; } return v; };
function casinoMsg(id, txt, good){ const e = $(id); e.textContent = txt; e.className = "cs-msg " + (good ? "good" : good === false ? "bad" : ""); }
function payable(bet, msgId){ if (bet > Bank.get()) { casinoMsg(msgId, "Nicht genug Diamanten!", false); return false; } return true; }

const SLOT = [["dirt",1,30],["coal",2,22],["iron_ingot",3,16],["gold_ingot",5,10],["emerald",8,6],["diamond",20,4],["netherite_ingot",50,1.5],["creeper_head",0,10]];
function slotsInit(){
  const reels = [...document.querySelectorAll(".reel")], tot = SLOT.reduce((a, s) => a + s[2], 0);
  const roll = () => { let r = Math.random() * tot; for (const s of SLOT) if ((r -= s[2]) < 0) return s; return SLOT[0]; };
  const img = s => `<img src="${itemImg(s[0])}" alt="${esc(deItem(s[0]))}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'fb',textContent:this.alt}))">`;
  reels.forEach(r => r.innerHTML = img(SLOT[5]));
  $("pt").innerHTML = SLOT.filter(s => s[1]).map(s => `<span>${img(s)}×3 = <b>${s[1]}×</b></span>`).join("") + `<span>2 gleiche = <b>halber Einsatz zurück</b></span><span>${img(SLOT[7])} = <b>Boom, verloren</b></span>`;
  let busy = false;
  $("slotGo").onclick = () => {
    if (busy) return; const bet = betOf("slotBet"); if (!payable(bet, "slotMsg")) return;
    busy = true; Bank.set(Bank.get() - bet); casinoMsg("slotMsg", "…");
    const res = [roll(), roll(), roll()];
    reels.forEach((r, i) => { r.classList.add("spin"); const t = setInterval(() => r.innerHTML = img(rnd(SLOT)), 80);
      setTimeout(() => { clearInterval(t); r.classList.remove("spin"); r.innerHTML = img(res[i]);
        if (i === 2) { busy = false;
          const ids = res.map(x => x[0]);
          if (ids.includes("creeper_head")) casinoMsg("slotMsg", "💥 Creeper! Alles weg.", false);
          else if (ids[0] === ids[1] && ids[1] === ids[2]) { const w = bet * res[0][1]; Bank.set(Bank.get() + w); casinoMsg("slotMsg", `JACKPOT! +${nf.format(w)} 💎`, true); confetti(); }
          else if (new Set(ids).size === 2) { const w = Math.floor(bet / 2); Bank.set(Bank.get() + w); casinoMsg("slotMsg", `Zwei gleiche: halber Einsatz zurück (+${w}).`, null); }
          else casinoMsg("slotMsg", "Leider nichts.", false);
        } }, 700 + i * 450); });
  };
}

function coinInit(){
  let pick = "steve";
  document.querySelectorAll("[data-side]").forEach(b => b.onclick = () => { pick = b.dataset.side; document.querySelectorAll("[data-side]").forEach(x => x.classList.toggle("on", x === b)); });
  $("coinGo").onclick = () => {
    const bet = betOf("coinBet"); if (!payable(bet, "coinMsg")) return;
    const coin = $("coin"); if (coin.classList.contains("flip")) return;
    Bank.set(Bank.get() - bet); const res = Math.random() < .5 ? "steve" : "creeper";
    coin.className = "coin flip " + res; casinoMsg("coinMsg", "…");
    setTimeout(() => { coin.className = "coin " + res;
      if (res === pick) { const w = Math.floor(bet * 1.9); Bank.set(Bank.get() + w); casinoMsg("coinMsg", `Gewonnen! +${nf.format(w)} 💎`, true); }
      else casinoMsg("coinMsg", "Verloren!", false); }, 1600);
  };
}

function minesInit(){
  const grid = $("mGrid"); let st = null;
  const mult = safe => { const n = 25, b = st.bombs; let m = 1; for (let i = 0; i < safe; i++) m *= (n - i) / (n - b - i); return m * .9; };
  const draw = () => {
    grid.innerHTML = Array.from({ length: 25 }, (_, i) => { const o = st?.open.has(i), bomb = st?.bombSet.has(i), show = o || (st?.over && bomb);
      return `<button type="button" class="mc ${show ? (bomb ? "boom" : "ok") : ""}" data-i="${i}" ${!st || st.over || o ? "disabled" : ""}>${show ? (bomb ? `<img src="${itemImg("tnt")}" alt="TNT">` : `<img src="${itemImg("diamond")}" alt="Diamant">`) : ""}</button>`; }).join("");
    const safe = st ? st.open.size : 0;
    $("mCash").disabled = !st || st.over || !safe;
    $("mInfo").textContent = st && !st.over ? `Gefunden: ${safe} · Auszahlen: ${nf.format(Math.floor(st.bet * mult(safe)))} 💎 · Nächstes Feld: ${nf1.format(mult(safe + 1))}×` : "";
  };
  $("mGo").onclick = () => {
    const bet = betOf("mBet"); if (!payable(bet, "mMsg")) return;
    const bombs = +$("mBombs").value; Bank.set(Bank.get() - bet);
    const bombSet = new Set(shuffle([...Array(25).keys()]).slice(0, bombs));
    st = { bet, bombs, bombSet, open: new Set(), over: false }; casinoMsg("mMsg", "Klick auf ein Feld. Vorsicht vor TNT!"); draw();
  };
  grid.onclick = e => { const b = e.target.closest(".mc"); if (!b || !st || st.over) return; const i = +b.dataset.i;
    if (st.bombSet.has(i)) { st.over = true; st.open.add(i); casinoMsg("mMsg", "💥 TNT! Einsatz verloren.", false); }
    else { st.open.add(i); if (st.open.size === 25 - st.bombs) { const w = Math.floor(st.bet * mult(st.open.size)); Bank.set(Bank.get() + w); st.over = true; casinoMsg("mMsg", `Alles gefunden! +${nf.format(w)} 💎`, true); confetti(); } }
    draw(); };
  $("mCash").onclick = () => { if (!st || st.over) return; const w = Math.floor(st.bet * mult(st.open.size)); Bank.set(Bank.get() + w); st.over = true; casinoMsg("mMsg", `Ausgezahlt: +${nf.format(w)} 💎`, true); draw(); };
  draw();
}

/* Roulette: Redstone = rot, Kohle = schwarz, Smaragd = 0 */
const RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const WHEEL = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const rCol = n => n === 0 ? "green" : RED.has(n) ? "red" : "black";
function rouletteInit(){
  const cv = $("rWheel"), ctx = cv.getContext("2d"), R = cv.width / 2; let ang = 0, busy = false, choice = "red";
  const draw = () => { ctx.clearRect(0, 0, cv.width, cv.width); const n = WHEEL.length;
    WHEEL.forEach((num, i) => { const a0 = ang + i * 2 * Math.PI / n, a1 = a0 + 2 * Math.PI / n;
      ctx.beginPath(); ctx.moveTo(R, R); ctx.arc(R, R, R - 6, a0, a1); ctx.fillStyle = { green: "#2fa84f", red: "#b3261e", black: "#26222c" }[rCol(num)]; ctx.fill();
      ctx.strokeStyle = "#c99a1d"; ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); ctx.translate(R, R); ctx.rotate((a0 + a1) / 2); ctx.fillStyle = "#fff"; ctx.font = "700 20px Outfit, sans-serif"; ctx.textAlign = "right"; ctx.fillText(num, R - 18, 7); ctx.restore(); });
    ctx.beginPath(); ctx.arc(R, R, R * .42, 0, 7); ctx.fillStyle = "#5c4630"; ctx.fill(); ctx.beginPath(); ctx.arc(R, R, R * .3, 0, 7); ctx.fillStyle = "#1c1426"; ctx.fill(); };
  draw();
  document.querySelectorAll("[data-r]").forEach(b => b.onclick = () => { choice = b.dataset.r; document.querySelectorAll("[data-r]").forEach(x => x.classList.toggle("on", x === b)); $("rNum").value = ""; });
  $("rNum").oninput = () => { if ($("rNum").value !== "") { choice = "num"; document.querySelectorAll("[data-r]").forEach(x => x.classList.remove("on")); } };
  $("rGo").onclick = () => {
    if (busy) return; const bet = betOf("rBet"); if (!payable(bet, "rMsg")) return;
    let num = null; if (choice === "num") { num = Math.floor(+$("rNum").value); if (!(num >= 0 && num <= 36)) { casinoMsg("rMsg", "Zahl zwischen 0 und 36 eingeben.", false); return; } }
    busy = true; Bank.set(Bank.get() - bet); casinoMsg("rMsg", "Die Kugel rollt …");
    const idx = Math.floor(Math.random() * 37), res = WHEEL[idx], seg = 2 * Math.PI / 37;
    const want = -Math.PI / 2 - (idx + .5) * seg, start = ang, target = start + 10 * Math.PI + (((want - start) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), t0 = performance.now();
    const step = now => { const k = Math.min(1, (now - t0) / 4500); ang = start + (target - start) * (1 - Math.pow(1 - k, 4)); draw();
      if (k < 1) return requestAnimationFrame(step); busy = false;
      const c = rCol(res), name = { green: "Smaragd", red: "Redstone", black: "Kohle" }[c];
      const odd = res % 2 === 1;
      const win = choice === "num" ? (num === res ? 36 : 0)
        : choice === "green" ? (res === 0 ? 36 : 0)
        : choice === "red" || choice === "black" ? (c === choice ? 2 : 0)
        : choice === "odd" ? (res && odd ? 2 : 0) : choice === "even" ? (res && !odd ? 2 : 0)
        : choice === "low" ? (res >= 1 && res <= 18 ? 2 : 0) : choice === "high" ? (res >= 19 ? 2 : 0) : 0;
      $("rLast").insertAdjacentHTML("afterbegin", `<span class="rl ${c}">${res}</span>`); while ($("rLast").children.length > 12) $("rLast").lastChild.remove();
      if (win) { Bank.set(Bank.get() + bet * win); casinoMsg("rMsg", `${res} ${name}! Gewonnen: +${nf.format(bet * win)} 💎`, true); if (win > 2) confetti(); }
      else casinoMsg("rMsg", `${res} ${name}. Verloren.`, false); };
    requestAnimationFrame(step);
  };
}

/* Blackjack „Creeper 21“: Farben = Diamant, Smaragd, Redstone, Kohle */
const SUITS = [["diamond","Diamant"],["emerald","Smaragd"],["redstone","Redstone"],["coal","Kohle"]];
const RANKS = [["A",11],["2",2],["3",3],["4",4],["5",5],["6",6],["7",7],["8",8],["9",9],["10",10],["B",10],["D",10],["K",10]];
function bjInit(){
  let deck = [], me = [], dl = [], bet = 0, live = false;
  const newDeck = () => { deck = shuffle(SUITS.flatMap(s => RANKS.map(r => ({ s, r })))); };
  const draw1 = () => { if (deck.length < 12) newDeck(); return deck.pop(); };
  const score = h => { let t = h.reduce((a, c) => a + c.r[1], 0), aces = h.filter(c => c.r[0] === "A").length; while (t > 21 && aces--) t -= 10; return t; };
  const card = (c, hide) => hide ? `<div class="card back"></div>` : `<div class="card ${c.s[0]}"><b>${c.r[0]}</b><img src="${itemImg(c.s[0])}" alt="${c.s[1]}"><b class="rot">${c.r[0]}</b></div>`;
  const show = (hideDealer) => {
    $("bjDealer").innerHTML = dl.map((c, i) => card(c, hideDealer && i === 1)).join("");
    $("bjMe").innerHTML = me.map(c => card(c)).join("");
    $("bjDs").textContent = hideDealer ? "?" : score(dl); $("bjMs").textContent = me.length ? score(me) : "";
    $("bjHit").disabled = $("bjStand").disabled = $("bjDouble").disabled = !live;
    if (live && (me.length > 2 || Bank.get() < bet)) $("bjDouble").disabled = true;
    $("bjGo").disabled = live;
  };
  const end = (txt, mult) => { live = false; if (mult) Bank.set(Bank.get() + Math.floor(bet * mult)); casinoMsg("bjMsg", txt + (mult ? ` +${nf.format(Math.floor(bet * mult))} 💎` : ""), mult > 1 ? true : mult === 1 ? null : false); if (mult > 2) confetti(); show(false); };
  const dealerPlay = () => { while (score(dl) < 17) dl.push(draw1()); const d = score(dl), m = score(me);
    if (d > 21) end("Der Händler hat sich übernommen!", 2); else if (m > d) end("Du gewinnst!", 2); else if (m === d) end("Unentschieden.", 1); else end(`Händler hat ${d}. Verloren.`, 0); };
  $("bjGo").onclick = () => { bet = betOf("bjBet"); if (!payable(bet, "bjMsg")) return; Bank.set(Bank.get() - bet);
    me = [draw1(), draw1()]; dl = [draw1(), draw1()]; live = true; casinoMsg("bjMsg", "Karte ziehen oder stehen bleiben?"); show(true);
    if (score(me) === 21) { score(dl) === 21 ? end("Beide 21. Unentschieden.", 1) : end("CREEPER 21! Natürlicher Blackjack!", 2.2); } };
  $("bjHit").onclick = () => { me.push(draw1()); const m = score(me); show(true); if (m > 21) end(`💥 ${m}, explodiert! Verloren.`, 0); else if (m === 21) dealerPlay(); };
  $("bjStand").onclick = () => dealerPlay();
  $("bjDouble").onclick = () => { if (Bank.get() < bet) return; Bank.set(Bank.get() - bet); bet *= 2; me.push(draw1()); const m = score(me); if (m > 21) end(`💥 ${m}, explodiert! Verloren.`, 0); else dealerPlay(); };
  newDeck(); show(false);
}

/* ---------- Glücksrad & Lose ziehen ---------- */
function luckInit(){
  const ta = $("luckList"); let draw;
  const load = () => { try { return localStorage.getItem("mc26_luck"); } catch { return null; } };
  ta.value = load() || players().map(p => p.name).join("\n") || "Sulaiii\nGFB1907\nMattheus05\nmoo259\nInsider07\nDiddylikeapiddy";
  const items = () => ta.value.split("\n").map(x => x.trim()).filter(Boolean).slice(0, 30);
  ta.oninput = () => { try { localStorage.setItem("mc26_luck", ta.value); } catch {} draw(); $("lotList").innerHTML = ""; };
  draw = gameWheel("luckWheel", "luckGo", "luckOut", () => items().length ? items() : ["?"], ["#7bd34f","#f5c542","#e2557b","#5ad1f0","#b38cf5","#ffa14a","#4fd1a5","#f08a5d"]);
  document.querySelectorAll("[data-preset]").forEach(b => b.onclick = () => {
    ta.value = b.dataset.preset === "spieler" ? (players().map(p => p.name).join("\n") || ta.value) : b.dataset.preset.split("|").join("\n"); ta.oninput(); });
  $("lotGo").onclick = () => {
    const list = shuffle(items()); if (!list.length) return;
    const n = Math.min(list.length, Math.max(1, +$("lotN").value || 1));
    $("lotList").innerHTML = list.slice(0, n).map((x, i) => `<div class="lot" style="animation-delay:${i * .25}s"><span>${i + 1}.</span><b>${esc(x)}</b></div>`).join("");
  };
}

function casinoInit(){
  slotsInit(); rouletteInit(); bjInit(); coinInit(); minesInit(); Bank.draw();
  $("bankRefill").onclick = () => { if (Bank.wait() > 0) return; try { localStorage.setItem("mc26_refill", Date.now()); } catch {} Bank.set(Bank.get() + 30); };
  setInterval(Bank.draw, 30000);
  luckInit();
  document.querySelectorAll("[data-bet]").forEach(b => b.onclick = () => { const inp = $(b.dataset.for), v = b.dataset.bet;
    inp.value = v === "max" ? Math.max(1, Bank.get()) : v === "half" ? Math.max(1, Math.floor(+inp.value / 2)) : Math.max(1, (+inp.value || 0) * 2); });
}

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
    const items = [CONFIG.name, CONFIG.software + " " + CONFIG.version, "Live-Stats", "Wochen-Bingo", "Todes-Feed", "Discord", addr];
    const run = items.map(t => `<span>${esc(t)}</span><span>✦</span>`).join("");
    set("tickerInner", run + run);
    onUpdate(() => {
      liveStatusInto();
      const L = App.live, on = L.players || [];
      set("onCount", L.checked ? String(L.online ? L.count : 0) : "–");
      set("onMax", !L.checked ? "wird geprüft …" : L.error ? "Status nicht erreichbar" : L.online ? `von ${L.max} Plätzen` : "Server ist offline");
      set("onlineNow", on.length ? `<div class="online-now">${on.map(n => `<a href="${plink(n)}"><img alt="" src="${head(n)}">${esc(n)}</a>`).join("")}</div>` : `<p class="muted" style="margin:0">${L.checked ? "Gerade ist niemand online." : ""}</p>`);
      // Welt
      const w = App.stats?.world;
      if (w) {
        const hr = Math.floor((w.time / 1000 + 6) % 24), mi = Math.floor((w.time % 1000) * 0.06);
        const phase = w.time < 5000 ? "Vormittag" : w.time < 7000 ? "Mittag" : w.time < 12000 ? "Nachmittag" : w.time < 13800 ? "Abend" : w.time < 22500 ? "Nacht" : "Morgen";
        set("worldList", [["Tag", nf.format(w.day)], ["Uhrzeit", `${String(hr).padStart(2,"0")}:${String(mi).padStart(2,"0")} · ${phase}`], ["Wetter", w.thundering ? "Gewitter" : w.raining ? "Regen" : "Klar"], w.difficulty && ["Schwierigkeit", w.difficulty + (w.hardcore ? " · Hardcore" : "")], w.spawn && ["Spawn", w.spawn.join(" / ")]]
          .filter(Boolean).map(([k, v]) => `<div><span>${k}</span><b>${esc(v)}</b></div>`).join(""));
      } else set("worldList", `<p class="muted small" style="margin:0">Kommt mit dem nächsten Abgleich.</p>`);
      // Zahlen in Gruppen
      const has = players().length, V = (k, f) => has ? f(sum(k)) : "–";
      const groups = [
        ["Gemeinsam", [["Spieler", has ? players().length : "–"], ["Stunden gespielt", V("play", v => N(v / 72000))], ["Strecke", V("dist", v => N(v / 100000) + " km")]]],
        ["Kampf", [["Mobs getötet", V("mobs", N)], ["Tode", V("deaths", N)], ["Drachen besiegt", V("dragon", N)]]],
        ["Bergbau", [["Blöcke abgebaut", V("mined", N)], ["Diamanterz", V("diamond", N)], ["Antiker Schutt", V("debris", N)]]]
      ];
      set("statGroups", groups.map(([g, items]) => `<div class="panel stat-group"><span class="eyebrow">${g}</span><div class="sg-items">${items.map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join("")}</div></div>`).join(""));
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
        pr && `<span class="chip"><span class="lbl">${DIM[pr.dim] || esc(pr.dim)}</span><b>${pr.pos ? pr.pos.join(" / ") : "?"}</b></span>`
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
      const kb = p.killedBy || [];
      set("pNemesis", kb.length ? `<div class="nemesis"><span class="eyebrow" style="color:var(--red)">Erzfeind</span><b>${esc(entName(kb[0][0]))}</b><span class="muted">hat ${esc(real)} ${kb[0][1]}-mal getötet</span></div>${kb.length > 1 ? `<div class="small muted" style="margin-top:8px">Danach: ${kb.slice(1).map(([k, n]) => `${esc(entName(k))} (${n}×)`).join(", ")}</div>` : ""}` : `<p class="muted small" style="margin:0">Noch kein Erzfeind. Glückwunsch!</p>`);
      const ss = sessions().filter(s => s.p === real).slice(-8).reverse();
      set("pSessions", ss.length ? ss.map(s => `<div class="fi" style="grid-template-columns:minmax(0,1fr) auto"><span class="tx">${when(s.from)} – ${s.to ? s.to.slice(11,16) : "jetzt"}</span><span class="tm">${dur(sessionEnd(s) - toDate(s.from))}</span></div>`).join("") : `<p class="muted small">Noch keine Sessions in den Logs.</p>`);
      set("pStats", GROUPS.map(g => `<div><h4>${g}</h4><div class="kv">` + STATS.filter(s => s.g === g).map(s => { const r = rankOf(p, s.key);
        return `<div><span>${s.label}</span><b>${s.fmt(val(p,s.key))}${r === 1 && val(p,s.key) > 0 ? " <small>#1</small>" : ""}</b></div>`; }).join("") + `</div></div>`).join(""));
      const adv = advDone(p).slice().reverse();
      set("pAdv", adv.length ? `<p class="muted small" style="margin:0 0 8px">${adv.length} Fortschritte geschafft</p><div class="adv-list">${adv.slice(0, 12).map(([id, t]) => `<div class="adv"><div><div class="cat">${advCat(id)}</div><div class="nm">${esc(advName(id))}</div>${advDesc(id) ? `<div class="small muted">${esc(advDesc(id))}</div>` : ""}</div><span class="tm small muted">${t ? when(t) : ""}</span></div>`).join("")}</div>` : `<p class="muted small">Noch keine Fortschritte erfasst.</p>`);
      const sorted = [...players()].sort((a,b) => a.name.localeCompare(b.name)), i = sorted.indexOf(p);
      set("pNav", sorted.length > 1 ? `<a class="more-link" href="${plink(sorted[(i - 1 + sorted.length) % sorted.length].name)}">← ${esc(sorted[(i - 1 + sorted.length) % sorted.length].name)}</a><a class="more-link" href="${plink(sorted[(i + 1) % sorted.length].name)}">${esc(sorted[(i + 1) % sorted.length].name)} →</a>` : "");
    });
  },

  stats(){
    onUpdate(() => {
      const d = App.stats?.updated ? new Date(App.stats.updated) : null;
      set("statsInfo", players().length ? `Stand: ${d ? d.toLocaleString("de-DE",{dateStyle:"medium",timeStyle:"short"}) : "unbekannt"}. Klick auf einen Spieler für sein Profil.` : "Noch keine Welt-Stats geladen.");
      boardTabs(); boardInto(); recordsInto("records"); chartInto(); factsInto("facts");
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

  wrapped(){
    let per = "month", idx = 0, who = null;
    const COLORS = ["#3f7a22,#6fbf3f", "#2c2a6b,#7b5cff", "#7a2f1d,#ef7a3b", "#1d4d6b,#3fb5ef", "#5c1d4d,#e05ca8", "#6b5a1d,#f2c14e", "#1d6b5a,#3fd3a8", "#40304f,#a68bd1", "#3f7a22,#f2c14e"];
    function persona(p){
      const t = k => periodValue(p, k, per).v;
      const all = players(), max = k => Math.max(1, ...all.map(x => periodValue(x, k, per).v));
      const score = [["Der Bergarbeiter", "gräbt sich durch die Welt wie kein anderer", t("mined") / max("mined")], ["Der Krieger", "kein Mob ist vor dir sicher", t("mobs") / max("mobs")],
        ["Der Entdecker", "immer unterwegs, nie zu Hause", t("dist") / max("dist")], ["Der Pechvogel", "der Boden war oft schneller als du", t("deaths") / max("deaths")],
        ["Der Angler", "die Fische kennen deinen Namen", t("fish") / max("fish")], ["Der Bauer", "deine Tiere sind dein Ein und Alles", t("bred") / max("bred")]];
      return score.sort((a, b) => b[2] - a[2])[0];
    }
    function slides(){
      const p = players().find(x => x.uuid === who); if (!p) return [];
      const r = periodRange(per), V = k => periodValue(p, k, per);
      const play = V("play"), partial = play.partial && per !== "all";
      const inP = t => partial || inRange(t, per);
      const rank = k => [...players()].sort((a, b) => periodValue(b, k, per).v - periodValue(a, k, per).v).indexOf(p) + 1;
      const ss = sessions().filter(x => x.p === p.name && inP(x.from)).map(x => ({ ...x, ms: sessionEnd(x) - toDate(x.from) }));
      const longest = ss.sort((a, b) => b.ms - a.ms)[0];
      const hours = new Array(24).fill(0); ss.forEach(x => hours[+x.from.slice(11, 13)]++);
      const favH = ss.length ? hours.indexOf(Math.max(...hours)) : null;
      const chats = App.events.filter(e => e[1] === "c" && e[2] === p.name && inP(e[0])).length;
      const ds = deaths().filter(d => d.p === p.name && inP(d.t));
      const adv = advDone(p).filter(([, t]) => t && inP(t));
      const nem = p.killedBy?.[0];
      const ff = funFacts({ dist: V("dist").v, play: play.v, jumps: V("jumps").v, mined: V("mined").v, mobs: V("mobs").v, deaths: V("deaths").v, fish: V("fish").v });
      const big = (n, unit) => `<div class="w-big">${n}<span>${unit || ""}</span></div>`;
      const out = [];
      out.push(`<span class="w-eyebrow">Minecraft 2026 · Wrapped</span><h2 class="w-title">${esc(p.name)}<br>${per === "all" ? "insgesamt" : "im " + esc(r.label)}</h2><img class="w-skin" alt="" src="${body(p.name)}"><p>${partial ? "Für diesen Monat gibt es noch keine Daten, deshalb siehst du deine <b>Gesamt-Werte</b>." : "Dein Rückblick"} Klick dich durch.</p>`);
      out.push(`<span class="w-eyebrow">Spielzeit</span>${big(nf1.format(play.v / 72000), " Stunden")}<p>Damit bist du <b>Platz ${rank("play")}</b> von ${players().length} auf dem Server.</p>${play.v > 0 ? `<p class="w-small">Das sind ${N(play.v / 72000 * 60 / 90)} Fußballspiele hintereinander.</p>` : ""}`);
      if (longest) out.push(`<span class="w-eyebrow">Am Stück</span>${big(dur(longest.ms))}<p>Deine längste Session, am ${dayLabel(longest.from.slice(0, 10))} ab ${longest.from.slice(11, 16)} Uhr.</p>${favH != null ? `<p class="w-small">Am liebsten spielst du gegen <b>${String(favH).padStart(2, "0")}:00 Uhr</b>.</p>` : ""}`);
      out.push(`<span class="w-eyebrow">Bergbau</span>${big(N(V("mined").v), " Blöcke")}<p><b>${N(V("diamond").v)}</b> Diamanterz und <b>${N(V("debris").v)}</b> Antiker Schutt.</p><p class="w-small">Platz ${rank("mined")} beim Abbauen.</p>`);
      out.push(`<span class="w-eyebrow">Kampf</span>${big(N(V("mobs").v), " Mobs")}<p>Dafür bist du <b>${N(V("deaths").v)}-mal</b> gestorben.</p>${nem ? `<p class="w-small">Dein Erzfeind: <b>${esc(entName(nem[0]))}</b> – hat dich insgesamt ${nem[1]}-mal erwischt.</p>` : ""}${ds.length ? `<p class="w-small">Letzter Tod: ${esc(ds[ds.length - 1].de)}.</p>` : ""}`);
      if (ff.length) out.push(`<span class="w-eyebrow">Was wäre wenn …</span><div class="w-facts">${ff.slice(0, 3).map(f => `<div><b>${esc(f[1])}</b><span>${esc(f[2])}</span></div>`).join("")}</div>`);
      out.push(`<span class="w-eyebrow">Fortschritte</span>${big(adv.length, adv.length === 1 ? " Fortschritt" : " Fortschritte")}<p>${adv.length ? adv.slice(-3).reverse().map(([id]) => `<b>${esc(advName(id))}</b>`).join(", ") : "In diesem Zeitraum kein neuer Fortschritt."}</p>${chats ? `<p class="w-small">Und du hast <b>${chats}</b> Nachrichten in den Chat geschrieben.</p>` : ""}`);
      const pr = persona(p);
      out.push(`<span class="w-eyebrow">Dein Typ</span><h2 class="w-title">${esc(pr[0])}</h2><p>… ${esc(pr[1])}.</p><img class="w-skin" alt="" src="${body(p.name)}"><p class="w-small">Bis zum nächsten Rückblick!</p>`);
      return out;
    }
    function draw(){
      const sel = $("wPlayer");
      if (!players().length) { set("wCard", empty("Wrapped startet mit dem nächsten Abgleich.")); return; }
      const sorted = [...players()].sort((a, b) => a.name.localeCompare(b.name));
      if (!who || !players().some(p => p.uuid === who)) who = (players().find(p => isOnline(p.name)) || sorted[0]).uuid;
      sel.innerHTML = sorted.map(p => `<option value="${esc(p.uuid)}">${esc(p.name)}</option>`).join(""); sel.value = who;
      set("wPer", [["month", "Dieser Monat"], ["last", "Letzter Monat"], ["all", "Insgesamt"]].map(([k, l]) => `<button type="button" data-p="${k}" aria-pressed="${k === per}">${l}</button>`).join(""));
      $("wPer").querySelectorAll("button").forEach(b => b.onclick = () => { per = b.dataset.p; idx = 0; draw(); });
      const sl = slides(); idx = Math.max(0, Math.min(idx, sl.length - 1));
      const c = COLORS[idx % COLORS.length].split(",");
      const card = $("wCard");
      card.style.background = `linear-gradient(150deg, ${c[0]}, ${c[1]})`;
      card.innerHTML = `<div class="w-inner">${sl[idx]}</div>`;
      set("wDots", sl.map((_, i) => `<i class="${i === idx ? "on" : ""}"></i>`).join(""));
      $("wPrev").disabled = idx === 0; $("wNext").textContent = idx === sl.length - 1 ? "Nochmal" : "Weiter →";
    }
    const go = d => { const n = slides().length; idx = d > 0 && idx === n - 1 ? 0 : Math.max(0, idx + d); draw(); };
    $("wPlayer").addEventListener("change", e => { who = e.target.value; idx = 0; draw(); });
    $("wPrev").onclick = () => go(-1); $("wNext").onclick = () => go(1);
    $("wCard").addEventListener("click", e => { const r = $("wCard").getBoundingClientRect(); go(e.clientX - r.left > r.width / 3 ? 1 : -1); });
    document.addEventListener("keydown", e => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); });
    onUpdate(draw);
  },

  casino(){ casinoInit(); },
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
      set("gallery", list.slice().reverse().map((g, i) => `<figure data-i="${list.length - 1 - i}"><img loading="lazy" src="${esc(g.bild)}" alt="${esc(g.titel || "Screenshot")}"><figcaption><b>${esc(g.titel || "")}</b>${g.text ? `<p class="g-text">${esc(g.text)}</p>` : ""}<span>${[g.von, g.datum].filter(Boolean).map(esc).join(" · ")}</span></figcaption></figure>`).join(""));
      $("gallery").querySelectorAll("figure").forEach(f => f.onclick = () => { const g = list[f.dataset.i]; $("lbImg").src = g.bild; $("lbImg").alt = g.titel || ""; set("lbText", `<b>${esc(g.titel || "")}</b>${g.text ? `<br>${esc(g.text)}` : ""}<br><span class="small muted">${esc([g.von, g.datum].filter(Boolean).join(" · "))}</span>`); $("lightbox").showModal(); });
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
            </div></article>`;
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
      const recent = []; for (const p of ps) for (const [id, t] of advDone(p)) recent.push({ p: p.name, id, t: t || "" });
      recent.sort((a, b) => b.t.localeCompare(a.t));
      set("advRecent", recent.length ? recent.slice(0, 25).map(r => `<div class="fi"><img alt="" loading="lazy" src="${head(r.p)}"><span class="tx"><a href="${plink(r.p)}" style="text-decoration:none"><b>${esc(r.p)}</b></a> hat <b style="color:var(--gold)">${esc(advName(r.id))}</b> geschafft<br><span class="small muted">${esc(advCat(r.id))}${advDesc(r.id) ? " · " + esc(advDesc(r.id)) : ""}</span></span><span class="tm">${r.t ? when(r.t) : ""}</span></div>`).join("") : empty("Noch keine Fortschritte erfasst.", "Kommt mit dem nächsten Abgleich."));
      const rank = ps.map(p => [p, advDone(p).length]).sort((a,b) => b[1] - a[1]);
      set("advRank", rank.length ? rank.map(([p, n], i) => `<a class="row" href="${plink(p.name)}" style="text-decoration:none"><span class="rk">${i+1}</span><img alt="" src="${head(p.name)}"><div class="nm">${esc(p.name)}</div><span class="val">${n}</span></a>`).join("") : `<p class="muted small">Noch keine Daten.</p>`);
      const all = {};
      for (const p of ps) for (const [id, t] of advDone(p)) (all[id] ||= []).push([p.name, t]);
      const ids = Object.keys(all).sort((a,b) => { const ta = all[a].map(x => x[1]).sort().pop() || "", tb = all[b].map(x => x[1]).sort().pop() || ""; return tb.localeCompare(ta); });
      set("advAll", ids.length ? ids.map(id => { const who = all[id].sort((a,b) => String(a[1]).localeCompare(String(b[1])));
        return `<div class="adv"><div><div class="cat">${advCat(id)}</div><div class="nm">${esc(advName(id))}</div>${advDesc(id) ? `<div class="small muted">${esc(advDesc(id))}</div>` : ""}<div class="small muted">Zuerst: ${esc(who[0][0])}${who[0][1] ? " · " + when(who[0][1]) : ""}</div></div>
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

  fussball(){
    async function load(){
      let f = null;
      try { const r = await fetch(`https://api.github.com/repos/${CONFIG.github}/contents/football.json`, { cache: "no-store", headers: { Accept: "application/vnd.github.raw" } }); if (r.ok) f = await r.json(); } catch {}
      if (!f) { try { const r = await fetch("football.json", { cache: "no-store" }); if (r.ok) f = await r.json(); } catch {} }
      if (!f?.teams?.length) { set("fbTeams", empty("Die Fußball-Daten kommen mit dem nächsten Abgleich.", "Spätestens in 20 Minuten stehen hier Ergebnisse, nächste Spiele und Tabellen.")); return; }
      const d = s => new Date(s);
      const dt = s => d(s).toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
      const chip = r => `<span class="res res-${r}">${r}</span>`;
      set("fbUpdated", `Stand: ${d(f.updated).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}`);
      set("fbTeams", f.teams.map(t => {
        const next = t.upcoming?.[0];
        const tbl = t.table || [], i = tbl.findIndex(x => x.us);
        const rows = i < 0 ? tbl.slice(0, 6) : tbl.filter((x, k) => k < 3 || Math.abs(k - i) <= 2);
        return `<section class="fb-team fb-${t.key}">
          <div class="fb-head"><span class="eyebrow">${esc(t.league)}</span><h2>${esc(t.name)}</h2>
            <div class="form">${(t.results || []).slice(0, 5).map(g => chip(g.res || "?")).join("")}<span class="small muted">letzte Spiele</span></div></div>
          ${next ? `<div class="fb-next"><span class="small muted">Nächstes Spiel${next.comp ? " · " + esc(next.comp) : ""}</span>
            <div class="fb-match"><b>${esc(next.home)}</b><span class="vs">${next.live ? `${esc(next.hs)}:${esc(next.as)}` : "vs"}</span><b>${esc(next.away)}</b></div>
            <span class="fb-when">${next.live ? `<span class="res res-L">LIVE</span> ${esc(next.status)}` : `${dt(next.date)} Uhr · <span class="countdown" data-at="${esc(next.date)}"></span>`}</span></div>` : `<p class="muted">Kein Spiel angesetzt.</p>`}
          <h3 class="sub" style="margin-top:18px">Ergebnisse</h3>
          <div class="feed">${(t.results || []).map(g => `<div class="fi" style="grid-template-columns:auto minmax(0,1fr) auto">${chip(g.res || "?")}<span class="tx">${esc(g.home)} <b>${esc(g.hs ?? "–")}:${esc(g.as ?? "–")}</b> ${esc(g.away)}</span><span class="tm">${d(g.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</span></div>`).join("") || `<p class="muted small">Noch keine Ergebnisse.</p>`}</div>
          ${(t.upcoming || []).length > 1 ? `<h3 class="sub" style="margin-top:18px">Nächste Spiele</h3><div class="feed">${t.upcoming.slice(1).map(g => `<div class="fi" style="grid-template-columns:minmax(0,1fr) auto"><span class="tx">${esc(g.home)} – ${esc(g.away)}</span><span class="tm">${dt(g.date)}</span></div>`).join("")}</div>` : ""}
          ${tbl.length ? `<h3 class="sub" style="margin-top:18px">Tabelle</h3><div class="cmp-wrap"><table class="cmp fb-table"><thead><tr><th>#</th><th style="text-align:left">Verein</th><th>Sp</th><th>Diff</th><th>Pkt</th></tr></thead><tbody>
            ${rows.map((x, k) => `${k > 0 && (x.rank ?? 0) - (rows[k-1].rank ?? 0) > 1 ? `<tr><td colspan="5" style="text-align:center;color:var(--muted)">…</td></tr>` : ""}<tr class="${x.us ? "us" : ""}"><td>${x.rank ?? ""}</td><td style="text-align:left">${esc(x.team)}</td><td>${x.played ?? ""}</td><td>${x.diff ?? ""}</td><td><b>${x.points ?? ""}</b></td></tr>`).join("")}</tbody></table></div>` : ""}
        </section>`;
      }).join(""));
      tick();
    }
    function tick(){ document.querySelectorAll(".countdown[data-at]").forEach(el => el.textContent = countdown(new Date(el.dataset.at))); }
    load(); setInterval(load, 5 * 60 * 1000); setInterval(tick, 1000);
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
