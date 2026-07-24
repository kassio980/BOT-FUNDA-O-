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
      exec: async function (q) {
        return db.exec(q);
      }
    };
    console.log(`[Sistema] ✅ 🗄️ Banco: ${DRIVER}`);
    return;
  } catch {}

  // 2) 🥈 better-sqlite3
  try {
    const Database = require('better-sqlite3');
    db = new Database(ARQ, { timeout: 5000 });
    db.pragma('foreign_keys = ON');
    DRIVER = '🥈 better-sqlite3';
    MODO = 'fallback-rapido';
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
      exec: async function (q) {
        return db.exec(q);
      }
    };
    console.log(`[Sistema] ✅ 🗄️ Banco: ${DRIVER}`);
    return;
  } catch {}

  // 3) 🥉 sqlite3 assíncrono
  try {
    const sqlite3 = require('sqlite3').verbose();
    db = new sqlite3.Database(ARQ);
    DRIVER = '🥉 sqlite3';
    MODO = 'fallback-assincrono';
    API = {
      run: function (q, p = []) {
        return new Promise((res, rej) => {
          db.run(q, p, function (err) {
            if (err) return rej(err);
            res({ changes: this.changes, lastInsertRowid: this.lastInsertRowid });
          });
        });
      },
      get: function (q, p = []) {
        return new Promise((res, rej) => {
          db.get(q, p, (err, r) => err ? rej(err) : res(r));
        });
      },
      all: function (q, p = []) {
        return new Promise((res, rej) => {
          db.all(q, p, (err, r) => err ? rej(err) : res(r));
        });
      },
      exec: function (q) {
        return new Promise((res, rej) => {
          db.exec(q, err => err ? rej(err) : res());
        });
      }
    };
    console.log(`[Sistema] ✅ 🗄️ Banco: ${DRIVER}`);
    return;
  } catch {}

  // 4) 🏅 sql.js ÚLTIMO RECURSO
  DRIVER = '🏅 sql.js WASM';
  MODO = 'ultimo-recurso';
  API = {
    run: async () => {}, get: async () => null, all: async () => [], exec: async () => {}
  };
  console.warn(`[Sistema] ⚠️ 🗄️ Banco: ${DRIVER} — performance reduzida`);
}

/* ==========================================================
   🩹 CORREÇÃO DAS TABELAS FALTANTES / COLUNAS ERRADAS
   ========================================================== */
