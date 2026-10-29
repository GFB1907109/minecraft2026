// Kleine Hilfsbibliothek ohne Abhängigkeiten: Minecraft-NBT lesen, Region-Dateien lesen, PNG schreiben.
import zlib from "node:zlib";

/* ---------------- NBT ---------------- */
export function readNbt(buf) {
  if (buf[0] === 0x1f && buf[1] === 0x8b) buf = zlib.gunzipSync(buf);
  else if (buf[0] === 0x78) buf = zlib.inflateSync(buf);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let o = 0;
  const td = new TextDecoder();
  const str = () => { const n = dv.getUint16(o); o += 2; const s = td.decode(buf.subarray(o, o + n)); o += n; return s; };
  const read = (t) => {
    switch (t) {
      case 1: return dv.getInt8(o++);
      case 2: { const v = dv.getInt16(o); o += 2; return v; }
      case 3: { const v = dv.getInt32(o); o += 4; return v; }
      case 4: { const v = dv.getBigInt64(o); o += 8; return v; }
      case 5: { const v = dv.getFloat32(o); o += 4; return v; }
      case 6: { const v = dv.getFloat64(o); o += 8; return v; }
      case 7: { const n = dv.getInt32(o); o += 4; const v = Array.from(buf.subarray(o, o + n), b => (b << 24) >> 24); o += n; return v; }
      case 8: return str();
      case 9: { const et = dv.getInt8(o++); const n = dv.getInt32(o); o += 4; const a = []; for (let i = 0; i < n; i++) a.push(read(et)); return a; }
      case 10: { const obj = {}; for (;;) { const tt = dv.getInt8(o++); if (tt === 0) break; const k = str(); obj[k] = read(tt); } return obj; }
      case 11: { const n = dv.getInt32(o); o += 4; const a = new Array(n); for (let i = 0; i < n; i++) { a[i] = dv.getInt32(o); o += 4; } return a; }
      case 12: { const n = dv.getInt32(o); o += 4; const a = new Array(n); for (let i = 0; i < n; i++) { a[i] = dv.getBigInt64(o); o += 8; } return a; }
      default: throw new Error("Unbekannter NBT-Typ " + t);
    }
  };
  const t = dv.getInt8(o++);
  if (t !== 10) throw new Error("Keine NBT-Datei");
  str();
  return read(10);
}

// Wert unter einem von mehreren Schlüsseln irgendwo im Baum suchen
export function findKey(obj, keys, depth = 6) {
  if (!obj || typeof obj !== "object" || depth < 0) return undefined;
  for (const k of keys) if (k in obj) return obj[k];
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object" && !Array.isArray(v)) { const r = findKey(v, keys, depth - 1); if (r !== undefined) return r; }
  }
  return undefined;
}
export const num = v => typeof v === "bigint" ? Number(v) : v;

/* ---------------- Region-Dateien (.mca) ---------------- */
export function* readRegion(buf) {
  for (let i = 0; i < 1024; i++) {
    const loc = buf.readUInt32BE(i * 4);
    const off = (loc >>> 8) * 4096;
    if (!off || off + 5 > buf.length) continue;
    const len = buf.readUInt32BE(off);
    const comp = buf[off + 4];
    const data = buf.subarray(off + 5, off + 4 + len);
    let raw;
    try {
      if (comp === 2) raw = zlib.inflateSync(data);
      else if (comp === 1) raw = zlib.gunzipSync(data);
      else if (comp === 3) raw = data;
      else continue; // LZ4 o. Ä. wird übersprungen
      yield { cx: i & 31, cz: i >> 5, nbt: readNbtRaw(raw) };
    } catch { /* kaputter Chunk */ }
  }
}
function readNbtRaw(raw) { return readNbt(Buffer.from(raw)); }

// Gepackten Wert aus einem Long-Array lesen (Format ab 1.16)
export function packed(longs, bits, index) {
  const per = Math.floor(64 / bits);
  const l = longs[Math.floor(index / per)];
  if (l === undefined) return 0;
  const shift = BigInt((index % per) * bits);
  return Number((BigInt.asUintN(64, l) >> shift) & ((1n << BigInt(bits)) - 1n));
}

/* ---------------- PNG ---------------- */
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(b) { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
export function encodePng(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy ? rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4) : raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1); }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
