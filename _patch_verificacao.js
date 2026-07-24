/* =========================================================
   🔌 PATCH VERIFICAÇÃO STEMY — encaixa tudo no app.js
   ========================================================= */
const VF=require('./core/verificacao_fundacao');
const fs=require('fs'),path=require('path');
const {EmbedBuilder}=require('discord.js');

VF.init().then(()=>console.log('✅ 3E Sistema Verificação BOT FUNDAÇÃO inicializado'));

/* ---------- TELA NOVA DE VERIFICAÇÃO (todos bots usam ela) ---------- */
app.get(['/verificar/:token','/v/:token','/verificacao/:token'],(req,res)=>res.sendFile(path.join(__dirname,'views','verificar.html')));

/* ---------- API NOVA DE VERIFICAÇÃO (usa barra real + BOT FUNDAÇÃO) ---------- */
app.post('/api/verificar/:token',async(req,res)=>{
  const ip=(req.headers['x-forwarded-for']||req.ip||'').split(',')[0].trim();
  const ua=req.body?.user_agent||req.headers['user-agent']||'';
  // Tenta primeiro BOT FUNDAÇÃO (se for token dele)
  const tem=await DB.get('SELECT 1 FROM verificacao_fundacao WHERE token_usado=?',[req.params.token]);
  let r;
  if(tem) r=await VF.confirmar(req.params.token,{ip,user_agent:ua},{clientBot:bot});
  else   r=await VER.executarVerificacao(req.params.token,{ip,user_agent:ua},{clientBot:bot});
  if(r.ok && !r.discord_url) r.discord_url=`https://discord.com/channels/${r.cargo?.servidor_id||'@me'}`;
  res.json(r);
});

/* ---------- API BOT FUNDAÇÃO ---------- */
app.post('/api/vf/config',async(req,res)=>res.json(await VF.salvarConfig(req.body)));
app.get('/api/vf/config/:sid',async(req,res)=>{const c=await VF.getConfig(req.params.sid);res.json(c?{ok:true,dados:c}:{ok:false})});
app.get('/api/vf/stats',async(req,res)=>{
  const s=await VF.stats(req.query.servidor_id||'STEMY_MASTER');
  const sv=await VF.servidoresAtivos();
  res.json({ok:true,dados:{...s,servidores:sv.length}});
});
app.get('/api/vf/buscar',async(req,res)=>res.json({ok:true,...await VF.buscarVerificados(req.query)}));
app.get('/api/vf/exportar',async(req,res)=>{
  const csv=await VF.exportarCSV(req.query.servidor_id||'');
  res.setHeader('Content-Type','text/csv; charset=utf-8');
  res.setHeader('Content-Disposition','attachment; filename="verificados_stemy_fundacao.csv"');
  res.send('\uFEFF'+csv);
});
app.get('/api/vf/servidores',async(req,res)=>res.json({ok:true,dados:await VF.servidoresAtivos()}));

/* ---------- LINK RÁPIDO: /verificar/me?uid=...&sid=... ---------- */
app.get('/api/vf/link',async(req,res)=>{
  if(!req.query.uid||!req.query.sid)return res.status(400).json({ok:false});
  res.json(await VF.gerarLink({usuario_id:req.query.uid,usuario_nome:req.query.nome||'Usuario',servidor_id:req.query.sid,baseUrl:process.env.URL_BASE||'https://bot-funda-o.onrender.com'}));
});

/* ---------- ATIVAR IMAGEM / ASSETS ---------- */
app.use('/assets',require('express').static(path.join(__dirname,'assets'),{maxAge:'30d'}));

/* ---------- COMANDO /verificar + BOTÃO no Discord ---------- */
const CMD_VERIFICAR=require('./comandos/verificar_fundacao');
// Registra no slash loader (se existir)
try{
  global.COMANDOS=global.COMANDOS||{};
  global.COMANDOS['verificar']=CMD_VERIFICAR;
}catch(e){}

// Hook no client: registra o comando + ouve botões
if(bot && bot.on){
  const _ready=bot.listeners('ready')[0];
  bot.once('ready',async()=>{
    try{
      const {REST,Routes}=require('discord.js');
      const rest=new REST({version:'10'}).setToken(process.env.STEMY_TOKEN||'');
      const cmds=(await rest.get(Routes.applicationCommands(bot.user.id)))||[];
      if(!cmds.find(c=>c.name==='verificar')){
        await rest.post(Routes.applicationCommands(bot.user.id),{body:[CMD_VERIFICAR.data.toJSON()]});
        console.log('✅ /verificar registrado globalmente');
      }
    }catch(e){console.log('ℹ️ /verificar já existia ou falhou:',e.message.split('\n')[0])}
  });
  bot.on('interactionCreate',async i=>{
    try{
      if(i.isChatInputCommand() && i.commandName==='verificar') return CMD_VERIFICAR.run(i);
      if(i.isButton()){
        const r=await CMD_VERIFICAR.botao(i);
        if(r===false) return;
      }
    }catch(e){try{i.reply({content:'❌ '+e.message,ephemeral:true}).catch(()=>{})}catch(_){}}
  });
}

console.log('✅ 3E Todas rotas verificação ativas · /verificar · /api/vf/* · assets');
