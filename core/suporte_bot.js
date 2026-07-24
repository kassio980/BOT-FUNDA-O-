/* =========================================================
   🤖 SUPORTE BOT — Organiza, limpa e gerencia TODO o sistema
   ✅ Blocos divididos por 2 automaticamente
   ✅ Loga tudo: bot criado · quem criou · quando
   ✅ Estoque infinito em todos os modelos
   ✅ Quantidade infinita de modelos
   ========================================================= */
const DB=require('./database');
const {log}=require('./logger');
const fs=require('fs'),path=require('path');

async function init(){
  await DB.exec(`
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
  `);
  await registrarOperacao('SUPORTE_BOT_INICIADO','Sistema de organização carregado');
}

/* 📝 REGISTRAR CRIAÇÃO DE BOT */
async function registrarBotCriado(dados){
  const id=(await DB.run(`INSERT INTO logs_criacao_bots
    (modelo_id,modelo_nome,categoria,criado_por,criado_por_nome,servidor_id,servidor_nome,bot_token,bot_id,bot_nome,dados_json)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)`,[
    dados.modelo_id,dados.modelo_nome,dados.categoria,
    dados.criado_por,dados.criado_por_nome,
    dados.servidor_id||'',dados.servidor_nome||'',
    dados.bot_token||'',dados.bot_id||'',dados.bot_nome||'',
    JSON.stringify(dados.extra||{})
  ])).lastInsertRowid;
  log('SUPORTE_BOT','🤖 BOT CRIADO:',`${dados.modelo_nome} → ${dados.criado_por_nome}`,dados.criado_por_nome,'SUCESSO');
  return id;
}

/* 📦 GARANTIR ESTOQUE + QUANTIDADE INFINITOS EM TODOS OS MODELOS */
async function aplicarInfinitoTodos(){
  await DB.run("UPDATE modelos SET estoque='INFINITO',quantidade='INFINITA'");
  await DB.run("UPDATE modelos_config SET estoque='INFINITO',quantidade_maxima='INFINITA'");
  await DB.run("UPDATE logs_criacao_bots SET estoque='INFINITO',quantidade='INFINITA'");
  await registrarOperacao('ESTOQUE_INFINITO_APLICADO','Todos os modelos agora tem estoque ∞');
  return{ok:true,msg:'Estoque e quantidade infinitos aplicados em TUDO'};
}

/* 🧹 LIMPAR CÓDIGO — remove comentários, espaços duplicados */
function limparCodigo(codigo){
  return codigo
    .replace(/\/\/[^\n]*/g,'')
    .replace(/\/\*[\s\S]*?\*\//g,'')
    .replace(/\n{3,}/g,'\n\n')
    .replace(/[ \t]+$/gm,'')
    .trim();
}

/* ✂️ DIVIDIR BLOCOS POR 2 AUTOMATICAMENTE */
function dividirBlocosPor2(codigo,separador='\n\n/* BLOCO '){
  const blocos=codigo.split(separador).filter(Boolean);
  const saida=[];
  for(let i=0;i<blocos.length;i+=2){
    saida.push([blocos[i],blocos[i+1]].filter(Boolean).join(separador));
  }
  return saida;
}

/* 📋 LISTAR TODOS OS MODELOS COM CÓDIGO ÚNICO POR CATEGORIA */
async function listarModelos(){
  return await DB.all('SELECT m.*,mc.codigo_unico,mc.versao FROM modelos m LEFT JOIN modelos_config mc ON mc.modelo_base=m.pasta WHERE m.aprovado=1 ORDER BY m.id');
}

/* 📊 ESTATÍSTICAS DO SUPORTE */
async function stats(){
  const total=await DB.get('SELECT COUNT(*)n FROM logs_criacao_bots');
  const hoje=await DB.get('SELECT COUNT(*)n FROM logs_criacao_bots WHERE DATE(data)=DATE("now")');
  const por_cat=await DB.all('SELECT categoria,COUNT(*)n FROM logs_criacao_bots GROUP BY categoria ORDER BY n DESC');
  const top_criadores=await DB.all('SELECT criado_por_nome,COUNT(*)n FROM logs_criacao_bots GROUP BY criado_por_nome ORDER BY n DESC LIMIT 10');
  return{total:total.n,hoje:hoje.n,por_categoria:por_cat,top_criadores};
}

async function registrarOperacao(op,det=''){
  await DB.run('INSERT INTO suporte_operacoes(operacao,detalhes)VALUES(?,?)',[op,String(det).slice(0,500)]);
}

module.exports={init,registrarBotCriado,aplicarInfinitoTodos,limparCodigo,dividirBlocosPor2,listarModelos,stats,registrarOperacao};
