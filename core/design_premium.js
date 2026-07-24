const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const DESIGN = {
  primaria: '#9922FF',
  sucesso: '#22FF88',
  alerta: '#FFCC22',
  perigo: '#FF3366',
  info: '#33AAFF',
  fundo: '#121217',
  rodape: '🟣 STEMY FUNDAÇÃO • Sistema Exclusivo Premium',
  icone: 'https://i.imgur.com/z8ZQ8ZL.png'
};

function cabecalho(titulo, descricao, cor = 'primaria', servidor = null) {
  return new EmbedBuilder()
    .setAuthor({ name: '🟣 STEMY FUNDAÇÃO', iconURL: DESIGN.icone })
    .setTitle(titulo)
    .setDescription(descricao)
    .setColor(DESIGN[cor] || DESIGN.primaria)
    .setThumbnail(servidor?.iconURL({ size: 256, dynamic: true }) || DESIGN.icone)
    .setTimestamp()
    .setFooter({ text: DESIGN.rodape, iconURL: DESIGN.icone });
}

function menuPrincipal() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('🛒 Loja').setCustomId('menu_loja').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setLabel('✅ Verificação').setCustomId('menu_verificar').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setLabel('🔥 Salas FF').setCustomId('menu_salas').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setLabel('🎫 Suporte').setCustomId('menu_ticket').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setLabel('⚙️ Painel Web').setURL('https://bot-funda-o.onrender.com/painel').setStyle(ButtonStyle.Link)
  );
}

function modalConfiguracao(identificador, titulo, campos) {
  const modal = new ModalBuilder().setCustomId(identificador).setTitle(titulo);
  campos.forEach(campo => {
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId(campo.id)
        .setLabel(campo.titulo)
        .setStyle(campo.tipo || TextInputStyle.Short)
        .setRequired(campo.obrigatorio ?? true)
        .setPlaceholder(campo.exemplo || '')
        .setMaxLength(campo.tamanho || 1024)
    ));
  });
  return modal;
}

module.exports = { cabecalho, menuPrincipal, modalConfiguracao, DESIGN };
