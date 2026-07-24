const { REST, Routes } = require('discord.js');
require('dotenv').config();
const CLIENT_ID = process.env.DISCORD_CLIENT_ID?.trim();
const TOKEN_BOT = process.env.STEMY_TOKEN?.trim();
const ID_SERVIDOR = '1505876225946812440';

if (!CLIENT_ID || CLIENT_ID.length < 17) throw new Error('CLIENT_ID INVÁLIDO');
if (!TOKEN_BOT || TOKEN_BOT.length < 50) throw new Error('STEMY_TOKEN INVÁLIDO');

const rest = new REST({ version: '10' }).setToken(TOKEN_BOT);
const comandos = [
  { name: 'stemy_painel', description: '🎛️ Painel Principal do Sistema Premium' },
  { name: 'stemy_ajuda', description: '📚 Lista completa de comandos' },
  { name: 'verificar', description: '✅ Sistema de Verificação', options: [
    { type:1, name:'config', description:'⚙️ Configurar dados da verificação' },
    { type:1, name:'painel', description:'📨 Enviar mensagem com botão de verificação' }
  ]},
  { name: 'loja', description: '🛒 Minions Store — Produtos e Pagamentos' },
  { name: 'ticket', description: '🎫 Suporte e Atendimento' },
  { name: 'sala', description: '🔥 Salas e Torneios Free Fire' },
  { name: 'bot", description: "🤖 Gerenciar e Criar Bots Gerados' }
];

(async () => {
  console.log(`🔄 Registrando no servidor ${ID_SERVIDOR}...`);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, ID_SERVIDOR), { body: comandos });
  console.log('✅ TODOS OS COMANDOS REGISTRADOS COM SUCESSO!');
})();