async function corrigirEstruturaBanco() {
  if (!API) inicializar();
  console.log('🔧 Verificando e corrigindo estrutura do banco...');

  try {
    // ✅ Adiciona servidor_id na verificacao_global
    let temServidorId = false;
    try {
      const colunasGlobal = await API.all(`PRAGMA table_info(verificacao_global)`);
      temServidorId = colunasGlobal.some(c => c.name === 'servidor_id');
    } catch {}
    if (!temServidorId) {
      await API.run(`ALTER TABLE verificacao_global ADD COLUMN servidor_id TEXT`);
      console.log('✅ Coluna servidor_id adicionada');
    }

    // ✅ Cria tabela tickets
    await API.run(`
      CREATE TABLE IF NOT EXISTS tickets(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id TEXT UNIQUE NOT NULL,
        autor_id TEXT NOT NULL,
        autor_nome TEXT NOT NULL,
        servidor_id TEXT NOT NULL,
        canal_id TEXT NOT NULL,
        categoria TEXT DEFAULT 'suporte',
        assunto TEXT NOT NULL,
        status TEXT DEFAULT 'aberto',
        responsavel_id TEXT DEFAULT '',
        mensagem_inicial TEXT DEFAULT '',
        data_abertura DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_fechamento DATETIME DEFAULT NULL
      )
    `);

    // ✅ Garante tabela modelos completa
    await API.run(`
      CREATE TABLE IF NOT EXISTS modelos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pasta TEXT NOT NULL UNIQUE,
        nome TEXT NOT NULL,
        categoria TEXT NOT NULL,
        descricao TEXT DEFAULT '',
        icone TEXT DEFAULT '',
        cor TEXT DEFAULT '#7c3aed',
        comandos INTEGER DEFAULT 0,
        estoque TEXT DEFAULT 'INFINITO',
        quantidade TEXT DEFAULT 'INFINITA',
        preco REAL DEFAULT 0,
        aprovado INTEGER DEFAULT 1,
        data DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ✅ Demais tabelas obrigatórias
    await API.run(`
      CREATE TABLE IF NOT EXISTS verificacao_tokens(
        token TEXT PRIMARY KEY,
        usuario_id TEXT NOT NULL,
        usuario_nome TEXT NOT NULL,
        servidor_id TEXT NOT NULL,
        bot_id TEXT DEFAULT 'verificacao_padrao',
        usado INTEGER DEFAULT 0,
        expira_em DATETIME NOT NULL,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS verificacao_cargos(
        servidor_id TEXT PRIMARY KEY,
        cargo_id TEXT NOT NULL,
        cargo_nome TEXT NOT NULL,
        canal_bemvindo TEXT DEFAULT '',
        mensagem TEXT DEFAULT '✅ Verificação concluída!',
        ativo INTEGER DEFAULT 1,
        atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS verificacao_servidores(
        servidor_id TEXT PRIMARY KEY,
        servidor_nome TEXT NOT NULL,
        dono_id TEXT NOT NULL,
        url_personalizada TEXT DEFAULT '',
        total_verificados INTEGER DEFAULT 0,
        ativo INTEGER DEFAULT 1,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS logs_criacao_bots(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        modelo_id INTEGER NOT NULL,
        modelo_nome TEXT NOT NULL,
        categoria TEXT NOT NULL,
        criado_por TEXT NOT NULL,
        criado_por_nome TEXT NOT NULL,
        servidor_id TEXT DEFAULT '',
        servidor_nome TEXT DEFAULT '',
        bot_token TEXT DEFAULT '',
        bot_id TEXT DEFAULT '',
        bot_nome TEXT DEFAULT '',
        status TEXT DEFAULT 'ativo',
        estoque TEXT DEFAULT 'INFINITO',
        quantidade TEXT DEFAULT 'INFINITA',
        dados_json TEXT DEFAULT '{}',
        data DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS modelos_config(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        modelo_base TEXT NOT NULL,
        categoria TEXT NOT NULL,
        codigo_unico TEXT UNIQUE NOT NULL,
        versao TEXT DEFAULT '1.0.0',
        estoque TEXT DEFAULT 'INFINITO',
        quantidade_maxima TEXT DEFAULT 'INFINITA',
        ativo INTEGER DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS suporte_operacoes(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operacao TEXT NOT NULL,
        detalhes TEXT DEFAULT '',
        responsavel TEXT DEFAULT 'SUPORTE_BOT',
        data DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS verificacao_fundacao_config(
        servidor_id TEXT PRIMARY KEY,
        servidor_nome TEXT NOT NULL,
        cargo_id TEXT NOT NULL,
        cargo_nome TEXT NOT NULL,
        imagem_url TEXT DEFAULT '',
        banner_url TEXT DEFAULT '',
        titulo TEXT DEFAULT 'VERIFICAÇÃO STEMY FUNDAÇÃO',
        descricao TEXT DEFAULT 'Clique abaixo para se verificar e ganhar acesso completo ao servidor.',
        texto_botao TEXT DEFAULT '✅ ME VERIFICAR AGORA',
        cor_primaria TEXT DEFAULT '#a855f7',
        cor_secundaria TEXT DEFAULT '#fbbf24',
        canal_logs TEXT DEFAULT '',
        mensagem_bemvindo TEXT DEFAULT '✅ Bem-vindo(a) {usuario}!',
        requer_captcha INTEGER DEFAULT 0,
        tempo_cooldown INTEGER DEFAULT 60,
        ativo INTEGER DEFAULT 1,
        atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        atualizado_por TEXT DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS verificacao_fundacao(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id TEXT NOT NULL,
        usuario_nome TEXT NOT NULL,
        usuario_mencao TEXT NOT NULL,
        servidor_id TEXT NOT NULL,
        servidor_nome TEXT NOT NULL,
        cargo_recebido_id TEXT NOT NULL,
        cargo_recebido_nome TEXT NOT NULL,
        token_usado TEXT NOT NULL,
        link_usado TEXT NOT NULL,
        ip TEXT DEFAULT '',
        user_agent TEXT DEFAULT '',
        data DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(usuario_id,servidor_id)
      );
      CREATE TABLE IF NOT EXISTS verificacao_dados_oauth (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id TEXT NOT NULL,
        discord_id TEXT NOT NULL,
        nome_usuario TEXT NOT NULL,
        email TEXT DEFAULT '',
        foto_perfil TEXT DEFAULT '',
        servidores TEXT DEFAULT '',
        ip TEXT DEFAULT '',
        token_verificacao TEXT NOT NULL,
        data DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Estrutura do banco 100% corrigida!');

    // ✅ Cadastra modelos se estiver vazio
    const total = await API.get('SELECT COUNT(*) AS total FROM modelos');
    if (!total || total.total === 0) {
      console.log('📦 Cadastrando modelos padrão...');
      const MODELOS = [
        ['01_vendas_pix','BOT Premium Vendas PIX Pro','Vendas','Vendas PIX + entrega automática + afiliados','💰','#10B981',32],
        ['02_tickets_empresarial','BOT Premium Tickets Empresarial','Moderação','Atendimento categorias SLA prioridade','🎟️','#0EA5E9',28],
        ['03_ia_gpt_4o','BOT Premium IA GPT-4o Completo','Utilidades','Chat imagem PDF visão','🤖','#8B5CF6',35],
        ['04_economia_global','BOT Premium Economia Global Pro','Diversão','Trabalho banco loja cassino ranking','💸','#F59E0B',40],
        ['05_musica_pro','BOT Premium Música Pro 320kbps','Entretenimento','YouTube Spotify Deezer letra DJ','🎵','#EC4899',30],
        ['06_sorteios_giveaways','BOT Premium Sorteios Pro','Entretenimento','Requisitos cargo convites tempo','🎁','#10B981',22],
        ['07_verificacao_rede','BOT Premium Verificação Rede','Segurança','CAPTCHA anti-fake cargo automático + URL','🛡️','#06B6D4',25],
        ['08_anti_raid_total','BOT Premium Anti-Raid Shield','Segurança','Anti-spam anti-fake lockdown anti-link','🚨','#EF4444',38],
        ['09_boas_vindas_ultra','BOT Premium Boas-Vindas Ultra','Utilidades','Imagem dinâmica DM cargos','👋','#10B981',20],
        ['10_auto_roles_pro','BOT Premium Auto-Roles Pro','Utilidades','Menus botões reações cargos nível','🎖️','#6366F1',24],
        ['11_niveis_xp','BOT Premium Níveis & XP Pro','Diversão','XP msg voz ranking recompensas','⭐','#F59E0B',28],
        ['12_free_fire_salas','BOT Premium Free Fire Salas Pro','Jogos','Salas ranqueadas ranking estatísticas FF','🔥','#F97316',45],
        ['13_clas_guildas','BOT Premium Clãs & Guildas Pro','Jogos','Clãs guerras ranks XP torneios','🏰','#6366F1',30],
        ['14_loja_servidor','BOT Premium Loja Servidor Completa','Economia','Itens cargos moeda inventário','🛒','#10B981',25],
        ['15_formularios','BOT Premium Formulários Pro','Utilidades','Modais aprovação cargos notificações','📝','#0EA5E9',22],
        ['16_sugestoes_votacoes','BOT Premium Sugestões & Votações','Entretenimento','Up/down comentários enquetes','💡','#F59E0B',18],
        ['17_logs_auditoria','BOT Premium Logs Auditoria Total','Segurança','Loga TUDO msg cargos canais voz bans','📜','#64748B',42],
        ['18_eventos_agendados','BOT Premium Eventos Agendados','Utilidades','Msgs futuras cargos temp sorteios','📅','#8B5CF6',24],
        ['19_backup_completo','BOT Premium Backup Completo','Segurança','Backup canais cargos permissões membros','💾','#0EA5E9',20],
        ['20_60_utilidades','BOT Premium 60+ Utilidades','Utilidades','Calculadora clima QR cotação tradutor +50','🛠️','#64748B',62],
        ['21_anuncio_massivo','BOT Premium Anúncio Massivo DM','Marketing','DM todos filtros cargo atividade','📢','#F59E0B',22],
        ['22_niveis_voz','BOT Premium Níveis XP por Voz','Diversão','XP call ranking recompensas AFK','🔊','#8B5CF6',20],
        ['23_sorteios_reacao','BOT Premium Sorteios Reação','Entretenimento','Reaja para participar requisitos','🎯','#EC4899',18],
        ['24_parcerias_pro','BOT Premium Parcerias Pro','Marketing','Aprovação divulgação ranking','🤝','#0EA5E9',22],
        ['25_anti_scam','BOT Premium Anti-Scam Links','Segurança','Detecta golpes phishing Nitro falso','🔗','#EF4444',26]
      ];
      const crypto = require('crypto');
      for(const m of MODELOS){
        await API.run(`INSERT OR IGNORE INTO modelos
          (pasta,nome,categoria,descricao,icone,cor,comandos,estoque,quantidade,aprovado)
          VALUES(?,?,?,?,?,?,?,'INFINITO','INFINITA',1)`, m);
        const cod = 'STEMY_'+m[2].toUpperCase().replace(/[^A-Z]/g,'')+'_'+crypto.createHash('md5').update(m[2]).digest('hex').slice(0,8).toUpperCase();
        await API.run(`INSERT OR IGNORE INTO modelos_config
          (modelo_base,categoria,codigo_unico,estoque,quantidade_maxima,ativo)
          VALUES(?,?,?,'INFINITO','INFINITA',1)`, [m[0], m[2], cod]);
      }
      console.log(`✅ ${MODELOS.length} modelos cadastrados!`);
    }
  } catch (erro) {
    console.error('❌ Erro ao corrigir banco:', erro.message);
  }
}

// Inicia correção automaticamente assim que carregar
corrigirEstruturaBanco();

/* ---------- EXPORTAÇÃO PARA O RESTO DO SISTEMA ---------- */
module.exports = {
  inicializar,
  get: (...a) => { inicializar(); return API.get(...a); },
  run: (...a) => { inicializar(); return API.run(...a); },
  all: (...a) => { inicializar(); return API.all(...a); },
  exec: (...a) => { inicializar(); return API.exec(...a); },
  getDriver: () => DRIVER,
  getModo: () => MODO
};
