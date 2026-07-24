const DB = require('./database');

(async () => {
  await DB.exec(`
    CREATE TABLE IF NOT EXISTS config_verificacao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      servidor_id TEXT UNIQUE NOT NULL,
      cargo_verificado TEXT,
      canal_logs TEXT,
      titulo_mensagem TEXT DEFAULT '✅ VERIFICAÇÃO DE MEMBROS — STEMY FUNDAÇÃO',
      descricao_mensagem TEXT DEFAULT 'Clique no botão abaixo para confirmar sua identidade e liberar acesso completo ao servidor.',
      cor_embed TEXT DEFAULT '#9922FF',
      imagem_banner TEXT DEFAULT '',
      rodape_texto TEXT DEFAULT '© STEMY FUNDAÇÃO • Sistema Premium',
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS botoes_personalizados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      servidor_id TEXT NOT NULL,
      comando_nome TEXT NOT NULL,
      texto_botao TEXT,
      url_botao TEXT,
      estilo_botao INTEGER DEFAULT 1,
      UNIQUE(servidor_id, comando_nome)
    );
  `);

  console.log('✅ Banco atualizado com todas estruturas Premium');
  process.exit(0);
})();
