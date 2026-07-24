═══════════════════════════════════════════════════════════════
          ☁️  PASSO A PASSO COMPLETO — RENDER.COM
═══════════════════════════════════════════════════════════════

✅ PRÉ-REQUISITO: Você JÁ deu:
   git push -u origin main
   (seu código está NO GitHub)

═══════════════════════════════════════════════════════════════
1️⃣  ACESSE E CONECTE
═══════════════════════════════════════════════════════════════
1. Acesse: https://dashboard.render.com
2. Crie conta → escolha "Sign up with GitHub" (GRÁTIS)
3. Autorize o Render a ver seus repositórios
4. Na tela inicial: clique no botão AZUL →  + New → Web Service

═══════════════════════════════════════════════════════════════
2️⃣  ESCOLHA SEU REPOSITÓRIO
═══════════════════════════════════════════════════════════════
• Na lista → encontre:  stemy-fundacao-v2
• Clique no botão →  Connect

═══════════════════════════════════════════════════════════════
3️⃣  PREENCHA EXATAMENTE ASSIM (NÃO MUDE NADA!)
═══════════════════════════════════════════════════════════════

  CAMPO                    VALOR EXATO
  ─────────────────────────────────────────────────────────────
  Name:                    stemy-fundacao-v2
  Owner:                   (seu usuário GitHub)
  Region:                  São Paulo (BR)  ← MAIS RÁPIDO PRA VC
  Branch:                  main
  Root Directory:          (DEIXE VAZIO = raiz do repo)
  Runtime:                 Node
  Build Command:           npm install --omit=optional --no-audit --no-fund
  Start Command:           npm start
  Plan:                    Free  ← (GRÁTIS, dorme após 15min)
                           ou Pro  ← (pago, 24h online + rápido)

═══════════════════════════════════════════════════════════════
4️⃣  VARIÁVEIS DE AMBIENTE (OBRIGATÓRIO! SEM ISSO NÃO FUNCIONA)
═══════════════════════════════════════════════════════════════
Clique em:  Advanced → Add Environment Variable

ADICIONE ESSAS 3 VARIÁVEIS (1 por vez):

  ┌─────────────────────────────────────────────────────────┐
  │ 1) Key:   PORTA                                         │
  │    Value: 3000                                          │
  │    ☑️ NÃO marque encrypt                                 │
  └─────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────┐
  │ 2) Key:   NODE_ENV                                      │
  │    Value: production                                    │
  │    ☑️ NÃO marque encrypt                                 │
  └─────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────┐
  │ 3) Key:   STEMY_TOKEN        ← ⚠️ O MAIS IMPORTANTE!    │
  │    Value: COLE AQUI SEU TOKEN DO BOT DISCORD            │
  │    ✅ MARQUE A CAIXA:  Encrypt value                    │
  └─────────────────────────────────────────────────────────┘

  ⚠️ COMO PEGAR O TOKEN DO BOT:
  1. Acesse: https://discord.com/developers/applications
  2. New Application → nome: STEMY FUNDAÇÃO → Create
  3. Menu esquerdo → Bot → Reset Token → Copy
  4. Cole esse valor no Value acima
  5. Ainda em Bot: marque TODAS as caixas em "Privileged Gateway Intents":
     ✅ Presence Intent
     ✅ Server Members Intent
     ✅ Message Content Intent
  6. Menu → OAuth2 → URL Generator → marque:
     ✅ bot  +  ✅ applications.commands
     Depois em Bot Permissions marque: ✅ Administrator
  7. Copie o link do final, abra no navegador, adicione no seu servidor

═══════════════════════════════════════════════════════════════
5️⃣  CRIE O SERVIÇO
═══════════════════════════════════════════════════════════════
• Role até o final → clique no botão AZUL:
  ➜  Create Web Service

═══════════════════════════════════════════════════════════════
6️⃣  AGUARDE O DEPLOY (~2 a 4 MINUTOS)
═══════════════════════════════════════════════════════════════
Você verá um log rolando. Quando aparecer ISSO no final:

  > stemy-fundacao-v2.5@2.5.0 start
  > node app.js
  🚀 STEMY FUNDAÇÃO V2.5 — ONLINE NA PORTA 3000
  ✅ Your service is live 🎉

→ PRONTO! SISTEMA ONLINE NO MUNDO INTEIRO!

═══════════════════════════════════════════════════════════════
7️⃣  ACESSOS FINAIS
═══════════════════════════════════════════════════════════════
O Render te dará uma URL tipo:
   https://stemy-fundacao-v2.onrender.com

Use ela assim:
  🌐 Site:        https://stemy-fundacao-v2.onrender.com
  🎛️ Painel:      https://stemy-fundacao-v2.onrender.com/painel
  📚 Docs API:    https://stemy-fundacao-v2.onrender.com/api/docs
  🤖 Bot:         No seu Discord → /stemy_ajuda

═══════════════════════════════════════════════════════════════
❌ SE DER ERRO NO BUILD:
═══════════════════════════════════════════════════════════════
1. Mude o Build Command para:
   npm install --omit=optional --no-audit --no-fund --force
2. Mude Node Version (em Environment) para: 24.18.0
3. Re-deploy:  → Deploy → Deploy latest commit

