const {SlashCommandBuilder,SlashCommandRoleOption,SlashCommandChannelOption}=require('discord.js');
const T=require('./index');

const COMANDOS=[
  {n:'stemy_ticket_cargo',d:'🎖️ Cargo STAFF de atendimento',opts:[new SlashCommandRoleOption().setName('cargo').setDescription('Cargo da equipe').setRequired(true)],run:async(i)=>{await T.salvarCfg({cargo_staff:i.options.getRole('cargo').id});i.reply({embeds:[E('#10B981','✅ CONFIGURADO',`Cargo STAFF: ${i.options.getRole('cargo')}`)]});}},
  {n:'stemy_ticket_canal_painel',d:'📢 Canal do Painel de Tickets',opts:[new SlashCommandChannelOption().setName('canal').setDescription('Canal').addChannelTypes(0).setRequired(true)],run:async(i)=>{await T.salvarCfg({canal_painel:i.options.getChannel('canal').id});i.reply({embeds:[E('#10B981','✅ CONFIGURADO',`Painel → ${i.options.getChannel('canal')}`)]});}},
  {n:'stemy_ticket_categoria_abrir',d:'📂 Categoria para novos tickets',opts:[new SlashCommandChannelOption().setName('categoria').setDescription('Categoria').addChannelTypes(4).setRequired(true)],run:async(i)=>{await T.salvarCfg({categoria_abrir:i.options.getChannel('categoria').id});i.reply({embeds:[E('#10B981','✅ CONFIGURADO',`Abertura → ${i.options.getChannel('categoria')}`)]});}},
  {n:'stemy_ticket_categoria_fechados',d:'📂 Categoria tickets fechados',opts:[new SlashCommandChannelOption().setName('categoria').setDescription('Categoria').addChannelTypes(4).setRequired(true)],run:async(i)=>{await T.salvarCfg({categoria_fechados:i.options.getChannel('categoria').id});i.reply({embeds:[E('#10B981','✅ CONFIGURADO',`Fechados → ${i.options.getChannel('categoria')}`)]});}},
  {n:'stemy_ticket_canal_logs',d:'📜 Canal logs Tickets',opts:[new SlashCommandChannelOption().setName('canal').setDescription('Canal logs').addChannelTypes(0).setRequired(true)],run:async(i)=>{await T.salvarCfg({canal_logs:i.options.getChannel('canal').id});i.reply({embeds:[E('#10B981','✅ CONFIGURADO',`Logs → ${i.options.getChannel('canal')}`)]});}},
  {n:'stemy_ticket_cargo_obrigatorio',d:'🔒 Cargo obrigatório p/ abrir',opts:[new SlashCommandRoleOption().setName('cargo').setDescription('Cargo necessário').setRequired(true)],run:async(i)=>{await T.salvarCfg({cargo_obrigatorio_abrir:i.options.getRole('cargo').id});i.reply({embeds:[E('#10B981','✅ CONFIGURADO',`Obrigatório: ${i.options.getRole('cargo')}`)]});}},
  {n:'stemy_ticket_enviar_painel',d:'📢 Enviar Painel AGORA',opts:[],run:async(i)=>{await i.deferReply({ephemeral:true});const r=await T.enviarPainel(i.client);i.editReply({embeds:[E(r.ok?'#10B981':'#EF4444',r.ok?'📢 PAINEL ENVIADO':'❌ ERRO',r.ok?'Sucesso':r.erro)]});}},
  {n:'stemy_ticket_stats',d:'📊 Estatísticas atendimento',opts:[],run:async(i)=>{const s=await T.stats();i.reply({embeds:[E('#0EA5E9','📊 TICKETS STEMY',`📋 Total: **${s.total}**\n🟢 Abertos: **${s.abertos}**\n🔴 Fechados: **${s.fechados}**\n⚠️ Sem atendente: **${s.sem_claim}**\n⭐ Avaliação: **${Number(s.avaliacao_media||0).toFixed(1)}/5**`)]});}}
];

const E=(c,t,d)=>new (require('discord.js').EmbedBuilder)().setColor(c||'#6366F1').setTitle(t||'STEMY FUNDAÇÃO').setDescription(d||'').setFooter({text:'STEMY FUNDAÇÃO V2.5'}).setTimestamp();

const BUILD=()=>COMANDOS.map(c=>new SlashCommandBuilder().setName(c.n).setDescription(c.d).addOptions(c.opts).toJSON());

const EXECUTAR=async(i)=>{
  const c=COMANDOS.find(x=>x.n===i.commandName);
  if(c){
    const ADM=['stemy_ticket_cargo','stemy_ticket_canal_painel','stemy_ticket_categoria_abrir','stemy_ticket_categoria_fechados','stemy_ticket_canal_logs','stemy_ticket_cargo_obrigatorio','stemy_ticket_enviar_painel'];
    if(ADM.includes(c.n)&&!i.member.permissions.has(require('discord.js').PermissionsBitField.Flags.Administrator))return i.reply({embeds:[E('#EF4444','❌ ADMIN ONLY','Apenas administradores.')],ephemeral:true});
    await c.run(i);return true;
  }
  return false;
};

module.exports={COMANDOS,BUILD,EXECUTAR};
