const { REST, Routes } = require('discord.js');
require('dotenv').config();

const CLIENT_ID = process.env.DISCORD_CLIENT_ID?.trim();
const TOKEN_BOT = process.env.STEMY_TOKEN?.trim();
const ID_SERVIDOR = '1505876225946812440';

if (!CLIENT_ID || CLIENT_ID.length < 17) throw new Error('CLIENT_ID INVÁLIDO');
if (!TOKEN_BOT || TOKEN_BOT.length < 50) throw new Error('STEMY_TOKEN INVÁLIDO');

const rest = new REST({ version: '10' }).setToken(TOKEN_BOT);

// ✅ TODOS REGRAS: SEM ACENTO, 1-32 CARACTERES, SEM CARACTERES ESPECIAIS NO NOME
const comandos = [
  { name: 'stemy_painel', description: '🎛️ Painel Principal do Sistema Premium' },
  { name: 'stemy_ajuda', description: '📚 Lista completa de comandos e funções' },
  { name: 'verificar', description: '✅ Sistema de Verificação de Membros', options: [
    { type: 1, name: 'configurar', description: '⚙️ Configurar regras da verificação' },
    { type: 1, name: 'publicar', description: '📨 Enviar mensagem oficial de verificação' }
  ]},
  { name: 'loja', description: '🛒 Produtos, Cupons e Pagamentos', options: [
    { type: 1, name: 'admin', description: '⚙️ Painel de controle completo da loja' }
  ]},
  { name: 'ticket', description: '🎫 Suporte, Atendimento e Relatórios' },
  { name: 'sala', description: '🔥 Salas, Torneios e Classificação Free Fire' },
  { name: 'bot', description: '🤖 Criar, Configurar e Gerenciar Bots' }
];

(async () => {
  try {
    console.log(`🔄 Registrando sistema Premium no servidor ${ID_SERVIDOR}...`);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, ID_SERVIDOR), { body: comandos });
    console.log('✅ TODOS COMANDOS REGISTRADOS — NÍVEL PREMIUM');
  } catch (erro) {
    console.error('❌ ERRO:', erro.rawError || erro);
  }
})();
