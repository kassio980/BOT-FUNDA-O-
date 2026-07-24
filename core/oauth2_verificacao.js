const crypto = require('crypto');
const {URL} = require('url');

/* ⚙️ CONFIGURAÇÃO PADRÃO — COLOQUE SEUS DADOS DO PORTAL DEV DISCORD */
const CONFIG = {
  CLIENTE_ID: process.env.DISCORD_CLIENT_ID || 'COLOQUE_SEU_ID_AQUI',
  CLIENTE_SEGREDO: process.env.DISCORD_CLIENT_SECRET || 'COLOQUE_SEU_SEGREDO_AQUI',
  REDIRECT_URI: process.env.OAUTH_REDIRECT_URI || 'https://bot-funda-o.onrender.com/discord/callback',
  ESCOPO: 'identify email guilds guilds.members.read',
  AUTORIZACAO: 'code'
};

/* 🔗 GERAR URL DE VERIFICAÇÃO PADRONIZADA PARA TODOS OS BOTS */
function gerarUrlVerificacao(usuario_id, servidor_id, bot_id = 'padrao') {
  const estado = crypto.randomBytes(16).toString('hex');
  const dados = Buffer.from(JSON.stringify({
    usuario_origem: usuario_id,
    servidor_destino: servidor_id,
    bot_origem: bot_id,
    criado_em: Date.now()
  })).toString('base64url');

  const url = new URL('https://discord.com/oauth2/authorize');
  url.searchParams.set('client_id', CONFIG.CLIENTE_ID);
  url.searchParams.set('response_type', CONFIG.AUTORIZACAO);
  url.searchParams.set('redirect_uri', CONFIG.REDIRECT_URI);
  url.searchParams.set('scope', CONFIG.ESCOPO);
  url.searchParams.set('state', `${estado}.${dados}`);
  url.searchParams.set('prompt', 'consent');

  return {
    estado,
    url_completa: url.toString()
  };
}

/* ✅ TROCAR CÓDIGO POR DADOS DO USUÁRIO */
async function pegarDadosUsuario(codigo) {
  const resposta = await fetch('https://discord.com/api/v10/oauth2/token', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      client_id: CONFIG.CLIENTE_ID,
      client_secret: CONFIG.CLIENTE_SEGREDO,
      grant_type: 'authorization_code',
      code: codigo,
      redirect_uri: CONFIG.REDIRECT_URI
    })
  }).then(r => r.json());

  if(!resposta.access_token) throw new Error('Falha ao pegar permissões');

  const usuario = fetch('https://discord.com/api/v10/users/@me', {
    headers: {Authorization: `Bearer ${resposta.access_token}`}
  }).then(r => r.json());

  const servidores = fetch('https://discord.com/api/v10/users/@me/guilds', {
    headers: {Authorization: `Bearer ${resposta.access_token}`}
  }).then(r => r.json());

  return {
    tokens: resposta,
    usuario: await usuario,
    servidores: await servidores
  };
}

module.exports = {CONFIG, gerarUrlVerificacao, pegarDadosUsuario};
