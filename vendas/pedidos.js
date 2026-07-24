const {get,run,all}=require('../core/database');
const {log}=require('../core/logger');
const {cfg,gerarPIX,produtos,carrinho,cupons,afiliados,pacotes}=require('./core');
const {EmbedBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle}=require('discord.js');

const pedidos={
  listar:async(f={})=>{let s=`SELECT * FROM vendas_pedidos WHERE 1=1`;const p=[];if(f.usuario){s+=` AND usuario_id=?`;p.push(f.usuario);}if(f.status){s+=` AND status=?`;p.push(f.status);}s+=` ORDER BY id DESC LIMIT ${f.limite||100}`;return await all(s,p);},
  pegar:async id=>await get(`SELECT * FROM vendas_pedidos WHERE id=?`,[id]),
  meus:async uid=>await all(`SELECT * FROM vendas_pedidos WHERE usuario_id=? ORDER BY id DESC LIMIT 50`,[uid]),

  // ✨ CRIAR PEDIDO
  criar:async d=>{
    const c=await cfg();
    if(!c.pix_chave)return{ok:false,erro:'⚠️ PIX ainda não configurado pelo ADMIN.'};
    let subtotal=0;const itens=[];
    for(const it of d.itens||[]){const p=await produtos.pegar(it.produto_id);if(!p)return{ok:false,erro:`Produto #${it.produto_id} não existe`};if(p.estoque<(it.qtd||1))return{ok:false,erro:`Estoque baixo: ${p.nome}`};subtotal+=p.preco*(it.qtd||1);itens.push({...it,produto_id:p.id,nome:p.nome,preco_unit:p.preco,total:+(p.preco*(it.qtd||1)).toFixed(2),tipo:p.tipo,arquivo:p.arquivo_entrega,cargo:p.cargo_entrega,servidor:p.servidor_cargo,comissao:p.comissao});}
    subtotal=+subtotal.toFixed(2);
    let desconto=0,cupomUsado=null;
    if(d.cupom){const v=await cupons.validar(d.cupom,subtotal);if(v.ok){desconto=v.desconto;cupomUsado=v.cupom;}}
    const total=+Math.max(0,subtotal-desconto).toFixed(2);if(total<=0)return{ok:false,erro:'Total inválido'};
    const pix=await gerarPIX({valor:total,chave:c.pix_chave,nome:c.pix_nome,cidade:c.pix_cidade});
    const info=await run(`INSERT INTO vendas_pedidos(usuario_id,usuario_nome,usuario_email,produtos,subtotal,desconto,total,metodo,pix_copia,pix_qr,pix_txid,cupom,afiliado_id,ip)VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[d.usuario_id,d.usuario_nome,d.usuario_email||'',JSON.stringify(itens),subtotal,desconto,total,'pix',pix.copia_cola,pix.qr_base64,pix.txid,cupomUsado?.codigo||'',d.afiliado||'',d.ip||'']);
    const pid=info.lastInsertRowid;
    await run(`INSERT INTO vendas_pix(pedido_id,txid,valor,status,payload,qr)VALUES(?,?,?,?,?,?)`,[pid,pix.txid,total,'pendente',pix.copia_cola,pix.qr_base64]);
    for(const it of itens)await run(`INSERT INTO vendas_entregas(pedido_id,produto_id,usuario_id,status)VALUES(?,?,?,?)`,[pid,it.produto_id,d.usuario_id,it.tipo==='servico'?'manual':'pendente']);
    if(cupomUsado)await cupons.usar(cupomUsado.codigo);
    await carrinho.limpar(d.usuario_id);
    if(c.canal_pedidos_novos&&d.client)try{(await d.client.channels.fetch(c.canal_pedidos_novos).catch(()=>null))?.send({embeds:[new EmbedBuilder().setColor('#F59E0B').setTitle('🧾 NOVO PEDIDO').setDescription(`#${pid}\n👤 ${d.usuario_nome}\n💵 R$${total.toFixed(2)}\n📦 ${itens.length} itens\n⏳ Aguardando PIX`)]});}catch(e){}
    log('VENDAS','🧾 PEDIDO',`#${pid} ${d.usuario_nome} R$${total}`,d.usuario_nome,'SUCESSO');
    return{ok:true,pedido_id:pid,pedido:await pedidos.pegar(pid),pix,itens,subtotal,desconto,total};
  },

  // 💳 MARCAR PAGO + ENTREGA AUTOMÁTICA TOTAL
  marcarPago:async(pid,client=null)=>{
    const p=await pedidos.pegar(pid);if(!p||p.status!=='pendente')return{ok:false,erro:'Pedido inválido'};
    const c=await cfg();const agora=new Date().toISOString();const itens=JSON.parse(p.produtos);
    await run(`UPDATE vendas_pedidos SET status='pago',pago_em=? WHERE id=?`,[agora,pid]);
    await run(`UPDATE vendas_pix SET status='pago',pago_em=? WHERE pedido_id=?`,[agora,pid]);
    for(const it of itens){
      await produtos.vender(it.produto_id,it.qtd||1);
      if(p.afiliado_id)await afiliados.comissionar(p.afiliado_id,pid,it.total,it.comissao||c.comissao_padrao);
      const entrega=await get(`SELECT * FROM vendas_entregas WHERE pedido_id=? AND produto_id=?`,[pid,it.produto_id]);
      if(it.tipo==='digital'&&it.arquivo)await run(`UPDATE vendas_entregas SET status='entregue',dados=?,tentativas=tentativas+1 WHERE id=?`,[JSON.stringify({arquivo:it.arquivo,entregue_em:agora}),entrega.id]);
      else if(it.cargo&&it.servidor&&client)try{const g=await client.guilds.fetch(it.servidor).catch(()=>null);const m=g?await g.members.fetch(p.usuario_id).catch(()=>null):null;if(m)await m.roles.add(it.cargo);await run(`UPDATE vendas_entregas SET status='entregue',dados=? WHERE id=?`,[JSON.stringify({cargo:it.cargo,servidor:it.servidor,aplicado:!!m,entregue_em:agora}),entrega.id]);}catch(e){await run(`UPDATE vendas_entregas SET status='erro',erro=? WHERE id=?`,[e.message,entrega.id]);}
      else if(it.tipo==='assinatura'){const pr=new Date(Date.now()+((it.duracao_dias||30)*86400000)).toISOString();await run(`INSERT INTO vendas_assinaturas(usuario_id,produto_id,pedido_id,valor,proxima_cobranca)VALUES(?,?,?,?,?)`,[p.usuario_id,it.produto_id,pid,it.total,pr]);await run(`UPDATE vendas_entregas SET status='entregue',dados=? WHERE id=?`,[JSON.stringify({ativa:true,proxima:pr}),entrega.id]);}
      else if(it.tipo==='membro'){await pacotes.vender(it.produto_id);await run(`UPDATE vendas_entregas SET status='fila',dados=? WHERE id=?`,[JSON.stringify({qtd:it.qtd||100,iniciado:agora}),entrega.id]);}
      else await run(`UPDATE vendas_entregas SET status='preparando',tentativas=tentativas+1 WHERE id=?`,[entrega.id]);
    }
    const hoje=agora.slice(0,10);await run(`INSERT INTO vendas_stats_dia(data,pedidos,faturamento,produtos_vendidos)VALUES(?,?,?,?) ON CONFLICT(data)DO UPDATE SET pedidos=pedidos+1,faturamento=faturamento+excluded.faturamento,produtos_vendidos=produtos_vendidos+excluded.produtos_vendidos`,[hoje,1,p.total,itens.length]);
    if(c.cargo_vip&&c.servidor_cargo&&client&&p.total>=50)try{const g=await client.guilds.fetch(c.servidor_cargo).catch(()=>null);const m=g?await g.members.fetch(p.usuario_id).catch(()=>null):null;if(m)await m.roles.add(c.cargo_vip);}catch(e){}
    if(c.canal_pagamentos_aprovados&&client)try{(await client.channels.fetch(c.canal_pagamentos_aprovados).catch(()=>null))?.send({embeds:[new EmbedBuilder().setColor('#10B981').setTitle('💳 PAGAMENTO APROVADO ✅').setDescription(`#${pid}\n👤 ${p.usuario_nome}\n💵 R$${p.total.toFixed(2)}\n📦 ${itens.length} itens\n🚚 Entrega automática concluída`)]});}catch(e){}
    if(c.webhook_url)try{await require('axios').post(c.webhook_url,{pedido:p,itens,aprovado:true});}catch(e){}
    log('VENDAS','💳 APROVADO',`#${pid} R$${p.total}`,'Sistema','SUCESSO');
    return{ok:true,pedido:await pedidos.pegar(pid)};
  },

  cancelar:async(id,motivo='',por='sistema')=>{await run(`UPDATE vendas_pedidos SET status='cancelado',cancelado_por=?,motivo_cancelamento=? WHERE id=?`,[por,motivo,id]);log('VENDAS','❌ CANCELADO',`#${id} ${por}`,'Sistema','AVISO');return{ok:true};},

  stats:async()=>await get(`SELECT COUNT(*)total_pedidos,COALESCE(SUM(CASE WHEN status='pago'THEN total END),0)faturamento_total,COALESCE(SUM(CASE WHEN DATE(data)=DATE('now')AND status='pago'THEN total END),0)hoje,COALESCE(SUM(CASE WHEN DATE(data)>=DATE('now','-7 days')AND status='pago'THEN total END),0)ultimos7,COALESCE(SUM(CASE WHEN DATE(data)>=DATE('now','-30 days')AND status='pago'THEN total END),0)ultimos30,COALESCE(SUM(CASE WHEN status='pendente'THEN 1 END),0)pendentes,COALESCE(SUM(CASE WHEN status='cancelado'THEN 1 END),0)cancelados,(SELECT COUNT(*)FROM vendas_produtos WHERE ativo=1)produtos,(SELECT COUNT(*)FROM vendas_afiliados)afiliados FROM vendas_pedidos`)
};

// 📢 ENVIAR PAINEL DE PRODUTOS NO DISCORD
const enviarPainelProdutos=async(client,canalId=null)=>{
  const c=await cfg();
  if(!canalId&&!c.canal_painel_produtos)return{ok:false,erro:'Canal da loja não configurado'};
  const ch=await client.channels.fetch(canalId||c.canal_painel_produtos).catch(()=>null);if(!ch)return{ok:false,erro:'Canal não encontrado'};
  const destaques=await produtos.listar({destaque:1,limite:30});
  const cats=await all(`SELECT * FROM vendas_categorias WHERE ativo=1 ORDER BY nome`);
  await ch.send({embeds:[new EmbedBuilder().setColor('#7C3AED').setTitle('🛒 LOJA OFICIAL — STEMY FUNDAÇÃO').setDescription(`**Bem-vindo à nossa loja!** 🛍️\n\n💳 Pagamento via **PIX instantâneo**\n🚚 **Entrega automática** em até 60 segundos\n🛡️ **Garantia** em todos produtos\n🤝 **Suporte 24h**\n\n💡 Clique em **COMPRAR** no produto desejado.`).setFooter({text:'STEMY FUNDAÇÃO — Vendas Profissional'}).setTimestamp()]});
  let total=0;
  for(const cat of cats){
    const ps=destaques.filter(p=>p.categoria_id===cat.id).concat((await produtos.listar({categoria:cat.id,limite:8})).filter(x=>!destaques.find(d=>d.id===x.id))).slice(0,8);
    if(!ps.length)continue;
    for(let i=0;i<ps.length;i+=4){
      const lote=ps.slice(i,i+4);total+=lote.length;
      const botoes=new ActionRowBuilder().addComponents(lote.map(p=>new ButtonBuilder().setCustomId(`stemy_vd_comprar_${p.id}`).setLabel(`🛒 ${p.nome.slice(0,22)} — R$${p.preco.toFixed(2)}`).setStyle(p.preco>=100?ButtonStyle.Success:ButtonStyle.Primary)));
      await ch.send({embeds:lote.map(p=>new EmbedBuilder().setColor(p.cat_cor||'#7C3AED').setTitle(`${p.cat_icone||'📦'} ${p.nome}`).setDescription(p.desc_curta||p.desc_longa?.slice(0,150)||'Produto Premium STEMY').addFields({name:'💵 Preço',value:`**R$ ${p.preco.toFixed(2)}**${p.preco_antigo>p.preco?` ~~R$${p.preco_antigo.toFixed(2)}~~`:''}`,inline:true},{name:'📦 Estoque',value:p.estoque>=100?'✅ Disponível':`⚠️ ${p.estoque}`,inline:true},{name:'⭐ Nota',value:`${p.nota.toFixed(1)}/5 (${p.avaliacoes})`,inline:true},{name:'🔥 Vendas',value:`${p.vendas} un.`,inline:true},{name:'📦 Tipo',value:String(p.tipo).toUpperCase(),inline:true},{name:'🛡️ Garantia',value:`${p.garantia_dias} dias`,inline:true}).setImage(p.banner||p.imagem||null).setFooter({text:`ID: ${p.id} • ${p.categoria||'Geral'} • ${p.vendas} vendas`})),components:[botoes]});
    }
  }
  if(c.cupom_primeira)await ch.send({embeds:[new EmbedBuilder().setColor('#F59E0B').setTitle('🎁 CUPOM DA CASA').setDescription(`Use **${c.cupom_primeira}** → **${c.desc_primeira}% OFF** na 1ª compra!`)]});
  log('VENDAS','📢 LOJA ENVIADA',`Canal: ${ch.name} • ${total} produtos`,'Sistema','SUCESSO');
  return{ok:true,canal:ch.id,produtos:total};
};

module.exports={pedidos,enviarPainelProdutos};
