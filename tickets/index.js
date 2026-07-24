const {get,run,all}=require('../core/database');
const {log}=require('../core/logger');
const {EmbedBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle,StringSelectMenuBuilder,PermissionsBitField,ChannelType}=require('discord.js');

const COR={PRIMARY:ButtonStyle.Primary,SUCCESS:ButtonStyle.Success,DANGER:ButtonStyle.Danger,SECONDARY:ButtonStyle.Secondary};
const cfg=async()=>await get(`SELECT * FROM ticket_config WHERE id=1`)||{};
const salvarCfg=async(d)=>{const c=Object.keys(d);await run(`INSERT INTO ticket_config(id,${c.join(',')})VALUES(1,${c.map(()=>'?').join(',')}) ON CONFLICT(id)DO UPDATE SET ${c.map(x=>x+'=excluded.'+x).join(',')}`,Object.values(d));log('TICKETS','⚙️ Config atualizada',JSON.stringify(d).slice(0,100),'Sistema','SUCESSO');return true;};
const categorias=async()=>await all(`SELECT * FROM ticket_categorias WHERE ativo=1 ORDER BY ordem,nome`);

// 📢 ENVIAR PAINEL DE TICKETS NO CANAL
const enviarPainel=async(client,canalId=null)=>{
  const c=await cfg();
  const cats=await categorias();
  if(!canalId&&!c.canal_painel)return{ok:false,erro:'Canal do painel não configurado'};
  const ch=await client.channels.fetch(canalId||c.canal_painel).catch(()=>null);
  if(!ch)return{ok:false,erro:'Canal não encontrado'};
  const menu=new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('stemy_tk_abrir').setPlaceholder('👇 Selecione o assunto do seu ticket').setMinValues(1).setMaxValues(1).addOptions(cats.map(ct=>({label:`${ct.emoji} ${ct.nome}`,value:String(ct.id),description:ct.descricao||`Atendimento ${ct.nome}`,emoji:ct.emoji}))));
  const botoes=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('stemy_tk_meus').setLabel('📋 MEUS TICKETS').setStyle(COR.PRIMARY),new ButtonBuilder().setCustomId('stemy_tk_regras').setLabel('📜 REGRAS').setStyle(COR.SECONDARY),new ButtonBuilder().setCustomId('stemy_tk_status').setLabel('🟢 ATENDIMENTO ONLINE').setStyle(COR.SUCCESS));
  await ch.send({embeds:[new EmbedBuilder().setColor('#6366F1').setTitle('🎟️ CENTRAL DE ATENDIMENTO — STEMY FUNDAÇÃO').setDescription(`**Selecione abaixo o assunto** para abrir seu atendimento.\n\n⏱️ Tempo médio: **5 a 30 minutos**\n🗓️ **24h por dia, 7 dias por semana**\n👥 Equipe treinada e qualificada\n\n${cats.map(ct=>`**${ct.emoji} ${ct.nome}** → ${ct.descricao}`).join('\n')}\n\n⚠️ Abrir ticket sem motivo válido = punição.`).setFooter({text:'STEMY FUNDAÇÃO — Tickets Profissional'}).setTimestamp()],components:[menu,botoes]});
  log('TICKETS','📢 Painel enviado',`Canal: ${ch.name}`,'Sistema','SUCESSO');
  return{ok:true,canal:ch.id};
};

