"use strict";
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const fs     = require("fs");
const crypto = require("crypto");

// ---------------------------------------------------------------------------
// Path to the persistent local JSON "database"
// ---------------------------------------------------------------------------
const DB_PATH = path.join(__dirname, "db_emulated.json");

// ---------------------------------------------------------------------------
// Attempt a real PostgreSQL connection
// ---------------------------------------------------------------------------
let useRealDb = false;
let pgPool    = null;
let dbCheckPromise = null;

const connectDb = () => {
  if (!dbCheckPromise) {
    dbCheckPromise = (async () => {
      if (process.env.DATABASE_URL) {
        try {
          const { Pool } = require("pg");
          pgPool = new Pool({
            connectionString:        process.env.DATABASE_URL,
            connectionTimeoutMillis: 3000,
            idleTimeoutMillis:       10000,
            max:                     5,
          });

          // CRITICAL: Must handle pool errors to prevent uncaughtException crashes
          pgPool.on('error', (err) => {
            console.warn('⚠️  [DATABASE] pg pool idle client error (non-fatal):', err.message);
          });

          const client = await pgPool.connect();
          await client.query("SELECT 1");
          client.release();
          useRealDb = true;
          console.log("✅ [DATABASE] Connected to PostgreSQL successfully.");
          return true;
        } catch (err) {
          console.warn("⚠️  [DATABASE] Cannot reach PostgreSQL:", err.message);
          console.warn("⚠️  [DATABASE] Using local emulated DB (db_emulated.json).");
          useRealDb = false;
          return false;
        }
      } else {
        console.warn("⚠️  [DATABASE] DATABASE_URL missing. Using local emulated DB.");
        useRealDb = false;
        return false;
      }
    })();
  }
  return dbCheckPromise;
};

// ---------------------------------------------------------------------------
// JSON database helpers
// ---------------------------------------------------------------------------
const EMPTY_DB = () => ({
  users:[], ai_employees:[], prompts:[], chats:[], messages:[],
  documents:[], document_chunks:[], settings:[], analytics:[], activity_logs:[]
});

function readDb() {
  if (!fs.existsSync(DB_PATH)) {
    const e = EMPTY_DB(); fs.writeFileSync(DB_PATH, JSON.stringify(e, null, 2)); return e;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    const empty = EMPTY_DB();
    let changed = false;
    for (const key of Object.keys(empty)) {
      if (!parsed[key]) {
        parsed[key] = [];
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), "utf8");
    }
    return parsed;
  }
  catch(_) { return EMPTY_DB(); }
}
function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
}

// ---------------------------------------------------------------------------
// Value resolver  ($1, NOW(), literal string, number, etc.)
// ---------------------------------------------------------------------------
function resolveVal(raw, params) {
  const v = (raw || "").trim();
  if (/^\$\d+$/.test(v)) return params[parseInt(v.slice(1)) - 1];
  if (v === "NULL" || v === "null") return null;
  if (v === "NOW()" || v === "CURRENT_TIMESTAMP") return new Date().toISOString();
  if (/^'.*'$/.test(v)) return v.slice(1,-1);
  if (/^".*"$/.test(v)) return v.slice(1,-1);
  const n = Number(v); if (!isNaN(n) && v !== "") return n;
  return v;
}

