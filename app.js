require('dotenv').config({silent:true});
const fs=require('fs'),path=require('path');
const {log}=require('./core/logger');
const DB=require('./core/database');
const VOZ=require('./voz_permanente');
log('SISTEMA','🗄️ Banco:',DB.DRIVER,'','SUCESSO');

const express=require('express'),cors=require('cors'),QR=require('qrcode'),crypto=require('crypto');
const app=express();const P=process.env.PORTA||process.env.PORT||3000;
app.disable('x-powered-by');app.use(cors({origin:'*'}));
app.use(express.json({limit:'100mb'}));app.use(express.urlencoded({extended:true,limit:'100mb'}));

// 🏠 RAIZ
app.get('/',(req,res)=>res.json({ok:true,plataforma:'STEMY FUNDAÇÃO',versao:'2.5.0',banco:DB.DRIVER,voz:'/api/voz',docs:'/api/docs',painel:'/painel',status:'🟢 ONLINE'}));

// 📚 DOCS
app.get('/api/docs',(req,res)=>res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>API STEMY</title></head><body style="font-family:Arial;background:#0b1120;color:#fff;padding:40px;max-width:900px;margin:auto"><h1 style="color:#818cf8">📚 API STEMY FUNDAÇÃO V2.5</h1><pre style="background:#1e293b;padding:20px;border-radius:10px">
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

// 🤖 BOTS
app.get('/api/bots',async(req,res)=>res.json({ok:true,total:25,dados:await DB.all('SELECT * FROM modelos ORDER BY id LIMIT 25')}));
app.get('/api/bots/:id',async(req,res)=>{const m=await DB.get('SELECT * FROM modelos WHERE id=?',[req.params.id]);res.json(m?{ok:true,dados:m}:res.status(404).json({ok:false}));});

// 🎤 VOZ API
app.get('/api/voz',async(req,res)=>res.json({ok:true,dados:await VOZ.status(req.query.servidor_id||'')}));
app.post('/api/voz/entrar',async(req,res)=>{if(!bot)return res.status(503).json({ok:false,erro:'Bot offline'});const sv=bot.guilds.cache.get(req.body.servidor_id);if(!sv)return res.status(404).json({ok:false});const ch=sv.channels.cache.get(req.body.canal_id);if(!ch)return res.status(404).json({ok:false});res.json(await VOZ.entrar(ch));});
app.post('/api/voz/sair',async(req,res)=>res.json({ok:await VOZ.sair(req.body.servidor_id)}));

// 💰 PIX
function gerarPIX({valor,chave,nome='STEMY FUNDAÇÃO',cidade='SALVADOR'}){
  const txid='STY'+crypto.randomBytes(10).toString('hex').toUpperCase().slice(0,25);
  const E=(t,v)=>String(t).padStart(2,'0')+String(v.length).padStart(2,'0')+v;
  const p=E(0,'01')+E(26,E(0,'BR.GOV.BCB.PIX')+E(1,chave))+E(52,'0000')+E(53,'986')+E(54,Number(valor).toFixed(2))+E(58,'BR')+E(59,nome.slice(0,25))+E(60,cidade.slice(0,15))+E(62,E(5,txid));
  let crc=0xFFFF;[...Buffer.from(p)].forEach(b=>{crc^=(b<<8);for(let i=0;i<8;i++)crc=crc&0x8000?(crc<<1)^0x1021:crc<<1});
  return{ok:true,copia_cola:p+'6304'+(crc&0xFFFF).toString(16).toUpperCase().padStart(4,'0'),txid,valor};
}
app.post('/api/pix',async(req,res)=>{const p=gerarPIX(req.body);p.qr=await QR.toDataURL(p.copia_cola,{scale:7});res.json(p);});
app.post('/api/pedidos',async(req,res)=>{const p=gerarPIX({valor:req.body.total||1});const id=(await DB.run('INSERT INTO vendas_pedidos(usuario_id,usuario_nome,produtos,total,pix_copia,pix_txid)VALUES(?,?,?,?,?,?)',[req.body.uid||'0',req.body.nome||'Anon',JSON.stringify(req.body.produtos||[]),p.valor,p.copia_cola,p.txid])).lastInsertRowid;res.json({ok:true,pedido_id:id,...p});});
app.post('/api/pedidos/:id/pagar',async(req,res)=>{await DB.run('UPDATE vendas_pedidos SET status=?,pago_em=? WHERE id=?',['pago',new Date().toISOString(),req.params.id]);log('VENDAS','💳 PEDIDO PAGO:','#'+req.params.id,'','SUCESSO');res.json({ok:true,msg:'Pago + entrega automática'});});

// 🎨 PAINEL WEB
app.get('/painel',async(req,res)=>{
  const TK=await DB.get('SELECT COUNT(*)abertos FROM tickets WHERE status=?',['aberto']);
  const VD=await DB.get('SELECT COUNT(*)pedidos,COALESCE(SUM(total),0)total FROM vendas_pedidos WHERE status=?',['pago']);
  const VF=await DB.get('SELECT COUNT(DISTINCT usuario_id)u FROM verificacao_global');
  const MD=await DB.get('SELECT COUNT(*)n FROM modelos WHERE aprovado=1');
  const BOTS=await DB.all('SELECT * FROM modelos ORDER BY id LIMIT 25');
  const VZ=await VOZ.status('');
  const KPI=[
    {t:'🎟️ Tickets Abertos',v:TK.abertos,c:'bg-blue-500'},
    {t:'💰 Faturamento',v:'R$'+Number(VD.total||0).toLocaleString('pt-BR',{minimumFractionDigits:2}),c:'bg-green-500'},
    {t:'🧾 Pedidos Pagos',v:VD.pedidos,c:'bg-yellow-500'},
    {t:'🛡️ Verificados',v:VF.u||0,c:'bg-cyan-500'},
    {t:'🤖 Bots Premium',v:MD.n||0,c:'bg-purple-500'},
    {t:'🎤 Voz',v:VZ.conectado?'✅ Conectado':'⏸️ Desconectado',c:VZ.conectado?'bg-emerald-500':'bg-rose-500'}
  ];
  res.send(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>🎛️ PAINEL STEMY FUNDAÇÃO</title>
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>*{font-family:Inter,sans-serif}.grad{background:linear-gradient(135deg,#6366f1,#8b5cf6 40%,#ec4899)}.card{backdrop-filter:blur(14px);background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}.kpi{transition:all .3s}.kpi:hover{transform:translateY(-4px);box-shadow:0 20px 40px rgba(99,102,241,.25)}</style></head>
<body class="min-h-screen grad text-white">
<div class="max-w-7xl mx-auto px-4 py-10">
  <div class="text-center mb-12">
    <div class="inline-block px-6 py-2 rounded-full bg-white/10 border border-white/20 text-sm mb-4">🚀 SISTEMA ONLINE</div>
    <h1 class="text-5xl md:text-6xl font-black mb-3">🎛️ PAINEL ADMINISTRATIVO</h1>
    <p class="text-2xl font-semibold text-white/80">STEMY FUNDAÇÃO V2.5 — ABSOLUTE PREMIUM</p>
    <p class="text-white/60 mt-2">Driver: ${DB.DRIVER} · Voz: ${VZ.config?.canal_nome||'Nenhum canal salvo'}</p>
  </div>
  <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
    ${KPI.map(k=>`<div class="kpi card rounded-2xl p-5 text-center"><div class="text-xs uppercase tracking-wider text-white/60 mb-1">${k.t}</div><div class="text-2xl md:text-3xl font-black">${k.v}</div><div class="h-1 ${k.c} rounded-full mt-3"></div></div>`).join('')}
  </div>
  <div class="card rounded-2xl p-6 mb-8">
    <h3 class="text-2xl font-bold mb-5 text-purple-300">🎤 CONTROLE DE VOZ — BOT NUNCA SAI</h3>
    <div class="flex flex-wrap gap-3">
      <button onclick="voz('entrar')" class="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold transition">✅ ENTRAR NO CANAL SALVO</button>
      <button onclick="voz('sair')" class="px-6 py-3 bg-rose-500 hover:bg-rose-600 rounded-xl font-bold transition">❌ SAIR</button>
      <button onclick="location.reload()" class="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition border border-white/20">🔄 ATUALIZAR</button>
    </div>
    <p class="text-white/60 text-sm mt-3">💡 No Discord use: <code class="bg-black/30 px-2 py-1 rounded">/stemy_entrar_voz</code> · <code class="bg-black/30 px-2 py-1 rounded">/stemy_sair_voz</code></p>
  </div>
  <div class="card rounded-2xl p-6 mb-8">
    <h3 class="text-2xl font-bold mb-5 text-purple-300">🤖 25 BOTS PREMIUM DISPONÍVEIS (718 COMANDOS)</h3>
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
      ${BOTS.map(b=>`<div class="rounded-xl p-4 border border-white/10 hover:border-white/30 transition" style="background:linear-gradient(135deg,${b.cor}22,transparent)"><div class="flex items-center gap-3"><div class="text-3xl">${b.icone}</div><div class="flex-1 min-w-0"><div class="font-bold truncate">${String(b.id).padStart(2,'0')}. ${b.nome}</div><div class="text-xs text-white/60">${b.categoria} · ⚙️ ${b.comandos} cmd</div></div></div></div>`).join('')}
    </div>
  </div>
  <div class="text-center text-white/50 text-sm pb-10"><hr class="border-white/10 mb-5">© ${new Date().getFullYear()} <strong>STEMY FUNDAÇÃO</strong> — Todos direitos reservados</div>
</div>
<script>
async function voz(a){
  const sid=prompt('ID DO SERVIDOR:')||'${VZ.config?.servidor_id||''}';
  if(!sid)return;
  if(a==='sair'){await fetch('/api/voz/sair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({servidor_id:sid})});alert('✅ Bot saiu do canal');location.reload();return}
  const cid=prompt('ID DO CANAL DE VOZ:')||'${VZ.config?.canal_id||''}';
  if(!cid)return;
  const r=await fetch('/api/voz/entrar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({servidor_id:sid,canal_id:cid})}).then(r=>r.json());
  alert(r.ok?'✅ BOT ENTROU E VAI FICAR PRA SEMPRE!\nCanal: '+r.canal:'❌ Erro: '+r.erro);
  location.reload();
}
</script></body></html>`);
});

// 404
app.use((req,res)=>res.status(404).json({ok:false,erro:'Rota não existe',docs:'/api/docs',painel:'/painel'}));

// 🤖 BOT DISCORD
const {Client,GatewayIntentBits,Partials,EmbedBuilder,SlashCommandBuilder,REST,Routes,PermissionsBitField,ChannelType}=require('discord.js');
const TOKEN=process.env.STEMY_TOKEN||process.env.DISCORD_TOKEN||'';
let bot=null;
if(TOKEN){
  bot=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent,GatewayIntentBits.GuildMembers,GatewayIntentBits.GuildVoiceStates],partials:[Partials.Message]});
  bot.on('ready',async()=>{
    log('BOT','✅ Conectado:',bot.user.tag,'','SUCESSO');
    bot.user.setActivity({name:'STEMY FUNDAÇÃO V2.5 | /stemy_ajuda',type:3});
    await VOZ.autoConectar(bot);
    const C=[
      new SlashCommandBuilder().setName('stemy_ajuda').setDescription('❓ Todos comandos'),
      new SlashCommandBuilder().setName('stemy_painel').setDescription('🎛️ Painel rápido'),
      new SlashCommandBuilder().setName('stemy_bots').setDescription('🤖 Ver 25 Bots Premium'),
      new SlashCommandBuilder().setName('stemy_info').setDescription('ℹ️ Sobre STEMY'),
      new SlashCommandBuilder().setName('stemy_verificar').setDescription('✅ Verificar-se'),
      new SlashCommandBuilder().setName('stemy_verificacao_cargo').setDescription('🎖️ Cargo verificação').addRoleOption(o=>o.setName('cargo').setDescription('Cargo').setRequired(true)),
      new SlashCommandBuilder().setName('stemy_entrar_voz').setDescription('🎤 Bot entra no seu canal e NUNCA SAI'),
      new SlashCommandBuilder().setName('stemy_sair_voz').setDescription('👋 Bot sai do canal'),
      new SlashCommandBuilder().setName('stemy_voz_status').setDescription('📊 Status da voz')
    ].map(c=>c.toJSON());
    try{await new REST({version:'10'}).setToken(TOKEN).put(Routes.applicationCommands(bot.user.id),{body:C});log('BOT','✅',C.length+' comandos / registrados','','SUCESSO')}catch(e){log('BOT','⚠️ Comandos:',e.message.split('\n')[0],'','AVISO')}
  });
  bot.on('interactionCreate',async i=>{
    try{
      const E=(c,t,d)=>new EmbedBuilder().setColor(c||'#6366F1').setTitle(t||'STEMY FUNDAÇÃO').setDescription(d||'').setFooter({text:'STEMY FUNDAÇÃO V2.5'}).setTimestamp();
      if(!i.isChatInputCommand())return;
      if(i.commandName==='stemy_ajuda')return i.reply({embeds:[E('#818cf8','❓ AJUDA','`/stemy_painel` · `/stemy_bots` · `/stemy_info` · `/stemy_verificar` · `/stemy_verificacao_cargo`\n`/stemy_entrar_voz` · `/stemy_sair_voz` · `/stemy_voz_status`')],ephemeral:true});
      if(i.commandName==='stemy_bots'){const b=await DB.all('SELECT * FROM modelos ORDER BY id LIMIT 25');return i.reply({embeds:[E('#6366F1','🤖 25 BOTS PREMIUM (718 COMANDOS)',b.map(x=>`**${String(x.id).padStart(2,'0')}.** ${x.icone} **${x.nome}** · ${x.categoria} (${x.comandos} cmd)`).join('\n'))]});}
      if(i.commandName==='stemy_info')return i.reply({embeds:[E('#8B5CF6','ℹ️ STEMY FUNDAÇÃO V2.5','Plataforma: STEMY FUNDAÇÃO\nVersão: 2.5.0\nBots: 25 Premium (718 comandos)\nMódulos: Tickets · Vendas · Verificação · Voz Permanente\nDriver: '+DB.DRIVER)]});
      if(i.commandName==='stemy_painel'){const tk=await DB.get('SELECT COUNT(*)a FROM tickets WHERE status=?',['aberto']),vd=await DB.get('SELECT COUNT(*)p,COALESCE(SUM(total),0)t FROM vendas_pedidos WHERE status=?',['pago']),vz=await VOZ.status(i.guild.id);return i.reply({embeds:[E('#6366F1','🎛️ PAINEL RÁPIDO',`🎟️ Tickets: ${tk.a} abertos\n💰 Faturamento: R$${Number(vd.t||0).toFixed(2)}\n🧾 Pedidos: ${vd.p} pagos\n🎤 Voz: ${vz.conectado?'✅ Conectado':'⏸️ Desconectado'}\n🌐 Painel Web: http://localhost:${P}/painel`)]});}
      if(i.commandName==='stemy_verificar'){await DB.run('INSERT OR IGNORE INTO verificacao_global(usuario_id,usuario_nome,servidor_id)VALUES(?,?,?)',[i.user.id,i.user.tag,i.guild.id]);const vc=await DB.get('SELECT * FROM verificacao_cargos WHERE servidor_id=?',[i.guild.id]);if(vc){try{await i.member.roles.add(vc.cargo_id)}catch(e){}}return i.reply({embeds:[E('#10B981','✅ VERIFICADO','Você foi verificado na Rede STEMY!')],ephemeral:true});}
      if(i.commandName==='stemy_verificacao_cargo'){if(!i.member.permissions.has(PermissionsBitField.Flags.Administrator))return i.reply({embeds:[E('#EF4444','❌ ADMIN ONLY')],ephemeral:true});const r=i.options.getRole('cargo');await DB.run('INSERT OR REPLACE INTO verificacao_cargos(servidor_id,cargo_id,cargo_nome)VALUES(?,?,?)',[i.guild.id,r.id,r.name]);return i.reply({embeds:[E('#10B981','🎖️ CARGO DEFINIDO','Quem se verificar ganha: '+r)]});}
      if(i.commandName==='stemy_entrar_voz'){
        if(!i.member.voice.channel)return i.reply({embeds:[E('#EF4444','❌ ENTRE NUM CANAL DE VOZ PRIMEIRO')],ephemeral:true});
        if(!i.guild.members.me.permissions.has(PermissionsBitField.Flags.Connect))return i.reply({embeds:[E('#EF4444','❌ SEM PERMISSÃO DE CONECTAR')],ephemeral:true});
        const r=await VOZ.entrar(i.member.voice.channel);
        return i.reply({embeds:[E(r.ok?'#10B981':'#EF4444',r.ok?'🎤 BOT ENTROU — VAI FICAR PRA SEMPRE!':'❌ ERRO',r.ok?'Canal: **'+r.canal+'**\n♻️ Se for kickado ele volta em 3s\n♾️ Auto-conecta quando reiniciar':r.erro)]});
      }
      if(i.commandName==='stemy_sair_voz'){if(!i.member.permissions.has(PermissionsBitField.Flags.Administrator))return i.reply({embeds:[E('#EF4444','❌ ADMIN ONLY')],ephemeral:true});const r=await VOZ.sair(i.guild.id);return i.reply({embeds:[E(r?'#10B981':'#EF4444',r?'👋 BOT SAIU DO CANAL':'❌ NÃO TAVA EM NENHUM CANAL')]});}
      if(i.commandName==='stemy_voz_status'){const v=await VOZ.status(i.guild.id);return i.reply({embeds:[E(v.conectado?'#10B981':'#F59E0B','📊 STATUS VOZ',`Conectado: ${v.conectado?'✅ SIM':'⏸️ NÃO'}\nCanal salvo: ${v.config?.canal_nome||'Nenhum'}\nAuto-conectar: ${v.config?.auto_conectar?'✅ SIM':'❌ NÃO'}\nReconectar em: ${v.config?.reconectar_segundos||3}s`)]});}
    }catch(e){log('BOT','❌',e.message,i.user?.tag,'ERRO');try{i.reply({content:'❌ '+e.message,ephemeral:true}).catch(()=>{})}catch(_){}}
  });
  bot.login(TOKEN).catch(e=>log('BOT','❌ Login:',e.message.split('\n')[0],'','ERRO'));
}else log('SISTEMA','ℹ️ Modo apenas API','Coloque STEMY_TOKEN no .env','','AVISO');

// 🚀 LIGAR
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
process.on('uncaughtException',e=>log('SISTEMA','❌',e.message,'','ERRO'));
process.on('unhandledRejection',e=>log('SISTEMA','❌ Promise',e?.message||String(e),'','ERRO'));
process.on('SIGINT',()=>{console.log('\n👋 Desligando...');S.close(()=>process.exit(0))});
require("./_patch_app.js");
module.exports={app,bot,S,P};

require('./_patch_oauth.js'); /* PATCH OAUTH VERIFICACAO */
