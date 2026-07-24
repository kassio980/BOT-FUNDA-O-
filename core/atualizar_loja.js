const DB = require('./database');

(async () => {
  await DB.exec(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descricao TEXT,
      preco REAL NOT NULL,
      estoque INTEGER DEFAULT 0,
      entrega TEXT NOT NULL,
      imagem TEXT,
      categoria TEXT DEFAULT 'Geral',
      ativo INTEGER DEFAULT 1,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE NOT NULL,
      desconto INTEGER NOT NULL,
      limite_usos INTEGER,
      usos_feitos INTEGER DEFAULT 0,
      expira_em DATETIME,
      ativo INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS gift_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE NOT NULL,
      valor REAL NOT NULL,
      saldo REAL NOT NULL,
      usado_em TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vendas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      comprador_id TEXT NOT NULL,
      produto_id INTEGER NOT NULL,
      valor_pago REAL NOT NULL,
      metodo_pagamento TEXT,
      status TEXT DEFAULT 'pendente',
      entrega_enviada INTEGER DEFAULT 0,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS afiliados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id TEXT UNIQUE NOT NULL,
      codigo_afiliado TEXT UNIQUE NOT NULL,
      comissao_percentual REAL DEFAULT 10,
      total_ganho REAL DEFAULT 0,
      total_vendas INTEGER DEFAULT 0,
      ativo INTEGER DEFAULT 1
    );
  `);

  console.log('✅ Tabelas da Minions Store criadas/atualizadas');
  process.exit(0);
})();
