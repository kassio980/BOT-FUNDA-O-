require('dotenv').config({ silent: true });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { log } = require('./core/logger');
const { Client, GatewayIntentBits, Collection } = require('discord.js');

const express = require('express');
const cors = require('cors');
const QR = require('qrcode');
const app = express();
const P = process.env.PORTA || process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

const DB = require('./core/database');
const VOZ = require('./voz_permanente');
log('SISTEMA', '🗄️ Banco:', DB.getDriver(), '', 'SUCESSO');

// ==========================================================
// 🏠 ROTAS DA API
// ==========================================================
app.get('/',(req,res)=>res.json({ok:true,plataforma:'STEMY FUNDAÇÃO V2.5'}));

app.get('/api/docs',(req,res)=>res.send(`<!DOCTYPE html><html><head><meta charset=utf-8><title>Documentação</title></head><body style=font-family:monospace;background:#111;color:#eee;padding:20px>
<h1>📚 Rotas da API</h1><pre>
GET  /                          → Status
GET  /painel                    → Painel Admin
GET  /api/docs                  → Esta página
GET  /api/bots                  → 25 Bots Premium
GET  /api/voz                   → Status Voz
POST /api/voz/entrar            → {servidor_id,canal_id}
POST /api/voz/sair              → {servidor_id}
POST /api/pix                   → Gerar PIX
POST /api/pedidos               → Criar pedido
POST /api/pedidos/:id/pagar     → Marcar pago
</pre></body></html>`));

app.get('/api/bots',async(req,res)=>res.json({ok:true,total:25}));
app.get('/api/bots/:id',async(req,res)=>{const m=await DB.get('SELECT * FROM modelos WHERE id=?', [req.params.id]);res.json({ok:!!m,dados:m});});

app.get('/api/voz',async(req,res)=>res.json({ok:true}));
app.post('/api/voz/entrar',async(req,res)=>{if(!bot)return res.json({ok:false,erro:'Bot não inicializado'});res.json({ok:true});});
app.post('/api/voz/sair',async(req,res)=>res.json({ok:true}));

function gerarPIX({valor,chave,nome='STEMY FUNDAÇÃO',cidade='SALVADOR'}){
  const txid='STY'+crypto.randomBytes(10).toString('hex').toUpperCase();
  const E=(t,v)=>String(t).padStart(2,'0')+String(v.length).padStart(2,'0')+v;
  const p=E(0,'01')+E(26,E(0,'BR.GOV.BCB.PIX')+E(1,chave))+E(52,'0000')+E(53,'BRL')+E(54,String(valor.toFixed(2)))+E(58,'BR')+E(59,nome)+E(60,cidade)+E(62,E(0,txid));
  let crc=0xFFFF;[...Buffer.from(p+'6304')].forEach(b=>{crc^=(b<<8);for(let i=0;i<8;i++)crc=(crc&1)?0x1021^(crc>>1):crc>>1;});
  return{ok:true,copia_cola:p+'6304'+(crc&0xFFFF).toString(16).toUpperCase()};
}
app.post('/api/pix',async(req,res)=>res.json(gerarPIX(req.body)));
app.post('/api/pedidos',async(req,res)=>{const p=gerarPIX(req.body);await DB.run('INSERT INTO pedidos SET ?',req.body);res.json(p);});
app.post('/api/pedidos/:id/pagar',async(req,res)=>{await DB.run('UPDATE pedidos SET pago=1 WHERE id=?',[req.params.id]);res.json({ok:true});});

app.get('/painel',async(req,res)=>{
  const TK=await DB.get('SELECT COUNT(*) AS abertos FROM tickets WHERE status="aberto"');
  const VD=await DB.get('SELECT COUNT(*) AS pedidos, COALESCE(SUM(valor),0) AS total FROM pedidos');
  const VF=await DB.get('SELECT COUNT(DISTINCT usuario_id) AS u FROM verificacao_fundacao');
  const MD=await DB.get('SELECT COUNT(*) AS n FROM modelos WHERE aprovado=1');
  const BOTS=await DB.all('SELECT * FROM modelos LIMIT 5');
  res.send(`<html><body style=background:#111;color:#eee;padding:20px;font-family:system-ui>
  <h1>🎛️ Painel STEMY FUNDAÇÃO</h1>
  <p>Tickets abertos: ${TK?.abertos||0}</p>
  <p>Pedidos: ${VD?.pedidos||0} | Total R$ ${VD?.total||0}</p>
  <p>Verificações: ${VF?.u||0}</p>
  <p>Modelos ativos: ${MD?.n||0}</p>
  </body></html>`);
});

log('SISTEMA','ℹ️ Modo completo ativado','','','AVISO');

// ==========================================================
// 🤖 INICIALIZAÇÃO DO BOT DISCORD
// ==========================================================
const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});
bot.commands = new Collection();

// ==========================================================
// 🚀 LIGAR SERVIDOR
// ==========================================================
const S=app.listen(P,'0.0.0.0',()=>{
  console.log('\n'+'═'.repeat(62));
  console.log('🚀 STEMY FUNDAÇÃO V2.5 — ONLINE NA PORTA',P);
  console.log('═'.repeat(62));
  console.log('🏠  Raiz:        http://localhost:'+P);
  console.log('🎛️  Painel:      http://localhost:'+P+'/painel');
  console.log('📚  Docs:        http://localhost:'+P+'/api/docs');
  console.log('🤖  Bots:        http://localhost:'+P+'/api/bots');
  console.log('🎤  Voz:         http://localhost:'+P+'/api/voz');
  console.log('═'.repeat(62));
  console.log('💡 Discord: /stemy_ajuda  |  Voz: /stemy_entrar_voz');
  console.log('');
});

// ==========================================================
// 🛡️ TRATAMENTO DE ERROS
// ==========================================================
process.on('uncaughtException',e=>log('SISTEMA','❌',e.message,'','ERRO'));
process.on('unhandledRejection',e=>log('SISTEMA','❌ Promise',e.message,'','ERRO'));
process.on('SIGINT',()=>{console.log('\n👋 Desligando...');S.close();bot.destroy();process.exit(0);});

// ==========================================================
// 📤 EXPORTA PRIMEIRO PARA OS OUTROS ARQUIVOS VEREM
// ==========================================================
module.exports={app,bot,S,P};

// ==========================================================
// 📦 AGORA SIM CARREGA OS PATCHES
// ==========================================================
require("./_patch_app.js");
require('./_patch_oauth.js');

// ==========================================================
// 🔐 POR ÚLTimo FAZ LOGIN
// ==========================================================
bot.login(process.env.DISCORD_TOKEN)
.then(()=>log('BOT','✅','Login feito com sucesso!','','SUCESSO'))
.catch(e=>log('BOT','❌','Login:',e.message,'','ERRO'));
