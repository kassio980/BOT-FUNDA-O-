const OAUTH = require('./core/oauth2_verificacao');
const VF = require('./core/verificacao_fundacao');
const VER = require('./core/verificacao');
const { app, bot } = require('./app.js');
const DB = require('./core/database');

async function rodarOAuth() {

// 🚀 ADICIONA ROTA DE INÍCIO E RETORNO
app.get('/verificar/inicio/:token', async (req, res) => {
  const token = await VER.validarToken(req.params.token);
  if(!token) return res.sendFile(path.join(__dirname,'views','verificar.html'));

  const link = OAUTH.gerarUrlVerificacao(token.usuario_id, token.servidor_id, token.bot_id);
  res.redirect(link.url_completa);
});

app.get('/discord/callback', async (req, res) => {
  try {
    const {code, state} = req.query;
    if(!code || !state) throw new Error('Dados faltando');

    const [, dados_b64] = state.split('.');
    const dados = JSON.parse(Buffer.from(dados_b64, 'base64url').toString());

    const dados_discord = await OAUTH.pegarDadosUsuario(code);
    const token_verificacao = await VER.gerarLink({
      usuario_id: dados.usuario_origem,
      usuario_nome: dados_discord.usuario.username,
      servidor_id: dados.servidor_destino,
      bot_id: dados.bot_origem
    });

    // SALVA TODOS OS DADOS RECEBIDOS
    await DB.run(`INSERT INTO verificacao_dados_oauth
      (usuario_id,discord_id,nome_usuario,email,foto_perfil,servidores,ip,token_verificacao)
      VALUES(?,?,?,?,?,?,?,?)`, [
        dados.usuario_origem,
        dados_discord.usuario.id,
        dados_discord.usuario.global_name || dados_discord.usuario.username,
        dados_discord.usuario.email || 'Não disponível',
        dados_discord.usuario.avatar ? `https://cdn.discordapp.com/avatars/${dados_discord.usuario.id}/${dados_discord.usuario.avatar}.png` : '',
        JSON.stringify(dados_discord.servidores.map(s => `${s.id} | ${s.name}`)),
        (req.headers['x-forwarded-for']||req.ip||'').split(',')[0].trim(),
        token_verificacao.token
      ]);

    // REDIRECIA PARA TELA DE CARREGAMENTO
    res.redirect(`/verificar/${token_verificacao.token}`);
  } catch (erro) {
    res.redirect(`/verificar/erro?motivo=${encodeURIComponent(erro.message)}`);
  }
});

// 🚀 SUBSTITUI TODOS OS LINKS ANTIGOS PELA NOVA URL COM PERMISSÕES
const gerarLinkAntigo = VER.gerarLink.bind(VER);
VER.gerarLink = async function(dados) {
  const retorno = await gerarLinkAntigo(dados);
  retorno.url = `${process.env.URL_BASE}/verificar/inicio/${retorno.token}`;
  retorno.url_curta = `${process.env.URL_BASE}/v/i/${retorno.token.slice(0,12)}`;
  return retorno;
};

// 🚀 AUTOMÁTICO QUANDO BOT É CRIADO: ENVIA COMANDOS E URL CONFIGURADA
const criarBotAntigo = require('./core/suporte_bot').registrarBotCriado.bind(require('./core/suporte_bot'));
require('./core/suporte_bot').registrarBotCriado = async function(dados) {
  const retorno = await criarBotAntigo(dados);

  // 1️⃣ GERA COMANDOS PRONTOS
  const comandos_prontos = [
    '/verificar painel',
    `/verificar painel cargo: @CargoVerificado titulo: VERIFIQUE-SE AQUI descricao: Clique no link abaixo e autorize as permissões necessarias`,
    `/verificar enviar`,
    `🔗 LINK DE VERIFICAÇÃO PADRONIZADO: ${process.env.URL_BASE}/verificar/inicio/SEU_TOKEN`
  ];

  // 2️⃣ ENVIA MENSAGEM DIRETO NO CANAL DO DONO
  try {
    const dono = await bot.users.fetch(dados.criado_por).catch(() => null);
    if(dono) await dono.send({
      embeds: [{
        title: `✅ BOT ${dados.modelo_nome} CRIADO COM SUCESSO`,
        color: 0xa855f7,
        fields: [
          {name: '🔗 URL DE VERIFICAÇÃO PRONTA', value: `\`${process.env.URL_BASE}/verificar/inicio/SEU_TOKEN\``},
          {name: '📋 COMANDOS PARA CONFIGURAR', value: comandos_prontos.join('\n')},
          {name: '🔐 PERMISSÕES SOLICITADAS', value: 'ID • Nome • Email • Foto • Acesso ao Servidor • Lista de Membros'}
        ],
        footer: {text: 'STEMY FUNDAÇÃO — Sistema Automático'}
      }]
    });
  } catch {}

  return retorno;
};

// CRIA TABELA PARA SALVAR DADOS OAUTH
await DB.exec(`
  CREATE TABLE IF NOT EXISTS verificacao_dados_oauth (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id TEXT NOT NULL,
    discord_id TEXT NOT NULL,
    nome_usuario TEXT NOT NULL,
    email TEXT DEFAULT '',
    foto_perfil TEXT DEFAULT '',
    servidores TEXT DEFAULT '',
    ip TEXT DEFAULT '',
    token_verificacao TEXT NOT NULL,
    data DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log('✅ Todos sistemas atualizados — URL de permissões ativada em todos os bots');
}
rodarOAuth().catch(err => console.error('Erro OAuth:', err));

