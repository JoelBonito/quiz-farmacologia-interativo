# 🚀 SETUP - Quiz Interativo com IA

Guia completo para configurar e executar o projeto.

---

## 📋 PRÉ-REQUISITOS

- ✅ Conta no [Supabase](https://supabase.com) (gratuita)
- ✅ Chave API do [Google Gemini](https://aistudio.google.com/app/apikey) (gratuita)
- ✅ Git instalado
- ✅ Navegador moderno

---

## 🔧 PASSO 1: CONFIGURAR SUPABASE

### 1.1 Criar Projeto
1. Acesse https://supabase.com
2. Clique em **"New Project"**
3. Preencha:
   - **Nome:** quiz-farmacologia (ou qualquer nome)
   - **Database Password:** Crie uma senha forte
   - **Region:** Escolha a mais próxima
4. Aguarde ~2 minutos até o projeto ser criado

### 1.2 Executar Schema do Banco de Dados
1. No painel do Supabase, vá em **SQL Editor** (ícone 📝 no menu lateral)
2. Clique em **"+ New Query"**
3. Abra o arquivo `database-schema.sql` deste projeto
4. **Copie TODO o conteúdo** do arquivo
5. **Cole** no SQL Editor do Supabase
6. Clique em **"Run"** (ou pressione `Ctrl+Enter`)
7. ✅ Deve aparecer "Success. No rows returned"

### 1.3 Configurar Storage Bucket
1. No menu lateral, vá em **Storage**
2. Clique em **"Create a new bucket"**
3. Preencha:
   - **Name:** `materias-arquivos`
   - **Public bucket:** ❌ Deixe DESMARCADO (privado)
4. Clique em **"Create bucket"**

5. Configure as políticas de acesso:
   - Clique no bucket `materias-arquivos`
   - Vá na aba **"Policies"**
   - Clique em **"New Policy"** → **"For full customization"**

   **Política 1: Upload (INSERT)**
   ```sql
   CREATE POLICY "Users can upload to own folder"
   ON storage.objects FOR INSERT
   WITH CHECK (
     bucket_id = 'materias-arquivos'
     AND (storage.foldername(name))[1] = auth.uid()::text
   );
   ```

   **Política 2: Download (SELECT)**
   ```sql
   CREATE POLICY "Users can download own files"
   ON storage.objects FOR SELECT
   USING (
     bucket_id = 'materias-arquivos'
     AND (storage.foldername(name))[1] = auth.uid()::text
   );
   ```

   **Política 3: Delete (DELETE)**
   ```sql
   CREATE POLICY "Users can delete own files"
   ON storage.objects FOR DELETE
   USING (
     bucket_id = 'materias-arquivos'
     AND (storage.foldername(name))[1] = auth.uid()::text
   );
   ```

### 1.4 Configurar Autenticação
1. Vá em **Authentication** → **Providers**
2. Certifique-se que **Email** está habilitado ✅
3. Em **Email Templates** (opcional):
   - Customize os e-mails de confirmação e recuperação de senha

### 1.5 Obter Credenciais
1. Vá em **Project Settings** (ícone ⚙️)
2. Clique em **API**
3. Copie:
   - ✅ **Project URL**
   - ✅ **anon/public key**

---

## 🤖 PASSO 2: OBTER CHAVE GEMINI API

1. Acesse https://aistudio.google.com/app/apikey
2. Faça login com sua conta Google
3. Clique em **"Create API Key"**
4. Copie a chave gerada ✅

---

## 💻 PASSO 3: CONFIGURAR O PROJETO

### 3.1 Clonar o Repositório
```bash
git clone https://github.com/JoelBonito/quiz-farmacologia-interativo.git
cd quiz-farmacologia-interativo
```

### 3.2 Configurar Credenciais

As credenciais já estão configuradas em `config/config.js` e `.env`.

**IMPORTANTE:**
- O arquivo `.env` está no `.gitignore` (não vai para o GitHub)
- Para produção no GitHub Pages, as credenciais estão em `config/config.js`
- Isso é seguro porque a `SUPABASE_ANON_KEY` é pública e segura para frontend

✅ **Nada precisa ser alterado se você já forneceu as credenciais!**

---

## 🌐 PASSO 4: EXECUTAR LOCALMENTE

### Opção 1: Servidor Python (Recomendado)
```bash
# Python 3
python -m http.server 8000

# Ou Python 2
python -m SimpleHTTPServer 8000
```

Acesse: http://localhost:8000

### Opção 2: Servidor Node.js
```bash
# Instalar servidor
npm install -g http-server

# Executar
http-server -p 8000
```

### Opção 3: Live Server (VS Code)
1. Instale a extensão **Live Server**
2. Clique com botão direito em `index.html`
3. Selecione **"Open with Live Server"**

---

## 🚀 PASSO 5: DEPLOY NO GITHUB PAGES

### 5.1 Configurar GitHub Pages
1. Vá no repositório do GitHub
2. **Settings** → **Pages**
3. Em **Source**, selecione:
   - Branch: `main` (ou a branch principal)
   - Folder: `/ (root)`
4. Clique em **Save**
5. Aguarde 2-3 minutos

### 5.2 Atualizar URL no Supabase
1. Volte no Supabase → **Authentication** → **URL Configuration**
2. Em **Site URL**, coloque: `https://joelbonito.github.io/quiz-farmacologia-interativo/`
3. Em **Redirect URLs**, adicione a mesma URL

---

## ✅ PASSO 6: TESTAR

### 6.1 Criar Primeira Conta
1. Acesse a aplicação
2. Clique em **"Criar Conta"**
3. Preencha:
   - Nome
   - E-mail
   - Senha (mínimo 6 caracteres)
4. ✅ Verifique seu e-mail e confirme

### 6.2 Criar Primeira Matéria
1. Faça login
2. Clique em **"+ Nova Matéria"**
3. Preencha:
   - Nome: ex: "Cardiologia"
   - Descrição (opcional)
   - Escolha ícone e cor
4. Clique em **"Criar Matéria"**

### 6.3 Upload de Arquivos
1. Clique em **"Gerenciar"** na matéria criada
2. Arraste arquivos (PDF, TXT, MD, JPG, PNG) ou clique para selecionar
3. Clique em **"Upload"**
4. Aguarde o upload completar ✅

### 6.4 Processar com IA
1. Clique em **"🤖 Processar com IA"**
2. Confirme o processamento
3. Aguarde (~1-3 minutos por arquivo)
4. ✅ Perguntas serão geradas automaticamente!

### 6.5 Fazer Quiz
1. Na matéria, clique em **"Iniciar Quiz"**
2. Responda as perguntas
3. Veja estatísticas e resultados

---

## 🐛 TROUBLESHOOTING

### Erro: "Failed to fetch"
- ✅ Verifique se o Supabase URL está correto
- ✅ Verifique se a chave anon está correta
- ✅ Verifique se o projeto Supabase está ativo

### Erro: "Invalid API key" (Gemini)
- ✅ Verifique se a chave Gemini está correta
- ✅ Acesse https://aistudio.google.com para gerar nova chave

### Upload não funciona
- ✅ Verifique se o bucket foi criado com o nome `materias-arquivos`
- ✅ Verifique se as políticas de storage foram aplicadas

### Não recebo e-mail de confirmação
- ✅ Verifique spam/lixo eletrônico
- ✅ No Supabase, vá em Authentication → Users → Confirme manualmente

### Processamento com IA demora muito
- ✅ Normal para arquivos grandes (PDFs com muitas páginas)
- ✅ Gemini Free tem rate limits (60 requisições/minuto)
- ✅ Tente processar poucos arquivos por vez

---

## 📚 ESTRUTURA DO PROJETO

```
quiz-farmacologia-interativo/
├── index.html              # Redirecionamento automático
├── auth.html               # Login/Registro
├── dashboard.html          # Dashboard de matérias
├── materia.html            # Gerenciar matéria específica
├── quiz-old.html           # Quiz antigo (backup)
│
├── config/
│   └── config.js           # Configurações (credenciais)
│
├── js/
│   ├── supabase-client.js  # Cliente Supabase
│   ├── auth.js             # Lógica de autenticação
│   ├── dashboard.js        # Lógica do dashboard
│   ├── materia.js          # Lógica de gerenciamento
│   ├── gemini.js           # Integração Gemini AI
│   └── quiz.js             # Lógica do quiz (antigo)
│
├── css/
│   ├── auth.css            # Estilos de login/registro
│   ├── dashboard.css       # Estilos do dashboard
│   ├── materia.css         # Estilos de matéria
│   └── quiz.css            # Estilos do quiz (antigo)
│
├── database-schema.sql     # Schema do banco de dados
├── .env                    # Variáveis de ambiente (local)
├── .gitignore              # Arquivos ignorados pelo Git
└── SETUP.md                # Este arquivo
```

---

## 🎯 PRÓXIMOS PASSOS (ROADMAP)

- [ ] Implementar geração de Resumos
- [ ] Implementar Flashcards de estudo
- [ ] Adicionar opção "NÃO SEI" no quiz
- [ ] Dashboard de dificuldades do aluno
- [ ] Sistema de revisão espaçada
- [ ] Exportar/importar matérias
- [ ] Estatísticas avançadas

---

## 🆘 SUPORTE

Problemas? Abra uma issue no GitHub:
https://github.com/JoelBonito/quiz-farmacologia-interativo/issues

---

## 📝 LICENÇA

Este projeto é de código aberto. Sinta-se livre para usar e modificar!

---

**Desenvolvido com ❤️ usando Supabase + Gemini AI**
