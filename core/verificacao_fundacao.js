/* =========================================================
   🛡️ SISTEMA DE VERIFICAÇÃO EXCLUSIVO — BOT FUNDAÇÃO
   ✅ Comando /verificar no Discord
   ✅ Painel: IMAGEM · DESCRIÇÃO · BANNER · CARGO
   ✅ Puxar membros: por ID · por LINK · quantidade total
   ✅ Botão no Discord + botão no painel web
   ========================================================= */
const DB=require('./database');
const VER=require('./verificacao');
const {log}=require('./logger');

async function init(){
  await DB.exec(`
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
      mensagem_bemvindo TEXT DEFAULT '✅ Bem-vindo(a) {usuario}! Você agora é verificado na STEMY FUNDAÇÃO.',
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
    CREATE INDEX IF NOT EXISTS idx_vf_user ON verificacao_fundacao(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_vf_serv ON verificacao_fundacao(servidor_id);
  `);
}

/* ⚙️ SALVAR CONFIGURAÇÃO (pelo painel) */
async function salvarConfig(dados){
  await DB.run(`INSERT INTO verificacao_fundacao_config
    (servidor_id,servidor_nome,cargo_id,cargo_nome,imagem_url,banner_url,titulo,descricao,texto_botao,cor_primaria,cor_secundaria,canal_logs,mensagem_bemvindo,atualizado_por)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(servidor_id)DO UPDATE SET
    cargo_id=excluded.cargo_id,cargo_nome=excluded.cargo_nome,imagem_url=excluded.imagem_url,
    banner_url=excluded.banner_url,titulo=excluded.titulo,descricao=excluded.descricao,
    texto_botao=excluded.texto_botao,cor_primaria=excluded.cor_primaria,cor_secundaria=excluded.cor_secundaria,
    canal_logs=excluded.canal_logs,mensagem_bemvindo=excluded.mensagem_bemvindo,
    ativo=1,atualizado_em=CURRENT_TIMESTAMP,atualizado_por=excluded.atualizado_por`,[
    dados.servidor_id,dados.servidor_nome,dados.cargo_id,dados.cargo_nome,
    dados.imagem_url||'',dados.banner_url||'',dados.titulo||'VERIFICAÇÃO STEMY FUNDAÇÃO',
    dados.descricao||'',dados.texto_botao||'✅ ME VERIFICAR AGORA',
    dados.cor_primaria||'#a855f7',dados.cor_secundaria||'#fbbf24',
    dados.canal_logs||'',dados.mensagem_bemvindo||'',dados.atualizado_por||'painel'
  ]);
  log('VERIFICACAO_FUNDACAO','⚙️ Config salva:',dados.servidor_nome,dados.atualizado_por||'painel','SUCESSO');
  return{ok:true};
}

/* 📖 PEGAR CONFIG */
async function getConfig(servidor_id){
  return await DB.get('SELECT * FROM verificacao_fundacao_config WHERE servidor_id=?',[servidor_id]);
}

/* 🔗 GERAR LINK DE VERIFICAÇÃO */
async function gerarLink({usuario_id,usuario_nome,servidor_id,baseUrl=''}){
  const cfg=await getConfig(servidor_id);
  if(!cfg||!cfg.ativo)return{ok:false,erro:'Verificação desativada ou não configurada'};
  if(!cfg.cargo_id)return{ok:false,erro:'Nenhum cargo configurado'};
  const l=await VER.gerarLink({usuario_id,usuario_nome,servidor_id,bot_id:'BOT_FUNDACAO',baseUrl});
  // Registra pedido
  await DB.run('INSERT OR IGNORE INTO verificacao_fundacao(usuario_id,usuario_nome,usuario_mencao,servidor_id,servidor_nome,cargo_recebido_id,cargo_recebido_nome,token_usado,link_usado)VALUES(?,?,?,?,?,?,?,?,?)',
    [usuario_id,usuario_nome,'<@'+usuario_id+'>',servidor_id,cfg.servidor_nome,cfg.cargo_id,cfg.cargo_nome,l.token,l.url]);
  return{ok:true,...l,config:cfg};
}

