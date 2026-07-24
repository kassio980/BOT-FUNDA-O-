const DB=require('./database');
const VER=require('./verificacao');
const SUP=require('./suporte_bot');
const {log}=require('./logger');

/* 📊 MENU EXCLUSIVO VERIFICAÇÃO */
async function menuVerificacao(servidor_id='STEMY_MASTER'){
  const s=await VER.stats();
  const sv=await DB.get('SELECT * FROM verificacao_servidores WHERE servidor_id=?',[servidor_id]);
  const cfg=await DB.get('SELECT * FROM verificacao_cargos WHERE servidor_id=?',[servidor_id]);
  return{
    titulo:'🛡️ MENU VERIFICAÇÃO EXCLUSIVO',
    total_geral:s.total,
    verificados_hoje:s.hoje,
    usuarios_unicos:s.unicos,
    neste_servidor:sv?.total_verificados||0,
    cargo_configurado:cfg?{id:cfg.cargo_id,nome:cfg.cargo_nome}:null,
    top_servidores:s.servidores.slice(0,10),
    top_bots:s.bots.slice(0,10),
    sincronia_stemy:{ativo:true,descricao:'Todo verificado em qualquer bot → STEMY MASTER (sem cargo)'}
  };
}

/* 🎁 FUNÇÕES EXTRA DAORA */
async function criarBotParaUsuario(dados){
  // Registra criação + garante infinito
  const id=await SUP.registrarBotCriado({...dados,extra:{...dados.extra,estoque:'INFINITO',quantidade:'INFINITA'}});
  return{ok:true,criacao_id:id,estoque:'INFINITO',quantidade:'INFINITA'};
}

/* 🔗 GERAR LINK VERIFICAÇÃO RÁPIDO */
async function linkRapido({usuario_id,usuario_nome,servidor_id,bot_id}){
  return await VER.gerarLink({usuario_id,usuario_nome,servidor_id,bot_id});
}

/* 📈 RANKING DE CRIAÇÃO DE BOTS */
async function rankingCriadores(limite=10){
  return(await SUP.stats()).top_criadores.slice(0,limite);
}

/* 🧹 LIMPAR TUDO E REORGANIZAR BLOCOS POR 2 */
function organizarSistema(codigo_bruto){
  const limpo=SUP.limparCodigo(codigo_bruto);
  const blocos=SUP.dividirBlocosPor2(limpo);
  SUP.registrarOperacao('CODIGO_ORGANIZADO',`Blocos divididos por 2 → ${blocos.length} pacotes`);
  return{limpo,blocos,total_blocos:blocos.length};
}

module.exports={menuVerificacao,criarBotParaUsuario,linkRapido,rankingCriadores,organizarSistema};
