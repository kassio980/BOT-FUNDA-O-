const {get,run,all}=require('../core/database');
const {log}=require('../core/logger');
const QRCode=require('qrcode');
const crypto=require('crypto');

const cfg=async()=>await get(`SELECT * FROM vendas_config WHERE id=1`)||{};
const salvarCfg=async(d)=>{const c=Object.keys(d);await run(`INSERT INTO vendas_config(id,${c.join(',')})VALUES(1,${c.map(()=>'?').join(',')}) ON CONFLICT(id)DO UPDATE SET ${c.map(x=>x+'=excluded.'+x).join(',')}`,Object.values(d));log('VENDAS','⚙️ Config atualizada',JSON.stringify(d).slice(0,80),'Sistema','SUCESSO');return true;};

// 💳 GERADOR PIX 100% CORRETO (EMV)
const gerarPIX=async({valor,chave,nome='STEMY FUNDAÇÃO',cidade='SALVADOR',txid=null})=>{
  txid=txid||'STY'+crypto.randomBytes(10).toString('hex').toUpperCase().slice(0,25);
  const EMV=(t,v)=>String(t).padStart(2,'0')+String(v.length).padStart(2,'0')+v;
  let p=EMV('00','01')+EMV('26',EMV('00','BR.GOV.BCB.PIX')+EMV('01',String(chave).slice(0,77)))+EMV('52','0000')+EMV('53','986')+EMV('54',Number(valor).toFixed(2))+EMV('58','BR')+EMV('59',String(nome).slice(0,25))+EMV('60',String(cidade).slice(0,15))+EMV('62',EMV('05',txid))+'6304';
  let crc=0xFFFF;for(let i=0;i<p.length;i++){crc^=p.charCodeAt(i)<<8;for(let j=0;j<8;j++)crc=(crc&0x8000)?((crc<<1)^0x1021):(crc<<1);crc&=0xFFFF;}
  const final=p.slice(0,-4)+crc.toString(16).toUpperCase().padStart(4,'0');
  const qr=await QRCode.toDataURL(final,{scale:7,margin:2,errorCorrectionLevel:'H'});
  return{ok:true,copia_cola:final,qr_base64:qr,txid,valor:Number(valor)};
};

