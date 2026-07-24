/* ==========================================================
   🚀 INSTALA TUDO — Tabelas + 25 BOT PREMIUM
   ========================================================== */
const { exec, run, all, get } = require('./core/database');
const fs = require('fs');
const path = require('path');

const SQL = `
-- ==================== 🎟️ TICKETS ====================
CREATE TABLE IF NOT EXISTS ticket_config(id INTEGER PRIMARY KEY CHECK(id=1),servidor_id TEXT DEFAULT '',cargo_staff TEXT DEFAULT '',cargo_supervisor TEXT DEFAULT '',cargo_obrigatorio_abrir TEXT DEFAULT '',categoria_abrir TEXT DEFAULT '',categoria_fechados TEXT DEFAULT '',canal_painel TEXT DEFAULT '',canal_logs TEXT DEFAULT '',max_por_usuario INTEGER DEFAULT 3,mensagem_abertura TEXT DEFAULT 'Olá {user}, seu ticket foi aberto!',mensagem_fechamento TEXT DEFAULT 'Fechado por {staff}. Obrigado!',auto_close_horas INTEGER DEFAULT 72,claim_obrigatorio INTEGER DEFAULT 1,ativo INTEGER DEFAULT 1);
INSERT OR IGNORE INTO ticket_config(id)VALUES(1);

CREATE TABLE IF NOT EXISTS tickets(id INTEGER PRIMARY KEY AUTOINCREMENT,numero TEXT UNIQUE NOT NULL,canal_id TEXT UNIQUE NOT NULL,servidor_id TEXT NOT NULL,usuario_id TEXT NOT NULL,usuario_nome TEXT NOT NULL,assunto TEXT NOT NULL,categoria TEXT DEFAULT 'Geral',prioridade TEXT DEFAULT 'Normal',status TEXT DEFAULT 'aberto',staff_claim TEXT DEFAULT '',staff_claim_nome TEXT DEFAULT '',fechado_por TEXT DEFAULT '',motivo_fechamento TEXT DEFAULT '',avaliacao INTEGER DEFAULT 0,mensagens INTEGER DEFAULT 0,criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,fechado_em TEXT DEFAULT '');
CREATE INDEX IF NOT EXISTS idx_tk_usr ON tickets(usuario_id,status);

CREATE TABLE IF NOT EXISTS ticket_categorias(id INTEGER PRIMARY KEY AUTOINCREMENT,nome TEXT UNIQUE NOT NULL,emoji TEXT DEFAULT '📝',cor TEXT DEFAULT 'PRIMARY',descricao TEXT DEFAULT '',cargo_staff_especifico TEXT DEFAULT '',ordem INTEGER DEFAULT 0,ativo INTEGER DEFAULT 1);
INSERT OR IGNORE INTO ticket_categorias(nome,emoji,cor,descricao,ordem)VALUES('Compra e Pagamento','🛒','SUCCESS','Dúvidas e confirmação de pagamentos',1),('Suporte Técnico','⚙️','PRIMARY','Instalação, erros, bugs',2),('Denúncia','🚨','DANGER','Quebra de regras',3),('Parceria','🤝','SECONDARY','Propostas comerciais',4),('Reembolso','💰','SUCCESS','Devolução de valores',5),('Outro Assunto','📝','SECONDARY','Demais atendimentos',99);

CREATE TABLE IF NOT EXISTS ticket_mensagens(id INTEGER PRIMARY KEY AUTOINCREMENT,ticket_id INTEGER NOT NULL,usuario_id TEXT NOT NULL,usuario_nome TEXT NOT NULL,staff INTEGER DEFAULT 0,mensagem TEXT NOT NULL,anexos TEXT DEFAULT '[]',data DATETIME DEFAULT CURRENT_TIMESTAMP);

-- ==================== 💰 VENDAS ====================
CREATE TABLE IF NOT EXISTS vendas_config(id INTEGER PRIMARY KEY CHECK(id=1),pix_chave TEXT DEFAULT '',pix_nome TEXT DEFAULT 'STEMY FUNDAÇÃO',pix_cidade TEXT DEFAULT 'SALVADOR',canal_painel_produtos TEXT DEFAULT '',canal_pedidos_novos TEXT DEFAULT '',canal_pagamentos_aprovados TEXT DEFAULT '',cargo_atendente TEXT DEFAULT '',cargo_gerente TEXT DEFAULT '',cargo_vip TEXT DEFAULT '',servidor_cargo TEXT DEFAULT '',webhook_url TEXT DEFAULT '',taxa REAL DEFAULT 0,moeda TEXT DEFAULT 'BRL',entrega_auto INTEGER DEFAULT 1,garantia_padrao INTEGER DEFAULT 7,comissao_padrao REAL DEFAULT 10,cupom_primeira TEXT DEFAULT '',desc_primeira REAL DEFAULT 5,ativo INTEGER DEFAULT 1);
INSERT OR IGNORE INTO vendas_config(id)VALUES(1);

CREATE TABLE IF NOT EXISTS vendas_categorias(id INTEGER PRIMARY KEY,nome TEXT UNIQUE,descricao TEXT,icone TEXT DEFAULT '📦',cor TEXT DEFAULT '#7C3AED',ativo INTEGER DEFAULT 1);
INSERT OR IGNORE INTO vendas_categorias(id,nome,descricao,icone,cor)VALUES(1,'Bots Premium','Os maiores bots do mercado','🤖','#6366F1'),(2,'Serviços','Configuração profissional','⚙️','#0EA5E9'),(3,'Membros','Pacotes para seu servidor','👥','#10B981'),(4,'VIP / Acessos','Cargos e benefícios','👑','#F59E0B'),(5,'Códigos / Scripts','Sistemas prontos','💻','#EC4899'),(6,'Hospedagem','VPS e Cloud','☁️','#8B5CF6'),(7,'Outros','Diversos','📦','#64748B');

CREATE TABLE IF NOT EXISTS vendas_produtos(id INTEGER PRIMARY KEY AUTOINCREMENT,categoria_id INTEGER DEFAULT 7,nome TEXT NOT NULL,desc_curta TEXT,desc_longa TEXT,preco REAL NOT NULL,preco_antigo REAL DEFAULT 0,estoque INTEGER DEFAULT 9999,tipo TEXT DEFAULT 'digital',duracao_dias INTEGER DEFAULT 0,entrega_automatica INTEGER DEFAULT 1,arquivo_entrega TEXT DEFAULT '',cargo_entrega TEXT DEFAULT '',servidor_entrega TEXT DEFAULT '',comissao REAL DEFAULT 10,garantia_dias INTEGER DEFAULT 7,destaque INTEGER DEFAULT 0,ativo INTEGER DEFAULT 1,vendas INTEGER DEFAULT 0,visualizacoes INTEGER DEFAULT 0,nota REAL DEFAULT 5,avaliacoes INTEGER DEFAULT 0,tags TEXT DEFAULT '[]',imagem TEXT DEFAULT '',banner TEXT DEFAULT '',criado_em DATETIME DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS vendas_pacotes_membros(id INTEGER PRIMARY KEY AUTOINCREMENT,nome TEXT NOT NULL,quantidade INTEGER NOT NULL,preco REAL NOT NULL,garantia_dias INTEGER DEFAULT 7,modo_entrega TEXT DEFAULT 'gradual',por_hora INTEGER DEFAULT 100,origem TEXT DEFAULT 'rede_stemy',ativo INTEGER DEFAULT 1,vendidos INTEGER DEFAULT 0);
INSERT OR IGNORE INTO vendas_pacotes_membros(nome,quantidade,preco)VALUES('100 Membros Verificados',100,19.90),('500 Membros',500,79.90),('1.000 Membros',1000,149.90),('2.500 Membros',2500,329.90),('5.000 Membros',5000,599.90),('10.000 Membros',10000,1099.90);

CREATE TABLE IF NOT EXISTS vendas_carrinho(id INTEGER PRIMARY KEY AUTOINCREMENT,usuario_id TEXT NOT NULL,produto_id INTEGER NOT NULL,quantidade INTEGER DEFAULT 1,preco_unitario REAL NOT NULL,UNIQUE(usuario_id,produto_id));
CREATE TABLE IF NOT EXISTS vendas_cupons(id INTEGER PRIMARY KEY AUTOINCREMENT,codigo TEXT UNIQUE NOT NULL,tipo TEXT DEFAULT 'percentual',valor REAL NOT NULL,valor_minimo REAL DEFAULT 0,usos_maximos INTEGER DEFAULT 1,usos INTEGER DEFAULT 0,valido_ate TEXT DEFAULT '',ativo INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS vendas_afiliados(id INTEGER PRIMARY KEY AUTOINCREMENT,usuario_id TEXT UNIQUE NOT NULL,usuario_nome TEXT NOT NULL,link TEXT UNIQUE NOT NULL,comissao REAL DEFAULT 10,vendas INTEGER DEFAULT 0,comissao_total REAL DEFAULT 0,comissao_paga REAL DEFAULT 0,comissao_pendente REAL DEFAULT 0,chave_pix TEXT DEFAULT '',ativo INTEGER DEFAULT 1);

CREATE TABLE IF NOT EXISTS vendas_pedidos(id INTEGER PRIMARY KEY AUTOINCREMENT,usuario_id TEXT,usuario_nome TEXT,usuario_email TEXT DEFAULT '',produtos TEXT NOT NULL,subtotal REAL NOT NULL,desconto REAL DEFAULT 0,frete REAL DEFAULT 0,total REAL NOT NULL,metodo TEXT DEFAULT 'pix',status TEXT DEFAULT 'pendente',pix_copia TEXT DEFAULT '',pix_qr TEXT DEFAULT '',pix_txid TEXT DEFAULT '',cupom_usado TEXT DEFAULT '',afiliado_id TEXT DEFAULT '',comissao_gerada REAL DEFAULT 0,endereco TEXT DEFAULT '',rastreio TEXT DEFAULT '',avaliacao INTEGER DEFAULT 0,pago_em TEXT DEFAULT '',enviado_em TEXT DEFAULT '',entregue_em TEXT DEFAULT '',cancelado_por TEXT DEFAULT '',motivo_cancelamento TEXT DEFAULT '',ip TEXT DEFAULT '',criado_em DATETIME DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS vendas_pix(id INTEGER PRIMARY KEY AUTOINCREMENT,pedido_id INTEGER UNIQUE NOT NULL,txid TEXT UNIQUE NOT NULL,valor REAL NOT NULL,status TEXT DEFAULT 'pendente',payload TEXT DEFAULT '',qr TEXT DEFAULT '',pago_em TEXT DEFAULT '',criado_em DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS vendas_entregas(id INTEGER PRIMARY KEY AUTOINCREMENT,pedido_id INTEGER NOT NULL,produto_id INTEGER NOT NULL,usuario_id TEXT NOT NULL,status TEXT DEFAULT 'pendente',dados TEXT DEFAULT '',tentativas INTEGER DEFAULT 0,erro TEXT DEFAULT '',data DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS vendas_assinaturas(id INTEGER PRIMARY KEY AUTOINCREMENT,usuario_id TEXT NOT NULL,produto_id INTEGER NOT NULL,pedido_id INTEGER NOT NULL,status TEXT DEFAULT 'ativa',valor REAL NOT NULL,proxima_cobranca TEXT NOT NULL,cobrancas INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS vendas_stats_dia(data TEXT PRIMARY KEY,pedidos INTEGER DEFAULT 0,faturamento REAL DEFAULT 0,cancelamentos INTEGER DEFAULT 0,produtos_vendidos INTEGER DEFAULT 0,novos_clientes INTEGER DEFAULT 0,afiliado_gerado REAL DEFAULT 0);

-- ==================== 🛡️ VERIFICAÇÃO GLOBAL ====================
CREATE TABLE IF NOT EXISTS verificacao_config(id INTEGER PRIMARY KEY CHECK(id=1),cargo_padrao TEXT DEFAULT '',canal_logs TEXT DEFAULT '',sincronizar_rede INTEGER DEFAULT 1,puxar_auto INTEGER DEFAULT 1,banir_falsos INTEGER DEFAULT 1,ativo INTEGER DEFAULT 1);
INSERT OR IGNORE INTO verificacao_config(id)VALUES(1);
CREATE TABLE IF NOT EXISTS verificacao_cargos(id INTEGER PRIMARY KEY AUTOINCREMENT,servidor_id TEXT NOT NULL,cargo_id TEXT NOT NULL,cargo_nome TEXT NOT NULL,bot_id TEXT DEFAULT NULL,UNIQUE(servidor_id,COALESCE(bot_id,'global')));
CREATE TABLE IF NOT EXISTS verificacao_global(id INTEGER PRIMARY KEY AUTOINCREMENT,usuario_id TEXT NOT NULL,usuario_nome TEXT NOT NULL,servidor_id TEXT NOT NULL,bot_origem TEXT DEFAULT '',metodo TEXT DEFAULT '',nivel_confianca INTEGER DEFAULT 100,data DATETIME DEFAULT CURRENT_TIMESTAMP,UNIQUE(usuario_id,servidor_id));

-- ==================== 🤖 25 BOT PREMIUM ====================
CREATE TABLE IF NOT EXISTS modelos(id INTEGER PRIMARY KEY AUTOINCREMENT,pasta TEXT UNIQUE NOT NULL,nome TEXT NOT NULL,categoria TEXT DEFAULT 'Premium',descricao TEXT DEFAULT '',icone TEXT DEFAULT '🤖',cor TEXT DEFAULT '#6366F1',comandos INTEGER DEFAULT 20,preco REAL DEFAULT 0,aprovado INTEGER DEFAULT 1,tem_verificacao INTEGER DEFAULT 0,vendas INTEGER DEFAULT 0,criado_em DATETIME DEFAULT CURRENT_TIMESTAMP);

-- ==================== 👥 USUÁRIOS / LOGS ====================
CREATE TABLE IF NOT EXISTS usuarios(id INTEGER PRIMARY KEY AUTOINCREMENT,discord_id TEXT UNIQUE NOT NULL,nome TEXT NOT NULL,email TEXT DEFAULT '',nivel INTEGER DEFAULT 1,saldo REAL DEFAULT 0,gastou REAL DEFAULT 0,afiliado_id TEXT DEFAULT '',indicado_por TEXT DEFAULT '',verificado INTEGER DEFAULT 0,banido INTEGER DEFAULT 0,token_api TEXT DEFAULT '',criado_em DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS logs(id INTEGER PRIMARY KEY AUTOINCREMENT,sistema TEXT DEFAULT 'GERAL',tipo TEXT DEFAULT 'INFO',titulo TEXT NOT NULL,descricao TEXT DEFAULT '',usuario TEXT DEFAULT 'Sistema',ip TEXT DEFAULT '',data DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_logs_data ON logs(data DESC);

CREATE TABLE IF NOT EXISTS dados(id INTEGER PRIMARY KEY AUTOINCREMENT,chave TEXT UNIQUE NOT NULL,valor TEXT DEFAULT '',data DATETIME DEFAULT CURRENT_TIMESTAMP);
`;

