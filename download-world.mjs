// Lädt die komplette Welt per FTP vom G-Portal-Server in den Ordner ./download/<Weltname>.
// Läuft automatisch über GitHub Actions (siehe .github/workflows/welt.yml).
import { Client, FileType } from "basic-ftp";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const { FTP_HOST, FTP_USER, FTP_PASS, FTP_PORT, FTP_SECURE = "false", WORLD_NAME = "world" } = process.env;
if (!FTP_HOST || !FTP_USER || !FTP_PASS) {
  console.error("FTP_HOST, FTP_USER und FTP_PASS fehlen (GitHub → Settings → Secrets).");
  process.exit(1);
}

const SKIP = new Set(["session.lock"]);
let count = 0, failed = 0;

async function findRoot(client) {
  for (const base of ["", "minecraft", "server", "home", "data"]) {
    try {
      const list = await client.list(base ? `/${base}` : "/");
      if (list.some(f => f.name === WORLD_NAME && f.type === FileType.Directory)) return base ? `/${base}` : "";
    } catch {}
  }
  throw new Error(`Welt-Ordner "${WORLD_NAME}" nicht gefunden.`);
}

async function walk(client, remote, local) {
  mkdirSync(local, { recursive: true });
  for (const f of await client.list(remote)) {
    if (SKIP.has(f.name) || f.name === "." || f.name === "..") continue;
    const r = `${remote}/${f.name}`, l = join(local, f.name);
    if (f.type === FileType.Directory) await walk(client, r, l);
    else {
      try { await client.downloadTo(l, r); count++; }
      catch (e) { failed++; console.warn("Übersprungen:", r, e.message); }
    }
  }
}

const client = new Client(60000);
try {
  await client.access({ host: FTP_HOST, port: Number(FTP_PORT || 21), user: FTP_USER, password: FTP_PASS, secure: FTP_SECURE === "true" });
  const root = await findRoot(client);
  console.log("Lade Welt aus", `${root}/${WORLD_NAME}`);
  await walk(client, `${root}/${WORLD_NAME}`, join("download", WORLD_NAME));
  console.log(`Fertig: ${count} Dateien geladen, ${failed} übersprungen.`);
  if (!count) process.exit(1);
} finally {
  client.close();
}
