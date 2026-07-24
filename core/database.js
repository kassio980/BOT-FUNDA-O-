/* ==========================================================
   🗄️ DATABASE STEMY FUNDAÇÃO — 4 FALLBACKS
   1) 🥇 node:sqlite (nativo Node 22+ → NÃO PRECISA INSTALAR NADA)
   2) 🥈 better-sqlite3
   3) 🥉 sqlite3
   4) 🏅 sql.js WASM (carrega SOB DEMANDA, sem await no topo)
   ==========================================================
   ⚠️ REGRAS OBEDECIDAS AQUI:
   • NENHUM await FORA DE FUNÇÃO (NUNCA MAIS ERRO ESM)
   • 100% CommonJS → require() funciona em QUALQUER lugar
   • Fallbacks são carregados SÓ se precisar
   ========================================================== */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', '.data');
const ARQ = path.join(DIR, 'stemy.db');
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

let DRIVER = 'nenhum';
let MODO = 'carregando';
let db = null;
let API = null;
let sqlJsCarregado = null; // cache do sql.js (carrega só 1 vez)

/* ---------- FUNÇÃO QUE CARREGA O BANCO (CHAMADA 1ª VEZ QUE USAR) ---------- */
function inicializar() {
  if (API) return; // já carregou

  // 1) 🥇 node:sqlite NATIVO (MELHOR DE TODOS — JÁ VEM NO NODE 24)
  try {
    const { DatabaseSync } = require('node:sqlite');
    db = new DatabaseSync(ARQ);
    db.exec('PRAGMA journal_mode=WAL;');
    db.exec('PRAGMA synchronous=NORMAL;');
    db.exec('PRAGMA foreign_keys=ON;');
    DRIVER = '🥇 node:sqlite NATIVO Node 24';
    MODO = 'nativo-sincrono';
    API = {
      run: async function (q, p) {
        p = p || [];
        const s = db.prepare(q);
        const r = p.length ? s.run.apply(s, p) : s.run();
        return { changes: r.changes || 0, lastInsertRowid: r.lastInsertRowid || 0 };
      },
      get: async function (q, p) {
        p = p || [];
        const s = db.prepare(q);
        return p.length ? s.get.apply(s, p) : s.get();
      },
      all: async function (q, p) {
        p = p || [];
        const s = db.prepare(q);
        return p.length ? s.all.apply(s, p) : s.all();
      },
      exec: async function (q) { return db.exec(q); },
      prepare: function (q) { return db.prepare(q); }
    };
    return;
  } catch (e1) {}

  // 2) 🥈 better-sqlite3
  try {
    const B = require('better-sqlite3');
    db = new B(ARQ);
    db.pragma('journal_mode=WAL');
    db.pragma('synchronous=NORMAL');
    db.pragma('foreign_keys=ON');
    DRIVER = '🥈 better-sqlite3';
    MODO = 'nativo-sincrono';
    API = {
      run: async function (q, p) {
        p = p || [];
        const r = db.prepare(q).run(p);
        return { changes: r.changes || 0, lastInsertRowid: r.lastInsertRowid || 0 };
      },
      get: async function (q, p) { return db.prepare(q).get(p || []); },
      all: async function (q, p) { return db.prepare(q).all(p || []); },
      exec: async function (q) { return db.exec(q); },
      prepare: function (q) { return db.prepare(q); }
    };
    return;
  } catch (e2) {}

  // 3) 🥉 sqlite3 (assíncrono, confiável)
  try {
    const S = require('sqlite3').verbose();
    db = new S.Database(ARQ);
    DRIVER = '🥉 sqlite3';
    MODO = 'assincrono';
    const R = function (q, p) {
      p = p || [];
      return new Promise(function (res, rej) {
        db.run(q, p, function (e) {
          if (e) return rej(e);
          res({ changes: this.changes || 0, lastInsertRowid: this.lastID || 0 });
        });
      });
    };
    const G = function (q, p) {
      p = p || [];
      return new Promise(function (res, rej) {
        db.get(q, p, function (e, r) { e ? rej(e) : res(r || null); });
      });
    };
    const A = function (q, p) {
      p = p || [];
      return new Promise(function (res, rej) {
        db.all(q, p, function (e, r) { e ? rej(e) : res(r || []); });
      });
    };
    const E = function (q) {
      return new Promise(function (res, rej) {
        db.exec(q, function (e) { e ? rej(e) : res(true); });
      });
    };
    db.serialize(function () {
      db.run('PRAGMA journal_mode=WAL');
      db.run('PRAGMA synchronous=NORMAL');
      db.run('PRAGMA foreign_keys=ON');
    });
    API = {
      run: R, get: G, all: A, exec: E,
      prepare: function () { return { run: R, get: G, all: A }; }
    };
    return;
  } catch (e3) {}

  // 4) 🏅 sql.js WASM — ÚLTIMO RECURSO (carrega SOB DEMANDA, SEM AWAIT NO TOPO!)
  DRIVER = '🏅 sql.js WASM (fallback final)';
  MODO = 'wasm-memoria';

  // Função que CARREGA o sql.js SÓ NA PRIMEIRA VEZ
  async function carregarSqlJs() {
    if (sqlJsCarregado) return sqlJsCarregado;
    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs(); // ✅ AQUI DENTRO DE FUNÇÃO → NÃO QUEBRA!
    let buf = null;
    try { buf = fs.existsSync(ARQ) ? fs.readFileSync(ARQ) : null; } catch (ee) {}
    db = new SQL.Database(buf);
    sqlJsCarregado = SQL;
    return SQL;
  }

  // Salva em arquivo a cada alteração
  function salvar() {
    try { if (db) fs.writeFileSync(ARQ, Buffer.from(db.export())); } catch (ee) {}
  }
  setInterval(salvar, 5000); // auto-salva a cada 5s

  // Converte linhas SQL.js em objetos bonitos
  function linhaParaObj(colunas, valores) {
    if (!valores) return null;
    const o = {};
    for (let i = 0; i < colunas.length; i++) o[colunas[i]] = valores[i];
    return o;
  }
  function todasParaObj(colunas, matriz) {
    return matriz.map(function (v) { return linhaParaObj(colunas, v); });
  }

  API = {
    run: async function (q, p) {
      await carregarSqlJs();
      p = p || [];
      db.run(q, p);
      salvar();
      return { changes: db.getRowsModified() || 0, lastInsertRowid: 0 };
    },
    get: async function (q, p) {
      await carregarSqlJs();
      p = p || [];
      const r = db.exec(q, p);
      if (!r.length) return null;
      return linhaParaObj(r[0].columns, r[0].values[0] || null);
    },
    all: async function (q, p) {
      await carregarSqlJs();
      p = p || [];
      const r = db.exec(q, p);
      if (!r.length) return [];
      return todasParaObj(r[0].columns, r[0].values);
    },
    exec: async function (q) {
      await carregarSqlJs();
      db.run(q);
      salvar();
      return true;
    },
    prepare: function () { return API; }
  };
}

/* ---------- EXPORTA TUDO — INICIALIZA AUTOMÁTICO NA PRIMEIRA CHAMADA ---------- */
module.exports = {
  get MODO() { inicializar(); return MODO; },
  get DRIVER() { inicializar(); return DRIVER; },
  get ARQ() { return ARQ; },
  get _raw() { inicializar(); return db; },
  run: async function (q, p) { inicializar(); return API.run(q, p); },
  get: async function (q, p) { inicializar(); return API.get(q, p); },
  all: async function (q, p) { inicializar(); return API.all(q, p); },
  exec: async function (q) { inicializar(); return API.exec(q); },
  prepare: function (q) { inicializar(); return API.prepare(q); },
  _inicializar: inicializar
};
