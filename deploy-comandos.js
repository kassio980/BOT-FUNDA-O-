const { REST, Routes } = require('discord.js');
require('dotenv').config();                                            
const CLIENT_ID = process.env.DISCORD_CLIENT_ID?.trim();
const TOKEN_BOT = process.env.STEMY_TOKEN?.trim();                     
const ID_SERVIDOR = '1505876225946812440';

if (!CLIENT_ID || CLIENT_ID.length < 17) throw new Error('CLIENT_ID INVÁLIDO');
if (!TOKEN_BOT || TOKEN_BOT.length < 50) throw new Error('STEMY_TOKEN INVÁLIDO');

const rest = new REST({ version: '10' }).setToken(TOKEN_BOT);

const comandos = [
  { name: 'stemy_painel', description: 'Abre o painel de controle do sistema' },
  { name: 'stemy_ajuda', description: 'Lista todos comandos e funções' },
  { name: 'stemy_entrar_voz', description: 'Entra no canal de voz que você está' },
  { name: 'verificar', description: 'Sistema de verificação de membros' },
  { name: 'loja', description: 'Minions Store — ver e comprar produtos' },
  { name: 'ticket', description: 'Abrir ou gerenciar atendimento' },
  { name: 'sala', description: 'Gerenciar salas Free Fire' },
  { name: 'bot', description: 'Criar ou gerenciar bots gerados' }
];
                                                                      
(async () => {
  try {                                                                   
    console.log(`🔄 Registrando no Servidor: ${ID_SERVIDOR} | App: ${CLIENT_ID}`);
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, ID_SERVIDOR),
      { body: comandos }
    );
    console.log('✅ TODOS OS COMANDOS REGISTRADOS COM SUCESSO!');
    console.log('⏳ Já aparecem em até 30 segundos no Discord');
  } catch (erro) {
    console.error('❌ ERRO:', erro);
  }                                                                   
})();