// ---------------------------------------------------------------------------
// WHERE clause parsing & matching
// ---------------------------------------------------------------------------
function parseWhere(str) {
  const cleaned = str.replace(/\s+(ORDER\s+BY|LIMIT|GROUP\s+BY).*/i,"").trim();
  return cleaned.split(/\s+AND\s+/i).map(part => {
    part = part.trim();
    if (/\s+IS\s+NOT\s+NULL/i.test(part)) return { field: part.replace(/\s+IS\s+NOT\s+NULL/i,"").trim(), op:"IS NOT NULL", valStr:"" };
    if (/\s+IS\s+NULL/i.test(part))     return { field: part.replace(/\s+IS\s+NULL/i,"").trim(), op:"IS NULL", valStr:"" };
    if (/\s+ILIKE\s+/i.test(part)) {
      const m = part.match(/(.+?)\s+ILIKE\s+(.+)/i);
      return { field:m[1].trim(), op:"ILIKE", valStr:m[2].trim() };
    }
    if (/\s+IN\s*\(/i.test(part)) {
      const m = part.match(/(.+?)\s+IN\s*\((.+)\)/i);
      return { field:m[1].trim(), op:"IN", valStr:m[2].trim() };
    }
    if (part.includes("!=") || part.includes("<>")) {
      const sep = part.includes("!=") ? "!=" : "<>";
      const idx = part.indexOf(sep);
      return { field:part.substring(0,idx).trim(), op:"!=", valStr:part.substring(idx+sep.length).trim() };
    }
    if (part.includes("=")) {
      const idx = part.indexOf("=");
      return { field:part.substring(0,idx).trim(), op:"=", valStr:part.substring(idx+1).trim() };
    }
    return null;
  }).filter(Boolean);
}

function pv(str, params) {
  const s=(str||"").trim();
  if (/^\$\d+$/.test(s)) return params[parseInt(s.slice(1))-1];
  if (/^'.*'$/.test(s)) return s.slice(1,-1);
  return s;
}

function getField(expr, row) {
  const bare = expr.trim().split(".").pop().toLowerCase();
  if (row[bare] !== undefined) return row[bare];
  for (const k of Object.keys(row)) {
    if (k.toLowerCase() === bare || k.toLowerCase().endsWith("_"+bare)) return row[k];
  }
  return undefined;
}

function matchRow(row, conds, params) {
  if (!conds || !conds.length) return true;
  return conds.every(({field,op,valStr}) => {
    const actual = getField(field,row);
    if (op==="IS NULL")     return actual==null;
    if (op==="IS NOT NULL") return actual!=null;
    if (op==="ILIKE") { const p=pv(valStr,params).replace(/%/g,"").toLowerCase(); return String(actual||"").toLowerCase().includes(p); }
    if (op==="IN")    { return valStr.split(",").map(v=>pv(v.trim(),params)).includes(String(actual)); }
    const exp = pv(valStr,params);
    if (op==="!=") return String(actual)!==String(exp);
    return String(actual)===String(exp);
  });
}

// ---------------------------------------------------------------------------
// Core emulator
// ---------------------------------------------------------------------------
function emulatedQuery(queryText, params=[]) {
  const sql = queryText.replace(/\s+/g," ").trim();

  // No-ops
  if (/^(BEGIN|COMMIT|ROLLBACK|CREATE\s+TABLE|SET\s+)/i.test(sql))
    return { rows:[], rowCount:0 };

  // SELECT 1 health probe
  if (/^SELECT\s+1$/i.test(sql)) return { rows:[{"?column?":1}], rowCount:1 };

  // ── INSERT ──────────────────────────────────────────────────────────────
  if (/^INSERT\s+INTO/i.test(sql)) {
    const m = sql.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\((.+?)\)(?:\s+ON\s+CONFLICT[^;]*?DO\s+NOTHING)?(?:\s+RETURNING\s+.*)?$/i);
    if (!m) throw new Error("Cannot parse INSERT: "+sql);

    const tableName = m[1].toLowerCase();
    const cols      = m[2].split(",").map(c=>c.trim());
    const rawVals   = m[3];

    // tokenise values respecting quoted strings
    const vals=[]; let cur="", inStr=false, paren=0;
    for (let i=0;i<rawVals.length;i++) {
      const ch=rawVals[i];
      if (ch==="'" && rawVals[i-1]!=="\\") inStr=!inStr;
      if (!inStr){ if(ch==="(")paren++; if(ch===")")paren--; }
      if(ch===","&&!inStr&&paren===0){vals.push(cur);cur="";}else cur+=ch;
    }
    vals.push(cur);

    const db   = readDb();
    const list = db[tableName] || [];
    const rec  = { id:crypto.randomUUID(), created_at:new Date().toISOString(), updated_at:new Date().toISOString() };
    cols.forEach((col,i)=>{ rec[col]=resolveVal(vals[i],params); });
    list.push(rec); db[tableName]=list; writeDb(db);
    return { rows:[rec], rowCount:1 };
  }

  // ── UPDATE ──────────────────────────────────────────────────────────────
  if (/^UPDATE/i.test(sql)) {
    const m = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+?)(?:\s+RETURNING.*)?$/i);
    if (!m) throw new Error("Cannot parse UPDATE: "+sql);

    const tableName = m[1].toLowerCase();
    const updates   = {};
    m[2].split(",").forEach(pair=>{
      const eq=pair.indexOf("="); if(eq===-1)return;
      const col=pair.substring(0,eq).trim();
      const raw=pair.substring(eq+1).trim();
      updates[col] = /CURRENT_TIMESTAMP|NOW\(\)/i.test(raw) ? new Date().toISOString() : resolveVal(raw,params);
    });

    const db      = readDb();
    const list    = db[tableName]||[];
    const conds   = parseWhere(m[3]);
    const changed = [];

    list.forEach(row=>{ if(matchRow(row,conds,params)){ Object.assign(row,updates); row.updated_at=new Date().toISOString(); changed.push(row); } });
    if (changed.length) writeDb(db);
    return { rows:changed, rowCount:changed.length };
  }

  // ── DELETE ──────────────────────────────────────────────────────────────
  if (/^DELETE\s+FROM/i.test(sql)) {
    const m = sql.match(/DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+RETURNING.*)?$/i);
    if (!m) throw new Error("Cannot parse DELETE: "+sql);

    const tableName = m[1].toLowerCase();
    const db        = readDb();
    const list      = db[tableName]||[];
    const conds     = m[2] ? parseWhere(m[2]) : [];
    const kept=[], removed=[];
    list.forEach(row=>{ (conds.length&&matchRow(row,conds,params)?removed:kept).push(row); });
    db[tableName]=kept;

    removed.forEach(({id})=>{
      if(tableName==="ai_employees"){
        db.prompts         =(db.prompts||[]).filter(r=>r.employee_id!==id);
        db.chats           =(db.chats||[]).filter(r=>r.employee_id!==id);
        db.documents       =(db.documents||[]).filter(r=>r.employee_id!==id);
        db.document_chunks =(db.document_chunks||[]).filter(r=>r.employee_id!==id);
        db.analytics       =(db.analytics||[]).filter(r=>r.employee_id!==id);
      } else if(tableName==="chats"){
        db.messages=(db.messages||[]).filter(r=>r.chat_id!==id);
      } else if(tableName==="documents"){
        db.document_chunks=(db.document_chunks||[]).filter(r=>r.document_id!==id);
      }
    });
    if(removed.length) writeDb(db);
    return { rows:removed, rowCount:removed.length };
  }

  // ── SELECT ──────────────────────────────────────────────────────────────
  if (/^SELECT/i.test(sql)) {
    if (/NOW\(\)|CURRENT_TIMESTAMP/i.test(sql)&&!/FROM/i.test(sql))
      return { rows:[{now:new Date().toISOString()}], rowCount:1 };

    const db     = readDb();
    const fromM  = sql.match(/\bFROM\s+(\w+)(?:\s+(\w+))?/i);
    if (!fromM) return { rows:[], rowCount:0 };

    const tableName  = fromM[1].toLowerCase();
    const tableAlias = (fromM[2]&&!/WHERE|JOIN|ON|ORDER|GROUP|LIMIT/i.test(fromM[2])) ? fromM[2].toLowerCase() : tableName;

    let rows = JSON.parse(JSON.stringify(db[tableName]||[]));
    // Add alias-prefixed shadow fields
    rows = rows.map(row=>{ const r={...row}; Object.keys(row).forEach(k=>{ r[`${tableAlias}_${k}`]=row[k]; }); return r; });

    // JOINs — process each in order, chaining the merged results
    const joinRe = /(LEFT\s+)?JOIN\s+(\w+)(?:\s+(\w+))?\s+ON\s+([\w.]+)\s*=\s*([\w.]+)/gi;
    let jm;
    while((jm=joinRe.exec(sql))!==null){
      const jTable = jm[2].toLowerCase();
      const jAlias = (jm[3]&&!/WHERE|ON|ORDER|GROUP|LIMIT/i.test(jm[3])) ? jm[3].toLowerCase() : jTable;
      const lSide  = jm[4].toLowerCase();
      const rSide  = jm[5].toLowerCase();
      const jList  = db[jTable]||[];
      const isLeft = !!jm[1];

      // Helper: look up a table.column reference from a merged row
      // Checks: alias_col, bare_col, or just col
      const resolveRef = (expr, row) => {
        const parts = expr.split('.');
        if (parts.length === 2) {
          const alias = parts[0];
          const col   = parts[1];
          // Try alias_col (e.g. e_id for e.id)
          if (row[`${alias}_${col}`] !== undefined) return row[`${alias}_${col}`];
          // Try just col
          if (row[col] !== undefined) return row[col];
          // Scan all keys ending in _col
          for (const k of Object.keys(row)) {
            if (k.toLowerCase() === col.toLowerCase() || k.toLowerCase().endsWith('_'+col.toLowerCase())) {
              return row[k];
            }
          }
          return undefined;
        }
        // No alias: just bare column name
        const col = parts[0];
        if (row[col] !== undefined) return row[col];
        for (const k of Object.keys(row)) {
          if (k.toLowerCase() === col.toLowerCase() || k.toLowerCase().endsWith('_'+col.toLowerCase())) {
            return row[k];
          }
        }
        return undefined;
      };

      rows = rows.map(row=>{
        const lVal = resolveRef(lSide, row);
        const match = jList.find(jr => {
          const rVal = resolveRef(rSide, jr);
          if (lVal !== undefined && rVal !== undefined && String(lVal) === String(rVal)) return true;
          // Try reversed
          const lVal2 = resolveRef(rSide, row);
          const rVal2 = resolveRef(lSide, jr);
          return lVal2 !== undefined && rVal2 !== undefined && String(lVal2) === String(rVal2);
        });
        if(!match&&isLeft) return row;
        if(!match) return null;
        const merged={...row};
        Object.keys(match).forEach(k=>{ merged[`${jAlias}_${k}`]=match[k]; if(!Object.prototype.hasOwnProperty.call(merged,k))merged[k]=match[k]; });
        if(jTable==="ai_employees"){ merged.employee_name=match.name; merged.employee_avatar=match.avatar_url; merged.employee_category=match.category; }
        if(jTable==="users"){ merged.user_name=match.name; merged.user_email=match.email; }
        return merged;
      }).filter(Boolean);
    }

    // WHERE
    const whereM = sql.match(/\bWHERE\s+(.+?)(?:\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if(whereM){ const conds=parseWhere(whereM[1]); rows=rows.filter(r=>matchRow(r,conds,params)); }

    // COUNT(*)
    if(/SELECT\s+COUNT\(\*\)/i.test(sql)){
      const gm=sql.match(/GROUP\s+BY\s+([\w.]+)/i);
      if(gm){ const gc=gm[1].split(".").pop().toLowerCase(); const g={}; rows.forEach(r=>{ const v=r[gc]; g[v]=(g[v]||0)+1; }); const gr=Object.entries(g).map(([k,v])=>({[gc]:k,name:k,value:v,count:v})); return {rows:gr,rowCount:gr.length}; }
      return { rows:[{count:String(rows.length)}], rowCount:1 };
    }

    // Aggregates (COALESCE / AVG / SUM)
    if(/COALESCE|AVG\(|SUM\(/i.test(sql)){
      let tt=0,tr=0,cnt=0; rows.forEach(r=>{ tt+=Number(r.tokens_used||0); tr+=Number(r.response_time||0); cnt++; });
      return { rows:[{ avg_time:cnt?String(Math.round(tr/cnt)):"0", total_tokens:String(tt), tokens:String(tt), total_cost:"0" }], rowCount:1 };
    }

    // Chart (TO_CHAR / date_trunc)
    if(/TO_CHAR|date_trunc/i.test(sql)){
      const days=[]; for(let i=6;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); days.push({ date_label:d.toLocaleDateString("en-US",{month:"short",day:"2-digit"}), conversations:0, tokens:"0" }); }
      rows.forEach(r=>{ const lbl=new Date(r.created_at).toLocaleDateString("en-US",{month:"short",day:"2-digit"}); const day=days.find(d=>d.date_label===lbl); if(day){ day.conversations++; day.tokens=String(Number(day.tokens)+Number(r.tokens_used||150)); } });
      return { rows:days, rowCount:days.length };
    }

    // ORDER BY
    const orderM=sql.match(/ORDER\s+BY\s+([\w.]+)(?:\s+(ASC|DESC))?/i);
    if(orderM){ const f=orderM[1].split(".").pop().toLowerCase(); const desc=(orderM[2]||"").toUpperCase()==="DESC"; rows.sort((a,b)=>{ let va=a[f],vb=b[f]; if(/at$|timestamp/.test(f)){va=new Date(va||0).getTime();vb=new Date(vb||0).getTime();} if(va<vb)return desc?1:-1; if(va>vb)return desc?-1:1; return 0; }); }

    // LIMIT
    const limitM=sql.match(/LIMIT\s+(\d+)/i);
    if(limitM) rows=rows.slice(0,parseInt(limitM[1]));

    return { rows, rowCount:rows.length };
  }

  return { rows:[], rowCount:0 };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
async function query(text, params) {
  await connectDb();
  if (useRealDb && pgPool) return pgPool.query(text, params);
  return emulatedQuery(text, params);
}

async function connect() {
  await connectDb();
  if (useRealDb && pgPool) return pgPool.connect();
  // Emulator client — BEGIN/COMMIT/ROLLBACK are accepted as no-ops
  return {
    query:   (text, p) => emulatedQuery(text, p),
    release: () => {},
  };
}

const pool = { query:(t,p)=>query(t,p), connect:()=>connect(), on:()=>{} };

module.exports = { pool, query, connectDb };