// ✨ ABRIR TICKET
const abrirTicket=async(i,categoriaId)=>{
  const c=await cfg();const g=i.guild;const u=i.user;
  if(c.cargo_obrigatorio_abrir&&!i.member.roles.cache.has(c.cargo_obrigatorio_abrir))return i.reply({embeds:[new EmbedBuilder().setColor('#EF4444').setTitle('❌ SEM PERMISSÃO').setDescription(`Você precisa do cargo <@&${c.cargo_obrigatorio_abrir}>.`)],ephemeral:true});
  const ab=await get(`SELECT COUNT(*) n FROM tickets WHERE usuario_id=? AND status='aberto'`,[u.id]);
  if(ab.n>=c.max_por_usuario)return i.reply({embeds:[new EmbedBuilder().setColor('#EF4444').setTitle('❌ LIMITE').setDescription(`Você tem **${ab.n}/${c.max_por_usuario}** tickets abertos.`)],ephemeral:true});
  const cat=await get(`SELECT * FROM ticket_categorias WHERE id=?`,[categoriaId]);if(!cat)return i.reply({content:'Categoria inválida',ephemeral:true});
  const ult=await get(`SELECT COALESCE(MAX(id),0)n FROM tickets`);const numero=`TK-${String(ult.n+1).padStart(6,'0')}`;
  const perm=[{id:g.id,deny:[PermissionsBitField.Flags.ViewChannel],type:0},{id:u.id,allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages,PermissionsBitField.Flags.AttachFiles,PermissionsBitField.Flags.ReadMessageHistory],type:1}];
  if(c.cargo_staff)perm.push({id:c.cargo_staff,allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages,PermissionsBitField.Flags.ManageMessages],type:0});
  if(cat.cargo_staff_especifico&&cat.cargo_staff_especifico!==c.cargo_staff)perm.push({id:cat.cargo_staff_especifico,allow:[PermissionsBitField.Flags.ViewChannel],type:0});
  const canal=await g.channels.create({name:`🎟️-${cat.nome.toLowerCase().replace(/\s+/g,'-')}-${u.username}`,type:ChannelType.GuildText,parent:c.categoria_abrir||null,topic:`Ticket ${numero} • ${u.tag} • ${cat.nome}`,permissionOverwrites:perm,rateLimitPerUser:3});
  await run(`INSERT INTO tickets(numero,canal_id,servidor_id,usuario_id,usuario_nome,assunto,categoria)VALUES(?,?,?,?,?,?,?)`,[numero,canal.id,g.id,u.id,u.tag,cat.nome,cat.nome]);
  const botoes=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`stemy_tk_claim_${numero}`).setLabel('🙋 CLAIM').setStyle(COR.PRIMARY),new ButtonBuilder().setCustomId(`stemy_tk_prio_${numero}`).setLabel('⚡ PRIORIDADE').setStyle(COR.SUCCESS),new ButtonBuilder().setCustomId(`stemy_tk_trans_${numero}`).setLabel('📄 TRANSCRVER').setStyle(COR.SECONDARY),new ButtonBuilder().setCustomId(`stemy_tk_fechar_${numero}`).setLabel('🔒 FECHAR').setStyle(COR.DANGER));
  const corEmbed=cat.cor==='DANGER'?'#EF4444':cat.cor==='SUCCESS'?'#10B981':'#6366F1';
  await canal.send({content:`${u} ${c.cargo_staff?`<@&${c.cargo_staff}>`:''} ${cat.cargo_staff_especifico?`<@&${cat.cargo_staff_especifico}>`:''}`,embeds:[new EmbedBuilder().setColor(corEmbed).setTitle(`${cat.emoji} TICKET ABERTO — ${numero}`).setDescription((c.mensagem_abertura||'').replace(/\{user\}/g,u.toString())).addFields({name:'📋 Assunto',value:`**${cat.nome}**`,inline:true},{name:'👤 Usuário',value:`${u}\n\`${u.tag}\``,inline:true},{name:'🎯 Prioridade',value:'🟢 Normal',inline:true},{name:'👨‍💼 Atendente',value:'⚠️ Ninguém deu claim',inline:true},{name:'🆔 Número',value:`\`${numero}\``,inline:true},{name:'📅 Aberto',value:`<t:${Math.floor(Date.now()/1000)}:F>`,inline:true}).setFooter({text:'Clique em CLAIM para atender'}).setTimestamp()],components:[botoes]});
  if(c.canal_logs)try{(await g.channels.fetch(c.canal_logs).catch(()=>null))?.send({embeds:[new EmbedBuilder().setColor('#10B981').setTitle('🎟️ TICKET ABERTO').setDescription(`**${numero}** — ${cat.nome}\n👤 ${u}\n📂 ${canal}`)]});}catch(e){}
  log('TICKETS','🎟️ ABERTO',`${numero} • ${u.tag} • ${cat.nome}`,u.tag,'SUCESSO');
  return i.reply({embeds:[new EmbedBuilder().setColor('#10B981').setTitle('✅ TICKET ABERTO').setDescription(`📂 **Canal:** ${canal}\n🆔 **Número:** \`${numero}\`\n📋 **Assunto:** ${cat.nome}`)],ephemeral:true});
};

