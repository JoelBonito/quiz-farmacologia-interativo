# 🚀 Deploy Automático - Edge Functions

## Configuração do GitHub Actions

### 1️⃣ Secrets Necessários

Adicione os seguintes secrets no GitHub:

**Settings → Secrets and variables → Actions → New repository secret**

1. **SUPABASE_ACCESS_TOKEN**
   - Obter em: https://supabase.com/dashboard/account/tokens
   - Criar novo token com permissões de deploy

2. **SUPABASE_PROJECT_ID**
   - Valor: `tpwkthafekcmhbcxvupd`

### 2️⃣ Como Funciona

O deploy automático é acionado quando:
- ✅ Push para branch `master`
- ✅ Mudanças na pasta `supabase/functions/**`
- ✅ Trigger manual via GitHub Actions UI

### 3️⃣ Estrutura de Arquivos

```
.
├── .github/
│   └── workflows/
│       ├── deploy.yml                    # Deploy GitHub Pages
│       └── deploy-edge-functions.yml     # Deploy Edge Functions ✨
│
└── supabase/
    ├── config.toml                       # Configuração Supabase
    └── functions/
        └── process-with-gemini/
            └── index.ts                  # Edge Function
```

### 4️⃣ Fluxo de Deploy

```
1. Developer → git push → GitHub
   ↓
2. GitHub Actions detecta mudança em supabase/functions/
   ↓
3. Setup Deno + Supabase CLI
   ↓
4. Deploy para Supabase
   ↓
5. ✅ Edge Function atualizada!
```

### 5️⃣ Deploy Manual

```bash
# Via GitHub Actions UI
1. Ir em Actions
2. Selecionar "Deploy Supabase Edge Functions"
3. Click em "Run workflow"
4. Selecionar branch "master"
5. Click "Run workflow"
```

### 6️⃣ Comandos Locais (Opcional)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Deploy manual
supabase functions deploy process-with-gemini \
  --project-ref tpwkthafekcmhbcxvupd
```

### 7️⃣ Variáveis de Ambiente

Configurar no Supabase Dashboard:
- `GEMINI_API_KEY` - Chave da API do Google Gemini

### 8️⃣ Monitoramento

Ver logs da Edge Function:
```bash
supabase functions logs process-with-gemini \
  --project-ref tpwkthafekcmhbcxvupd
```

Ou no Dashboard: https://supabase.com/dashboard/project/tpwkthafekcmhbcxvupd/functions

---

## 🎯 Próximos Passos

1. ✅ Adicionar secrets no GitHub
2. ✅ Fazer push de mudanças em `supabase/functions/`
3. ✅ Verificar deploy em Actions
4. ✅ Testar Edge Function no app