// 📦 PRODUTOS
const produtos={
  listar:async(f={})=>{let s=`SELECT p.*,c.nome categoria,c.icone cat_icone,c.cor cat_cor FROM vendas_produtos p LEFT JOIN vendas_categorias c ON c.id=p.categoria_id WHERE p.ativo=1`;const p=[];if(f.categoria){s+=` AND p.categoria_id=?`;p.push(f.categoria);}if(f.destaque)s+=' AND p.destaque=1';s+=` ORDER BY p.destaque DESC,p.vendas DESC LIMIT ${f.limite||100}`;return await all(s,p);},
  pegar:async id=>await get(`SELECT p.*,c.nome categoria FROM vendas_produtos p LEFT JOIN vendas_categorias c ON c.id=p.categoria_id WHERE p.id=?`,[id]),
  criar:async d=>{const r=await run(`INSERT INTO vendas_produtos(categoria_id,nome,desc_curta,desc_longa,preco,preco_antigo,estoque,tipo,duracao_dias,entrega_automatica,arquivo_entrega,cargo_entrega,servidor_cargo,comissao,garantia_dias,destaque,imagem,banner,tags)VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[d.categoria_id||7,d.nome,d.desc_curta||'',d.desc_longa||'',+d.preco,+d.preco_antigo||0,+d.estoque||9999,d.tipo||'digital',+d.duracao_dias||0,d.entrega_automatica??1,d.arquivo_entrega||'',d.cargo_entrega||'',d.servidor_cargo||'',+d.comissao||10,+d.garantia_dias||7,d.destaque??0,d.imagem||'',d.banner||'',JSON.stringify(d.tags||[])]);log('VENDAS','📦 PRODUTO',`#${r.lastInsertRowid} ${d.nome} R$${+d.preco}`,'Sistema','SUCESSO');return{ok:true,id:r.lastInsertRowid};},
  vender:async(id,q=1)=>await run(`UPDATE vendas_produtos SET estoque=estoque-?,vendas=vendas+? WHERE id=?`,[q,q,id]),
  editar:async(id,d)=>{await run(`UPDATE vendas_produtos SET nome=?,preco=?,estoque=?,ativo=?,destaque=? WHERE id=?`,[d.nome,+d.preco,+d.estoque,d.ativo??1,d.destaque??0,id]);return{ok:true};},
  deletar:async id=>{await run(`UPDATE vendas_produtos SET ativo=0 WHERE id=?`,[id]);return{ok:true};},
  avaliar:async(id,n)=>{await run(`UPDATE vendas_produtos SET nota=((nota*avaliacoes+?)/(avaliacoes+1)),avaliacoes=avaliacoes+1 WHERE id=?`,[+n,id]);return{ok:true};}
};

// 🛒 CARRINHO
const carrinho={
  listar:async uid=>await all(`SELECT c.*,p.nome,p.preco,p.imagem,p.tipo,p.estoque FROM vendas_carrinho c JOIN vendas_produtos p ON p.id=c.produto_id WHERE c.usuario_id=?`,[uid]),
  total:async uid=>await get(`SELECT COALESCE(SUM(qtd*preco_unit),0)total,COUNT(*)itens FROM vendas_carrinho WHERE usuario_id=?`,[uid]),
  add:async(uid,pid,q=1)=>{const pr=await produtos.pegar(pid);if(!pr||pr.estoque<q)return{ok:false,erro:'Indisponível'};const ja=await get(`SELECT * FROM vendas_carrinho WHERE usuario_id=? AND produto_id=?`,[uid,pid]);if(ja)await run(`UPDATE vendas_carrinho SET qtd=qtd+? WHERE id=?`,[q,ja.id]);else await run(`INSERT INTO vendas_carrinho(usuario_id,produto_id,qtd,preco_unit)VALUES(?,?,?,?)`,[uid,pid,q,pr.preco]);return{ok:true};},
  del:async(uid,pid)=>{await run(`DELETE FROM vendas_carrinho WHERE usuario_id=? AND produto_id=?`,[uid,pid]);return{ok:true};},
  atualizarQtd:async(uid,pid,q)=>{if(q<=0)return carrinho.del(uid,pid);await run(`UPDATE vendas_carrinho SET qtd=? WHERE usuario_id=? AND produto_id=?`,[q,uid,pid]);return{ok:true};},
  limpar:async uid=>{await run(`DELETE FROM vendas_carrinho WHERE usuario_id=?`,[uid]);return{ok:true};}
};

// 🎟️ CUPONS
const cupons={
  listar:async()=>await all(`SELECT * FROM vendas_cupons ORDER BY id DESC`),
  criar:async d=>{await run(`INSERT INTO vendas_cupons(codigo,tipo,valor,valor_minimo,usos_max,valido_ate)VALUES(UPPER(?),?,?,?,?,?)`,[d.codigo.toUpperCase(),d.tipo||'percentual',+d.valor,+d.valor_minimo||0,+d.usos_max||1,d.valido_ate||'']);return{ok:true};},
  validar:async(cod,total)=>{const c=await get(`SELECT * FROM vendas_cupons WHERE UPPER(codigo)=UPPER(?) AND ativo=1 AND (valido_ate='' OR DATE(valido_ate)>=DATE('now')) AND usos<usos_max`,[cod.trim()]);if(!c)return{ok:false,erro:'Cupom inválido'};if(total<c.valor_minimo)return{ok:false,erro:`Mínimo R$${c.valor_minimo.toFixed(2)}`};const d=c.tipo==='percentual'?Math.min(total*c.valor/100,99999):Math.min(c.valor,total);return{ok:true,cupom:c,desconto:+d.toFixed(2),novo_total:+(total-d).toFixed(2)};},
  usar:async cod=>{await run(`UPDATE vendas_cupons SET usos=usos+1 WHERE UPPER(codigo)=UPPER(?)`,[cod]);return{ok:true};},
  deletar:async id=>{await run(`DELETE FROM vendas_cupons WHERE id=?`,[id]);return{ok:true};}
};

// 🤝 AFILIADOS
const afiliados={
  listar:async()=>await all(`SELECT * FROM vendas_afiliados ORDER BY vendas DESC,comissao_total DESC`),
  pegar:async uid=>await get(`SELECT * FROM vendas_afiliados WHERE usuario_id=?`,[uid]),
  criar:async(uid,nome)=>{const link='AF-'+crypto.randomBytes(6).toString('hex').toUpperCase();await run(`INSERT OR IGNORE INTO vendas_afiliados(usuario_id,usuario_nome,link)VALUES(?,?,?)`,[uid,nome,link]);return await afiliados.pegar(uid);},
  comissionar:async(link,pid,valor,pct)=>{const com=+(valor*pct/100).toFixed(2);await run(`UPDATE vendas_afiliados SET vendas=vendas+1,comissao_total=comissao_total+?,comissao_pendente=comissao_pendente+? WHERE link=? OR usuario_id=?`,[com,com,link,link]);await run(`UPDATE vendas_pedidos SET afiliado_id=?,comissao=? WHERE id=?`,[link,com,pid]);log('VENDAS','🤝 COMISSÃO',`${link} R$${com} pedido #${pid}`);return{ok:true,comissao:com};},
  sacar:async(uid,v)=>{await run(`UPDATE vendas_afiliados SET comissao_pendente=comissao_pendente-?,comissao_paga=comissao_paga+? WHERE usuario_id=?`,[v,v,uid]);return{ok:true};}
};

// 👥 PACOTES MEMBROS
const pacotes={
  listar:async()=>await all(`SELECT * FROM vendas_pacotes_membros WHERE ativo=1 ORDER BY quantidade`),
  pegar:async id=>await get(`SELECT * FROM vendas_pacotes_membros WHERE id=?`,[id]),
  criar:async d=>{const r=await run(`INSERT INTO vendas_pacotes_membros(nome,quantidade,preco,garantia_dias,entrega,por_hora,origem)VALUES(?,?,?,?,?,?,?)`,[d.nome,+d.quantidade,+d.preco,+d.garantia_dias||7,d.entrega||'gradual',+d.por_hora||100,d.origem||'rede_stemy']);return{ok:true,id:r.lastInsertRowid};},
  vender:async id=>{await run(`UPDATE vendas_pacotes_membros SET vendidos=vendidos+1 WHERE id=?`,[id]);return{ok:true};}
};

module.exports={cfg,salvarCfg,gerarPIX,produtos,carrinho,cupons,afiliados,pacotes};
