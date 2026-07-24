const {joinVoiceChannel,getVoiceConnection,createAudioPlayer,VoiceConnectionStatus,entersState}=require('@discordjs/voice');
const DB=require('./core/database');
const {log}=require('./core/logger');
let BOT=null,LOOP=false;

async function initTabela(){
  await DB.exec(`CREATE TABLE IF NOT EXISTS voz_config(
    id INTEGER PRIMARY KEY CHECK(id=1),
    servidor_id TEXT DEFAULT '',
    canal_id TEXT DEFAULT '',
    canal_nome TEXT DEFAULT '',
    auto_conectar INTEGER DEFAULT 1,
    reconectar_segundos INTEGER DEFAULT 3,
    tocar_silencio INTEGER DEFAULT 1,
    mutado INTEGER DEFAULT 0,
    ensurdecido INTEGER DEFAULT 0,
    ativo INTEGER DEFAULT 1
  );`);
  await DB.run('INSERT OR IGNORE INTO voz_config(id,ativo)VALUES(1,1)');
}
async function cfg(){return await DB.get('SELECT * FROM voz_config WHERE id=1')}
async function salvar(sid,cid,cnome){await DB.run('UPDATE voz_config SET servidor_id=?,canal_id=?,canal_nome=?,ativo=1 WHERE id=1',[sid,cid,cnome])}
async function desativar(){await DB.run('UPDATE voz_config SET ativo=0 WHERE id=1')}

// SILÊNCIO INFINITO → Discord NÃO kicka por inatividade
function manterViva(conexao){
  try{
    const player=createAudioPlayer();
    const s=Buffer.alloc(192,0xf3);s[0]=0xff;s[2]=0x40;
    const {Readable}=require('stream');
    const st=new Readable({read(){this.push(s);this.push(null)}});
    const {StreamType,createAudioResource}=require('@discordjs/voice');
    setInterval(()=>{try{player.play(createAudioResource(st,{inputType:StreamType.Arbitrary}))}catch(e){}},20000);
    conexao.subscribe(player);
  }catch(e){}
}

// ENTRA NO CANAL
async function entrar(canal){
  if(!canal||!canal.joinable)return{ok:false,erro:'Canal inválido ou sem permissão'};
  try{
    const c=await cfg();
    const conexao=joinVoiceChannel({
      channelId:canal.id,guildId:canal.guild.id,
      adapterCreator:canal.guild.voiceAdapterCreator,
      selfDeaf:!!c.ensurdecido,selfMute:!!c.mutado,debug:false
    });
    conexao.on(VoiceConnectionStatus.Disconnected,async()=>{
      try{await Promise.race([entersState(conexao,VoiceConnectionStatus.Signalling,5000),entersState(conexao,VoiceConnectionStatus.Connecting,5000)])}
      catch(_){
        const tentar=async()=>{
          const cc=await cfg();if(!cc.ativo||!cc.canal_id)return;
          const sv=BOT.guilds.cache.get(cc.servidor_id);if(!sv)return setTimeout(tentar,5000);
          const ch=sv.channels.cache.get(cc.canal_id);if(!ch||!ch.joinable)return setTimeout(tentar,5000);
          try{joinVoiceChannel({channelId:ch.id,guildId:sv.id,adapterCreator:sv.voiceAdapterCreator,selfDeaf:!!cc.ensurdecido,selfMute:!!cc.mutado});log('VOZ','♻️ RECONECTOU:',ch.name,'','SUCESSO')}
          catch(e){log('VOZ','❌ Falha reconexão:',e.message.split('\n')[0],'','ERRO');setTimeout(tentar,(cc.reconectar_segundos||3)*1000)}
        };
        conexao.destroy();
        const cc=await cfg();
        setTimeout(tentar,(cc.reconectar_segundos||3)*1000);
      }
    });
    conexao.on(VoiceConnectionStatus.Ready,()=>manterViva(conexao));
    await salvar(canal.guild.id,canal.id,canal.name);
    log('VOZ','✅ ENTROU NO CANAL:',canal.name,'','SUCESSO');
    return{ok:true,canal:canal.name};
  }catch(e){return{ok:false,erro:e.message}}
}

// SAI DO CANAL
async function sair(servidorId){
  const c=getVoiceConnection(servidorId);if(c){c.destroy();await desativar();log('VOZ','👋 SAIU DO CANAL','','AVISO');return true}
  return false
}

// STATUS
async function status(servidorId){
  const c=getVoiceConnection(servidorId);const cc=await cfg();
  return{conectado:!!c,config:cc,canalAtual:c?.joinConfig?.channelId||null}
}

// AUTO-CONECTAR QUANDO BOT LIGAR
async function autoConectar(bot){
  BOT=bot;await initTabela();
  const cc=await cfg();
  if(!cc.ativo||!cc.canal_id||!cc.servidor_id)return log('VOZ','ℹ️ Nenhum canal salvo','','AVISO');
  setTimeout(async()=>{
    const sv=bot.guilds.cache.get(cc.servidor_id);if(!sv)return;
    const ch=sv.channels.cache.get(cc.canal_id);if(!ch)return;
    const r=await entrar(ch);
    if(r.ok)log('VOZ','🚀 AUTO-CONECTOU:',ch.name,'','SUCESSO');
    else log('VOZ','❌ Auto falhou:',r.erro,'','ERRO');
  },3000);
  LOOP=true;
}

module.exports={entrar,sair,status,autoConectar,initTabela,cfg,salvar,desativar};
