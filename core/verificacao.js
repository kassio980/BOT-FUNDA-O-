const DB=require('./database');
const {log}=require('./logger');

/* TABELAS */
async function init(){
  await DB.exec(`
    CREATE TABLE IF NOT EXISTS verificacao_global(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id TEXT NOT NULL,
      usuario_nome TEXT NOT NULL,
      servidor_origem TEXT NOT NULL,
      servidor_origem_nome TEXT DEFAULT 'STEMY',
      bot_origem TEXT DEFAULT 'verificacao_padrao',
      ip TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      sincronizado_stemy INTEGER DEFAULT 0,
      data DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(usuario_id,servidor_origem)
    );
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
  `);
  // Servidor principal STEMY sempre existe
  await DB.run('INSERT OR IGNORE INTO verificacao_servidores(servidor_id,servidor_nome,dono_id,url_personalizada)VALUES(?,?,?,?)',
    ['STEMY_MASTER','STEMY FUNDAÇÃO','0','/verificar/stemy']);
}

/* GERAR TOKEN ÚNICO + URL */
async function gerarLink({usuario_id,usuario_nome,servidor_id,bot_id='verificacao_padrao',baseUrl=''}){
  const crypto=require('crypto');
  const token=crypto.randomBytes(24).toString('hex');
  const expira=new Date(Date.now()+1000*60*30); // 30 minutos
  await DB.run('INSERT INTO verificacao_tokens(token,usuario_id,usuario_nome,servidor_id,bot_id,expira_em)VALUES(?,?,?,?,?,?)',
    [token,usuario_id,usuario_nome,servidor_id,bot_id,expira.toISOString()]);
  const base=baseUrl||process.env.URL_BASE||'https://bot-funda-o.onrender.com';
  return{
    token,
    url:`${base}/verificar/${token}`,
    url_curta:`${base}/v/${token.slice(0,12)}`,
    expira_em:expira
  };
}

/* VALIDAR TOKEN */
async function validarToken(token){
  const t=await DB.get('SELECT * FROM verificacao_tokens WHERE token=? AND usado=0 AND expira_em>DATETIME("now")',[token]);
  if(!t)return null;
  return t;
}

/* EXECUTAR VERIFICAÇÃO */
async function executarVerificacao(token,{ip='',user_agent=''},{clientBot=null}){
  const t=await validarToken(token);
  if(!t)return{ok:false,erro:'Link inválido ou expirado',codigo:'TOKEN_INVALIDO'};
  
  // Marca token como usado
  await DB.run('UPDATE verificacao_tokens SET usado=1 WHERE token=?',[token]);

  // Registra na tabela global
  const origem=await DB.get('SELECT servidor_nome FROM verificacao_servidores WHERE servidor_id=?',[t.servidor_id]);
  await DB.run('INSERT OR IGNORE INTO verificacao_global(usuario_id,usuario_nome,servidor_origem,servidor_origem_nome,bot_origem,ip,user_agent)VALUES(?,?,?,?,?,?,?)',
    [t.usuario_id,t.usuario_nome,t.servidor_id,origem?.servidor_nome||'Externo',t.bot_id,ip,user_agent]);

  // Atualiza contador do servidor
  await DB.run('UPDATE verificacao_servidores SET total_verificados=total_verificados+1 WHERE servidor_id=?',[t.servidor_id]);

  // 🔥 SINCRONIA: todo verificado em QUALQUER bot → também fica verificado na STEMY MASTER (SEM CARGO)
  if(t.servidor_id!=='STEMY_MASTER'){
    await DB.run('INSERT OR IGNORE INTO verificacao_global(usuario_id,usuario_nome,servidor_origem,servidor_origem_nome,bot_origem,sincronizado_stemy)VALUES(?,?,?,?,?,1)',
      [t.usuario_id,t.usuario_nome,'STEMY_MASTER','STEMY FUNDAÇÃO (Sincronia)',t.bot_id]);
    await DB.run('UPDATE verificacao_servidores SET total_verificados=total_verificados+1 WHERE servidor_id="STEMY_MASTER"');
  }

  // Tenta aplicar cargo APENAS no servidor de origem (nunca na STEMY por sincronia)
  let cargo_aplicado=false;
  const cfg=await DB.get('SELECT * FROM verificacao_cargos WHERE servidor_id=? AND ativo=1',[t.servidor_id]);
  if(cfg && clientBot){
    try{
      const sv=await clientBot.guilds.fetch(t.servidor_id).catch(()=>null);
      if(sv){
        const m=await sv.members.fetch(t.usuario_id).catch(()=>null);
        if(m){await m.roles.add(cfg.cargo_id).catch(()=>{});cargo_aplicado=true;}
      }
    }catch(e){log('VERIFICACAO','⚠️ Cargo não aplicado:',e.message,t.usuario_nome,'AVISO')}
  }

  log('VERIFICACAO','✅ Verificado:',`${t.usuario_nome} | Bot: ${t.bot_id} | Sincronia STEMY: ${t.servidor_id!=='STEMY_MASTER'?'SIM':'N/A'}`,t.usuario_nome,'SUCESSO');
  return{ok:true,usuario:t.usuario_nome,bot:t.bot_id,cargo_aplicado,cargo:cfg||null,sincronia_stemy:t.servidor_id!=='STEMY_MASTER'};
}

/* ESTATÍSTICAS */
async function stats(){
  const total=await DB.get('SELECT COUNT(*)n FROM verificacao_global');
  const hoje=await DB.get('SELECT COUNT(*)n FROM verificacao_global WHERE DATE(data)=DATE("now")');
  const unicos=await DB.get('SELECT COUNT(DISTINCT usuario_id)n FROM verificacao_global');
  const servidores=await DB.all('SELECT * FROM verificacao_servidores ORDER BY total_verificados DESC LIMIT 50');
  const bots=await DB.all('SELECT bot_origem,COUNT(*)total FROM verificacao_global GROUP BY bot_origem ORDER BY total DESC');
  return{total:total.n,hoje:hoje.n,unicos:unicos.n,servidores,bots};
}

/* CONFIGURAR CARGO */
async function configurarCargo({servidor_id,cargo_id,cargo_nome,canal_bemvindo='',mensagem=''}){
  await DB.run(`INSERT INTO verificacao_cargos(servidor_id,cargo_id,cargo_nome,canal_bemvindo,mensagem)VALUES(?,?,?,?,?)
    ON CONFLICT(servidor_id)DO UPDATE SET cargo_id=excluded.cargo_id,cargo_nome=excluded.cargo_nome,
    canal_bemvindo=excluded.canal_bemvindo,mensagem=excluded.mensagem,atualizado_em=CURRENT_TIMESTAMP`,
    [servidor_id,cargo_id,cargo_nome,canal_bemvindo,mensagem]);
  return{ok:true};
}

module.exports={init,gerarLink,validarToken,executarVerificacao,stats,configurarCargo};