// 🔒 FECHAR
const fecharTicket=async(i,numero,motivo='')=>{
  const t=await get(`SELECT * FROM tickets WHERE numero=?`,[numero]);if(!t)return i.reply({content:'Ticket não encontrado',ephemeral:true});
  const c=await cfg();
  await run(`UPDATE tickets SET status='fechado',fechado_por=?,motivo_fechamento=?,fechado_em=?,atualizado_em=? WHERE id=?`,[i.user.tag,motivo||'Sem motivo',new Date().toISOString(),new Date().toISOString(),t.id]);
  try{const ch=await i.guild.channels.fetch(t.canal_id).catch(()=>null);if(ch){if(c.categoria_fechados)await ch.setParent(c.categoria_fechados,{lockPermissions:false});await ch.permissionOverwrites.edit(t.usuario_id,{SendMessages:false,ViewChannel:true});await ch.send({embeds:[new EmbedBuilder().setColor('#EF4444').setTitle('🔒 TICKET FECHADO').setDescription((c.mensagem_fechamento||'').replace(/\{staff\}/g,i.user.tag)+(motivo?`\n\n📝 **Motivo:** ${motivo}`:'')).setFooter({text:`Fechado por ${i.user.tag}`})]});}}catch(e){}
  log('TICKETS','🔒 FECHADO',`${numero} por ${i.user.tag}`,i.user.tag,'SUCESSO');
  return i.reply({content:'✅ Ticket fechado',ephemeral:true});
};

// 🙋 CLAIM
const claimTicket=async(i,numero)=>{
  const t=await get(`SELECT * FROM tickets WHERE numero=?`,[numero]);if(!t)return i.reply({content:'Não encontrado',ephemeral:true});
  const c=await cfg();if(c.cargo_staff&&!i.member.roles.cache.has(c.cargo_staff))return i.reply({content:'❌ Apenas staff',ephemeral:true});
  await run(`UPDATE tickets SET staff_claim=?,staff_claim_nome=?,atualizado_em=? WHERE id=?`,[i.user.id,i.user.tag,new Date().toISOString(),t.id]);
  try{(await i.guild.channels.fetch(t.canal_id).catch(()=>null))?.send({embeds:[new EmbedBuilder().setColor('#0EA5E9').setTitle('🙋 TICKET ASSUMIDO').setDescription(`👨‍💼 **${i.user}** vai te atender agora! 💬`)]});}catch(e){}
  log('TICKETS','🙋 CLAIM',`${numero} → ${i.user.tag}`,i.user.tag);
  return i.reply({content:'✅ Você assumiu este ticket',ephemeral:true});
};

const stats=async()=>await get(`SELECT COUNT(*) total,COALESCE(SUM(CASE WHEN status='aberto'THEN 1 END),0)abertos,COALESCE(SUM(CASE WHEN status='fechado'THEN 1 END),0)fechados,COALESCE(SUM(CASE WHEN staff_claim='' AND status='aberto'THEN 1 END),0)sem_claim,COALESCE(AVG(avaliacao),0)avaliacao_media FROM tickets`);

module.exports={cfg,salvarCfg,categorias,enviarPainel,abrirTicket,fecharTicket,claimTicket,stats};
