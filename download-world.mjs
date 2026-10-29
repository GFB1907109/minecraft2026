// Lädt die Welt per FTP vom G-Portal-Server in den Ordner ./download/<Weltname>.
// Mehrere Verbindungen gleichzeitig, kurze Wartezeit und automatische Wiederholung,
// weil G-Portal einzelne Datenverbindungen gern hängen lässt.
// Läuft automatisch über GitHub Actions (siehe .github/workflows/welt.yml und karte.yml).
import { Client, FileType } from "basic-ftp";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

const { FTP_HOST, FTP_USER, FTP_PASS, FTP_PORT, FTP_SECURE = "false", WORLD_NAME = "world" } = process.env;
if (!FTP_HOST || !FTP_USER || !FTP_PASS) {
  console.error("FTP_HOST, FTP_USER und FTP_PASS fehlen (GitHub → Settings → Secrets).");
  process.exit(1);
}

const WORKERS = 4;          // gleichzeitige Verbindungen
const TIMEOUT = 20000;      // ms, bis eine hängende Verbindung aufgegeben wird
const TRIES = 4;            // Versuche pro Datei
const SKIP = new Set(["session.lock"]);

async function connect() {
  const c = new Client(TIMEOUT);
  await c.access({ host: FTP_HOST, port: Number(FTP_PORT || 21), user: FTP_USER, password: FTP_PASS, secure: FTP_SECURE === "true" });
  return c;
}
// Führt eine Aktion aus; hängt die Verbindung, wird sie neu aufgebaut und es wird erneut versucht
async function withRetry(holder, fn, tries = TRIES) {
  let err;
  for (let i = 0; i < tries; i++) {
    try {
      if (!holder.c || holder.c.closed) holder.c = await connect();
      return await fn(holder.c);
    } catch (e) {
      err = e;
      try { holder.c?.close(); } catch {}
      holder.c = null;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw err;
}

// Durchsucht den FTP-Zugang nach dem Welt-Ordner (der Ordner mit level.dat).
const SKIP_DIRS = new Set(["mods","config","logs","libraries","versions","crash-reports","region","entities","poi","playerdata","advancements","datapacks","data","DIM-1","DIM1","dimensions","cache",".fabric","resourcepacks","backups","stats","players"]);
async function findWorld(h) {
  const start = (await withRetry(h, c => c.pwd())).replace(/\/$/, "");
  let queue = [start || ""];
  for (let depth = 0; depth <= 4 && queue.length; depth++) {
    const next = [], found = [];
    for (const dir of queue) {
      let list;
      try { list = await withRetry(h, c => c.list(dir || "/"), 2); } catch { continue; }
      if (list.some(f => f.name === "level.dat")) found.push(dir);
      for (const f of list) if (f.isDirectory && !SKIP_DIRS.has(f.name) && !f.name.startsWith(".")) next.push(`${dir}/${f.name}`);
    }
    if (found.length) return found.find(d => d.endsWith("/" + WORLD_NAME)) || found[0];
    queue = next;
  }
  throw new Error("Welt-Ordner mit level.dat nicht gefunden.");
}

// Alle Dateien unter einem Ordner auflisten
async function collect(h, remote, local, out) {
  const list = await withRetry(h, c => c.list(remote));
  for (const f of list) {
    if (SKIP.has(f.name) || f.name === "." || f.name === "..") continue;
    const r = `${remote}/${f.name}`, l = join(local, f.name);
    if (f.type === FileType.Directory) await collect(h, r, l, out);
    else out.push({ r, l, size: f.size || 0 });
  }
}

const main = { c: null };
let count = 0, failed = 0;
try {
  const world = await findWorld(main);
  console.log("Lade Welt aus", world);
  const local = join("download", world.split("/").pop() || WORLD_NAME);
  const files = [];
  if (process.env.ONLY_MAP === "true") {
    // Nur das, was die Karte braucht: level.dat und die Overworld-Regionen
    files.push({ r: `${world}/level.dat`, l: join(local, "level.dat"), size: 0 });
    for (const sub of ["dimensions/minecraft/overworld/region", "region"]) {
      try { await collect(main, `${world}/${sub}`, join(local, sub), files); break; } catch {}
    }
  } else {
    await collect(main, world, local, files);
  }
  try { main.c?.close(); } catch {}
  const total = files.reduce((a, f) => a + f.size, 0);
  console.log(`${files.length} Dateien, ${(total / 1048576).toFixed(0)} MB – lade mit ${WORKERS} Verbindungen …`);

  let next = 0, lastLog = Date.now();
  async function worker() {
    const h = { c: null };
    while (next < files.length) {
      const f = files[next++];
      mkdirSync(dirname(f.l), { recursive: true });
      try { await withRetry(h, c => c.downloadTo(f.l, f.r)); count++; }
      catch (e) { failed++; console.warn("Übersprungen:", f.r, e.message); }
      if (Date.now() - lastLog > 30000) { lastLog = Date.now(); console.log(`… ${count + failed} / ${files.length}`); }
    }
    try { h.c?.close(); } catch {}
  }
  await Promise.all(Array.from({ length: WORKERS }, worker));
  console.log(`Fertig: ${count} Dateien geladen, ${failed} übersprungen.`);
  if (!count) process.exit(1);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