/* ✅ CONFIRMAR VERIFICAÇÃO (chamado depois que a barra termina) */
async function confirmar(token,{ip='',user_agent=''},{clientBot=null}){
  const t=await VER.validarToken(token);
  if(!t)return{ok:false,erro:'Link inválido ou expirado',codigo:'TOKEN_INVALIDO'};
  const cfg=await getConfig(t.servidor_id);
  if(!cfg)return{ok:false,erro:'Servidor não configurado'};

  // Executa verificação padrão + aplica cargo
  const r=await VER.executarVerificacao(token,{ip,user_agent},{clientBot});
  if(!r.ok)return r;

  // Atualiza tabela exclusiva da fundação
  await DB.run('UPDATE verificacao_fundacao SET ip=?,user_agent=?,data=CURRENT_TIMESTAMP WHERE token_usado=?',[ip,user_agent,token]);

  // Envia log no canal configurado
  if(cfg.canal_logs && clientBot){
    try{
      const ch=await clientBot.channels.fetch(cfg.canal_logs).catch(()=>null);
      if(ch){
        const {EmbedBuilder}=require('discord.js');
        await ch.send({embeds:[new EmbedBuilder()
          .setColor(cfg.cor_primaria||'#a855f7')
          .setAuthor({name:'✅ NOVO VERIFICADO',iconURL:clientBot.user.displayAvatarURL()})
          .setThumbnail(`https://cdn.discordapp.com/avatars/${t.usuario_id}/${(await clientBot.users.fetch(t.usuario_id).catch(()=>({avatar:null}))).avatar||''}.png`)
          .setDescription(`**Usuário:** <@${t.usuario_id}> (\`${t.usuario_id}\`)\n**Cargo:** ${cfg.cargo_nome}\n**IP:** \`${ip||'-'}\``)
          .setFooter({text:'STEMY FUNDAÇÃO · Verificação'})
          .setTimestamp()
        ]});
      }
    }catch(e){}
  }

  log('VERIFICACAO_FUNDACAO','✅ Verificado:',`${t.usuario_nome} → ${cfg.cargo_nome}`,t.usuario_nome,'SUCESSO');
  return{...r,discord_url:`https://discord.com/channels/${t.servidor_id}`,cargo:cfg};
}

/* 📊 ESTATÍSTICAS */
async function stats(servidor_id){
  const total=await DB.get('SELECT COUNT(*)n FROM verificacao_fundacao WHERE servidor_id=?',[servidor_id]);
  const hoje=await DB.get('SELECT COUNT(*)n FROM verificacao_fundacao WHERE servidor_id=? AND DATE(data)=DATE("now")',[servidor_id]);
  const unicos=await DB.get('SELECT COUNT(DISTINCT usuario_id)n FROM verificacao_fundacao WHERE servidor_id=?',[servidor_id]);
  return{total:total.n,hoje:hoje.n,unicos:unicos.n};
}

/* 🔍 BUSCAR MEMBROS VERIFICADOS (por ID · por nome · paginação · tudo) */
async function buscarVerificados({servidor_id='',usuario_id='',nome='',pagina=1,limite=50,ordenar='data DESC'}={}){
  const w=[],p=[];
  if(servidor_id){w.push('servidor_id=?');p.push(servidor_id)}
  if(usuario_id){w.push('usuario_id=?');p.push(usuario_id)}
  if(nome){w.push('usuario_nome LIKE ?');p.push('%'+nome+'%')}
  const wh=w.length?'WHERE '+w.join(' AND '):'';
  const total=(await DB.get(`SELECT COUNT(*)n FROM verificacao_fundacao ${wh}`,p)).n;
  const lista=await DB.all(`SELECT * FROM verificacao_fundacao ${wh} ORDER BY ${ordenar} LIMIT ? OFFSET ?`,
    [...p,Number(limite),(Number(pagina)-1)*Number(limite)]);
  return{total,pagina:Number(pagina),limite:Number(limite),paginas:Math.ceil(total/limite)||1,dados:lista};
}

/* 📤 EXPORTAR TODOS (CSV) */
async function exportarCSV(servidor_id){
  const d=await buscarVerificados({servidor_id,limite:999999});
  const lin=['"ID","USUÁRIO","MENÇÃO","CARGO","LINK","DATA"'];
  d.dados.forEach(x=>lin.push([`"${x.usuario_id}"`,`"${x.usuario_nome.replace(/"/g,'""')}"`,`"${x.usuario_mencao}"`,`"${x.cargo_recebido_nome.replace(/"/g,'""')}"`,`"${x.link_usado}"`,`"${x.data}"`].join(',')));
  return lin.join('\n');
}

/* 📋 LISTAR SERVIDORES ATIVOS */
async function servidoresAtivos(){
  return await DB.all('SELECT * FROM verificacao_fundacao_config WHERE ativo=1 ORDER BY servidor_nome');
}

module.exports={init,salvarConfig,getConfig,gerarLink,confirmar,stats,buscarVerificados,exportarCSV,servidoresAtivos};
