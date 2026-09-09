// Minimal Kiwi schema + message decoder, enough to read a Figma .fig payload.
const KIND = ['ENUM', 'STRUCT', 'MESSAGE'];

class Reader {
  constructor(buf) { this.b = buf; this.i = 0; }
  byte() { return this.b[this.i++]; }
  bool() { return !!this.b[this.i++]; }
  varuint() {
    let v = 0, s = 0, c;
    do { c = this.b[this.i++]; v |= (c & 127) << s; s += 7; } while (c & 128);
    return v >>> 0;
  }
  varint() { const v = this.varuint(); return (v & 1) ? ~(v >>> 1) : (v >>> 1); }
  varuint64() {
    let v = 0n, s = 0n, c;
    do { c = this.b[this.i++]; v |= BigInt(c & 127) << s; s += 7n; } while (c & 128);
    return v;
  }
  varint64() { const v = this.varuint64(); return (v & 1n) ? ~(v >> 1n) : (v >> 1n); }
  float() {
    const first = this.b[this.i];
    if (first === 0) { this.i++; return 0; }
    const bits = this.b.readUInt32LE(this.i); this.i += 4;
    const r = ((bits << 23) | (bits >>> 9)) >>> 0;
    const tmp = Buffer.alloc(4); tmp.writeUInt32LE(r, 0);
    return tmp.readFloatLE(0);
  }
  string() {
    const start = this.i;
    while (this.b[this.i] !== 0) this.i++;
    const s = this.b.toString('utf8', start, this.i);
    this.i++;
    return s;
  }
}

function parseSchema(buf) {
  const r = new Reader(buf);
  const n = r.varuint();
  const defs = [];
  for (let i = 0; i < n; i++) {
    const name = r.string();
    const kind = r.byte();
    const fieldCount = r.varuint();
    const fields = [];
    for (let f = 0; f < fieldCount; f++) {
      fields.push({
        name: r.string(),
        type: r.varint(),
        isArray: r.bool(),
        value: r.varuint(),
      });
    }
    defs.push({ name, kind: KIND[kind], fields });
  }
  return defs;
}

function makeDecoder(defs) {
  const byName = new Map(defs.map((d, i) => [d.name, i]));
  // Field lookup by id, precomputed — a linear scan per field is far too slow
  // across a document this size.
  for (const d of defs) d.byId = new Map(d.fields.map((f) => [f.value, f]));

  function readValue(r, type) {
    if (type < 0) {
      switch (type) {
        case -1: return r.bool();
        case -2: return r.byte();
        case -3: return r.varint();
        case -4: return r.varuint();
        case -5: return r.float();
        case -6: return r.string();
        case -7: return r.varint64();
        case -8: return r.varuint64();
        default: throw new Error('unknown builtin ' + type);
      }
    }
    return readDef(r, type);
  }

  function readDef(r, idx) {
    const def = defs[idx];
    if (def.kind === 'ENUM') {
      const v = r.varuint();
      const f = def.byId.get(v);
      return f ? f.name : v;
    }
    const out = {};
    if (def.kind === 'STRUCT') {
      for (const f of def.fields) out[f.name] = f.isArray ? readArray(r, f.type) : readValue(r, f.type);
      return out;
    }
    for (;;) {
      const id = r.varuint();
      if (id === 0) return out;
      const f = def.byId.get(id);
      if (!f) throw new Error('unknown field ' + id + ' in ' + def.name);
      out[f.name] = f.isArray ? readArray(r, f.type) : readValue(r, f.type);
    }
  }

  function readArray(r, type) {
    const n = r.varuint();
    const a = new Array(n);
    for (let i = 0; i < n; i++) a[i] = readValue(r, type);
    return a;
  }

  return { byName, readDef, defs };
}

module.exports = { Reader, parseSchema, makeDecoder };
