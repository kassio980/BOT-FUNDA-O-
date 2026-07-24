const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const URL_OAUTH = process.env.DISCORD_REDIRECT_URI ? encodeURIComponent(process.env.DISCORD_REDIRECT_URI) : '';
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';

const cores = {
  primaria: '#9922FF',
  sucesso: '#22FF77',
  erro: '#FF3355',
  alerta: '#FFCC22',
  info: '#22AAFF'
};

function embedPadrao(titulo, descricao, tipo = 'primaria', servidor = null) {
  return new EmbedBuilder()
    .setTitle(titulo)
    .setDescription(descricao)
    .setColor(cores[tipo] || cores.primaria)
    .setThumbnail(servidor?.iconURL({ size: 256, dynamic: true }) || null)
    .setTimestamp()
    .setFooter({ text: '© STEMY FUNDAÇÃO • Sistema Premium', iconURL: 'https://i.imgur.com/z8ZQ8ZL.png' });
}

function botoesVerificacao() {
  const link = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${URL_OAUTH}&scope=identify+email+guilds.join+guilds+guilds.members.read`;
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('🔗 VERIFICAR CONTA').setURL(link).setStyle(ButtonStyle.Link),
    new ButtonBuilder().setLabel('📜 Regras').setCustomId('ver_regras').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setLabel('📞 Suporte').setCustomId('ver_suporte').setStyle(ButtonStyle.Primary)
  );
}

function modalConfigVerificacao() {
  return new ModalBuilder()
    .setCustomId('modal_config_verificacao')
    .setTitle('⚙️ CONFIGURAÇÃO VERIFICAÇÃO PREMIUM')
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('titulo').setLabel('Título da Mensagem').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('✅ VERIFICAÇÃO DE MEMBROS — STEMY FUNDAÇÃO')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('descricao').setLabel('Texto Explicativo').setStyle(TextInputStyle.Paragraph).setRequired(false).setPlaceholder('Clique no botão abaixo para confirmar...')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('cor').setLabel('Cor em Hexadecimal').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('#9922FF')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('cargo_id').setLabel('ID do Cargo Verificado').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('123456789012345678')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('canal_logs_id').setLabel('ID do Canal de Logs').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('123456789012345678'))
    );
}

function botoesNavegacao() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('🛒 Loja').setCustomId('abrir_loja').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setLabel('🤖 Bots').setCustomId('abrir_bots').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setLabel('🔥 Salas FF').setCustomId('abrir_salas').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setLabel('🎫 Suporte').setCustomId('abrir_ticket').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setLabel('⚙️ Painel Web').setURL('https://bot-funda-o.onrender.com/painel').setStyle(ButtonStyle.Link)
  );
}

module.exports = { embedPadrao, botoesVerificacao, modalConfigVerificacao, botoesNavegacao };