const BOTS = [
  ['01_bot_premium_vendas_pix','BOT Premium Vendas PIX Pro','Financeiro','O bot mais completo de vendas com PIX automático, entrega automática, afiliados e cupons','💰','#10B981',32],
  ['02_bot_premium_tickets_empresarial','BOT Premium Tickets Empresarial','Moderação','Atendimento nível empresarial com categorias, prioridades, SLA, claim e pesquisa de satisfação','🎟️','#0EA5E9',28],
  ['03_bot_premium_ia_gpt_4o','BOT Premium IA GPT-4o Completo','Utilidades','Inteligência artificial com chat, imagem, áudio, PDF e visão computacional','🤖','#8B5CF6',35],
  ['04_bot_premium_economia_global','BOT Premium Economia Global Pro','Diversão','Economia completa: trabalho, roubo, banco, loja, cassino, apostas, ranking','💸','#F59E0B',40],
  ['05_bot_premium_musica_pro','BOT Premium Música Pro 320kbps','Entretenimento','Toca YouTube, Spotify, SoundCloud, Deezer, rádio, letra, equalizador e DJ','🎵','#EC4899',30],
  ['06_bot_premium_sorteios_giveaways','BOT Premium Sorteios & Giveaways','Entretenimento','Sorteios com requisitos de cargo, servidor, convites, reações e tempo automático','🎁','#10B981',22],
  ['07_bot_premium_verificacao_rede','BOT Premium Verificação Rede Global','Segurança','Verificação CAPTCHA, anti-fake, sincronizada em toda rede com cargo automático','🛡️','#06B6D4',25],
  ['08_bot_premium_anti_raid_total','BOT Premium Anti-Raid Total Shield','Segurança','Bloqueia raids, anti-spam, anti-fake, anti-link, anti-everyone, modo lockdown','🚨','#EF4444',38],
  ['09_bot_premium_boas_vindas_ultra','BOT Premium Boas-Vindas Ultra','Utilidades','Mensagens personalizadas, imagem dinâmica, DM, cargos automáticos e contador','👋','#10B981',20],
  ['10_bot_premium_auto_roles_pro','BOT Premium Auto-Roles Pro','Utilidades','Menus, botões, reações, cargos por nível, convites, voz e data de entrada','🎖️','#6366F1',24],
  ['11_bot_premium_niveis_xp','BOT Premium Níveis & XP Pro','Diversão','XP por mensagem e voz, ranking global/servidor, recompensas por nível e cartões','⭐','#F59E0B',28],
  ['12_bot_premium_free_fire_salas','BOT Premium Free Fire Salas Automáticas','Jogos','Cria salas ranqueadas, competitivas, personalizadas, ranking e estatísticas FF','🔥','#F97316',45],
  ['13_bot_premium_clas_guildas','BOT Premium Clãs & Guildas Pro','Jogos','Gerencie clãs, guerras, membros, ranks, XP, batalhas e torneios','🏰','#6366F1',30],
  ['14_bot_premium_loja_servidor','BOT Premium Loja Servidor Completa','Economia','Loja com itens, cargos, moeda virtual, inventário e transações','🛒','#10B981',25],
  ['15_bot_premium_formularios','BOT Premium Formulários & Inscrições','Utilidades','Formulários com modais, aprovação, cargos, notificações e banco de dados','📝','#0EA5E9',22],
  ['16_bot_premium_sugestoes_votacoes','BOT Premium Sugestões & Votações','Comunidade','Sugestões com up/down, comentários, status, votações múltiplas e enquetes','💡','#F59E0B',18],
  ['17_bot_premium_logs_auditoria','BOT Premium Logs Auditoria Total','Segurança','Loga TUDO: mensagens, cargos, canais, voz, bans, kicks, entradas e saídas','📜','#64748B',42],
  ['18_bot_premium_eventos_agendados','BOT Premium Eventos Agendados Pro','Utilidades','Agenda mensagens, avisos, lembretes, cargos temporários e sorteios futuros','📅','#8B5CF6',24],
  ['19_bot_premium_backup_completo','BOT Premium Backup Completo Servidor','Segurança','Backup completo: canais, cargos, permissões, membros, emojis e stickers','💾','#0EA5E9',20],
  ['20_bot_premium_60_utilidades','BOT Premium 60+ Utilidades Gerais','Utilidades','Calculadora, clima, QR, cotação, encurtar, tradutor, sorteio, +50 ferramentas','🛠️','#64748B',62],
  ['21_bot_premium_anuncio_massivo','BOT Premium Anúncio Massivo DM Pro','Marketing','Envia DM para todos membros com filtros de cargo, atividade e data','📢','#F59E0B',22],
  ['22_bot_premium_niveis_voz','BOT Premium Níveis XP por Voz','Diversão','XP por tempo em call, ranking, recompensas, AFK detector e salas privadas','🔊','#8B5CF6',20],
  ['23_bot_premium_sorteios_reacao','BOT Premium Sorteios por Reação','Entretenimento','Sorteios onde participantes reagem para entrar, com requisitos automáticos','🎯','#EC4899',18],
  ['24_bot_premium_parcerias_pro','BOT Premium Parcerias Pro','Marketing','Gerencia parcerias, aprovação, divulgação automática, contadores e ranking','🤝','#0EA5E9',22],
  ['25_bot_premium_anti_scam','BOT Premium Anti-Scam & Links Falsos','Segurança','Detecta e apaga golpes, phishing, Nitro falso, links maliciosos e vírus','🔗','#EF4444',26]
];

async function main() {
  console.log('🗄️ Criando tabelas...');
  await exec(SQL);
  console.log('✅ Tabelas criadas');

  console.log('🤖 Inserindo 25 BOT PREMIUM...');
  for (const b of BOTS) {
    await run(
      'INSERT OR IGNORE INTO modelos(pasta,nome,categoria,descricao,icone,cor,comandos,aprovado)VALUES(?,?,?,?,?,?,?,1)',
      b
    );
  }

  const total = await get('SELECT COUNT(*) AS n FROM modelos WHERE aprovado=1');
  const cmds = await get('SELECT SUM(comandos) AS s FROM modelos WHERE aprovado=1');
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('✅ TUDO INSTALADO COM SUCESSO!');
  console.log('═══════════════════════════════════════════════════');
  console.log(`🤖 ${total.n} BOT PREMIUM cadastrados`);
  console.log(`⚙️ ${cmds.s} COMANDOS TOTAIS prontos`);
  console.log(`🗃️ Todas tabelas: Tickets, Vendas, Verificação, Bots, Usuários, Logs`);
  console.log('═══════════════════════════════════════════════════');
}

main().catch(e => {
  console.error('❌ ERRO:', e.message);
  console.error(e.stack);
  process.exit(1);
});
