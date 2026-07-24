const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const URL_PAINEL = 'https://bot-funda-o.onrender.com/painel/loja';

function painelAdminLoja() {
  return new EmbedBuilder()
    .setTitle('⚙️ PAINEL ADMINISTRATIVO')
    .setDescription('Gerencie TODA a loja por aqui')
    .addFields(
      { name: '📦 Produtos', value: 'Cadastrar / Editar / Excluir', inline: false },
      { name: '🎟️ Cupons', value: 'Criar / Desativar', inline: false },
      { name: '💳 Gift Cards', value: 'Gerar cartões', inline: false },
      { name: '📊 Vendas', value: 'Relatórios completos', inline: false },
      { name: '👥 Afiliados', value: 'Gerenciar afiliados', inline: false },
      { name: '⚙️ Config', value: 'Ajustes do sistema', inline: false }
    )
    .setColor('#FFDD22')
    .setThumbnail('https://i.imgur.com/9wKzZQ8.png')
    .setTimestamp()
    .setFooter({ text: '💛 MINIONS STORE OFICIAL • Premium', iconURL: 'https://i.imgur.com/9wKzZQ8.png' });
}

function botoesPainelAdmin() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('➕ Cadastrar Produto').setCustomId('loja_novo_produto').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setLabel('🎟️ Criar Cupom').setCustomId('loja_novo_cupom').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setLabel('💳 Gift Card').setCustomId('loja_novo_gift').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setLabel('📊 Relatório Vendas').setCustomId('loja_relatorios').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setLabel('👥 Afiliados').setCustomId('loja_afiliados').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setLabel('⚙️ Configurações').setCustomId('loja_configuracoes').setStyle(ButtonStyle.Danger)
  );
}

function modalNovoProduto() {
  return new ModalBuilder()
    .setCustomId('modal_novo_produto')
    .setTitle('➕ CADASTRAR NOVO PRODUTO')
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nome').setLabel('Nome do Produto').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('descricao').setLabel('Descrição Completa').setStyle(TextInputStyle.Paragraph).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('preco').setLabel('Preço em Reais (apenas números)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('29.90')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('estoque').setLabel('Quantidade em Estoque').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('50')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('entrega').setLabel('Conteúdo entregue ao comprar').setStyle(TextInputStyle.Paragraph).setRequired(true))
    );
}

function modalNovoCupom() {
  return new ModalBuilder()
    .setCustomId('modal_novo_cupom')
    .setTitle('🎟️ CRIAR NOVO CUPOM')
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('codigo').setLabel('Código do Cupom').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('MINIONS20')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('desconto').setLabel('Desconto em %').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('15')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('limite').setLabel('Limite de usos').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('100'))
    );
}

module.exports = { painelAdminLoja, botoesPainelAdmin, modalNovoProduto, modalNovoCupom };
