/* =========================================================
   🔌 PATCH FINAL — encaixa TUDO no app.js
   ✅ Rotas verificação URL pública
   ✅ API verificação
   ✅ API suporte bot
   ✅ API modelos infinitos
   ✅ Serve o painel premium novo
   ========================================================= */
const VER=require('./core/verificacao');
const SUP=require('./core/suporte_bot');
const EXT=require('./core/extras');
const fs=require('fs'),path=require('path');
const { app, bot } = require('./app.js');


// Inicializa tudo
Promise.all([VER.init(),SUP.init()]).then(()=>SUP.aplicarInfinitoTodos());

/* ========== PAINEL PREMIUM NOVO ========== */
app.get('/painel',(req,res)=>res.sendFile(path.join(__dirname,'painel.html')));
app.get('/admin',(req,res)=>res.redirect('/painel'));

/* ========== VERIFICAÇÃO URL PÚBLICA ========== */
app.get(['/verificar/:token','/v/:token'],(req,res)=>res.sendFile(path.join(__dirname,'views','verificacao.html')));

app.post('/api/verificar/:token',async(req,res)=>{
  const ip=(req.headers['x-forwarded-for']||req.ip||'').split(',')[0].trim();
  const r=await VER.executarVerificacao(req.params.token,{ip,user_agent:req.body?.user_agent||req.headers['user-agent']||''},{clientBot:bot});
  if(r.ok && r.cargo_aplicado)r.discord_url=`https://discord.com/channels/${r.cargo.servidor_id||'@me'}`;
  res.json(r);
});

app.get('/api/verificacao/stats',async(req,res)=>res.json({ok:true,dados:await VER.stats()}));
app.get('/api/verificacao/menu',async(req,res)=>res.json({ok:true,dados:await EXT.menuVerificacao(req.query.servidor_id)}));
app.post('/api/verificacao/configurar-cargo',async(req,res)=>{
  if(!req.body.servidor_id||!req.body.cargo_id)return res.status(400).json({ok:false,erro:'Faltam dados'});
  res.json(await VER.configurarCargo(req.body));
});

/* ========== SUPORTE BOT + CRIAÇÃO + LOGS ========== */
app.get('/api/suporte/stats',async(req,res)=>res.json({ok:true,dados:await SUP.stats()}));
app.get('/api/suporte/logs-criacao',async(req,res)=>res.json({ok:true,dados:await DB.all('SELECT * FROM logs_criacao_bots ORDER BY data DESC LIMIT ?',[req.query.limite||100])}));
app.post('/api/suporte/criar-bot',async(req,res)=>res.json(await EXT.criarBotParaUsuario(req.body)));
app.post('/api/suporte/limpar-codigo',(req,res)=>res.json({ok:true,limpo:SUP.limparCodigo(req.body.codigo||'')}));
app.post('/api/suporte/dividir-blocos',(req,res)=>res.json({ok:true,...EXT.organizarSistema(req.body.codigo||'')}));
app.post('/api/suporte/infinito',async(req,res)=>res.json(await SUP.aplicarInfinitoTodos()));

/* ========== MODELOS INFINITOS ========== */
app.get('/api/modelos',async(req,res)=>{
  const m=await SUP.listarModelos();
  res.json({ok:true,total:m.length,estoque:'INFINITO',quantidade:'INFINITA',dados:m});
});
app.get('/api/modelos/:id',async(req,res)=>{
  const m=await DB.get('SELECT m.*,mc.codigo_unico FROM modelos m LEFT JOIN modelos_config mc ON mc.modelo_base=m.pasta WHERE m.id=?',[req.params.id]);
  if(!m)return res.status(404).json({ok:false});
  m.estoque='INFINITO';m.quantidade='INFINITA';
  res.json({ok:true,dados:m});
});
app.get('/api/modelos/categoria/:cat',async(req,res)=>{
  const m=await DB.all('SELECT m.*,mc.codigo_unico FROM modelos m LEFT JOIN modelos_config mc ON mc.modelo_base=m.pasta WHERE m.categoria=? AND m.aprovado=1',[req.params.cat]);
  res.json({ok:true,total:m.length,estoque:'INFINITO',dados:m});
});

/* ========== RANKING ========== */
app.get('/api/ranking/criadores',async(req,res)=>res.json({ok:true,dados:await EXT.rankingCriadores(req.query.limite||10)}));

/* ========== LOGIN PAINEL ========== */
app.post('/api/login',(req,res)=>{
  const{usuario='',senha=''}=req.body||{};
  const ok=(usuario.toLowerCase().trim()==='admin' && senha==='fundação');
  if(ok)log('PAINEL','✅ Login admin:',req.ip||'local','Admin','SUCESSO');
  else log('PAINEL','❌ Login falhou:',`${usuario} | ${req.ip||'local'}`,'Admin','ERRO');
  res.json({ok,token:ok?'stemy_'+require('crypto').randomBytes(24).toString('hex'):null});
});

console.log('✅ 2F Patch final carregado · Todas rotas ativas');
