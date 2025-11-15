# ✅ Checklist: Quiz Funcional - O Que Falta?

## 🔧 CORREÇÕES APLICADAS (Já Feito)

✅ **Adicionado `js/gemini.js` em quiz.html e flashcards.html**
- Problema: Funções `generateResumoPersonalizado()` não eram encontradas
- Solução: Incluído script gemini.js nas páginas

## 📋 SETUP NECESSÁRIO (Você Precisa Fazer)

### 1. ⚡ Banco de Dados Supabase

**STATUS:** ❓ Precisa Verificar

**O que fazer:**
1. Acessar https://supabase.com/dashboard
2. Ir em projeto: `tpwkthafekcmhbcxvupd`
3. Abrir **SQL Editor**
4. Executar os scripts **NA ORDEM:**

```bash
# Ordem de execução:
1. database-schema.sql            # Schema principal (materias, arquivos, perguntas)
2. database-schema-fase1-fixed.sql # Dificuldades, progresso
3. database-schema-fase4-resumos.sql # Resumos e marcações
4. database-optimizations.sql     # Índices e performance (opcional mas recomendado)
```

**Como executar cada script:**
- Abrir arquivo .sql
- Copiar TODO o conteúdo
- Colar no SQL Editor do Supabase
- Clicar em **Run** (ou pressionar Ctrl+Enter)
- Verificar se não há erros

**Validação:**
- Ir em **Table Editor** no Supabase
- Verificar se existem as tabelas:
  - ✅ `materias`
  - ✅ `arquivos`
  - ✅ `perguntas`
  - ✅ `dificuldades_aluno`
  - ✅ `progresso_usuario`
  - ✅ `resumos`
  - ✅ `resumos_marcacoes`
  - ✅ `flashcards`

---

### 2. 🔐 Autenticação (Criar Conta)

**STATUS:** ❓ Precisa Verificar

**O que fazer:**
1. Abrir `index.html` ou `auth.html` no navegador
2. Criar uma conta de teste:
   - Email: seu-email@teste.com
   - Senha: mínimo 6 caracteres
3. Confirmar email (verificar inbox/spam)
4. Fazer login

**Validação:**
- Após login, deve redirecionar para `dashboard.html`
- Verificar console do navegador (F12) - não deve ter erros de auth

---

### 3. 📚 Criar Matéria

**STATUS:** ❓ Precisa Fazer

**O que fazer:**
1. No `dashboard.html`, clicar em **"+ Nova Matéria"**
2. Preencher:
   - Nome: "Farmacologia" (ou qualquer nome)
   - Descrição: "Estudo de farmacologia clínica"
   - Cor: Escolher cor (ex: roxo #8B5CF6)
   - Ícone: 💊 ou 📚
3. Salvar

**Validação:**
- Matéria aparece no dashboard
- Clicar na matéria abre `materia.html`

---

### 4. 📄 Upload de Arquivo + Geração de Perguntas

**STATUS:** ⚠️ **PASSO MAIS IMPORTANTE**

**O que fazer:**
1. Dentro de `materia.html`, clicar em **"Adicionar Arquivo"**
2. Fazer upload de:
   - **Opção 1:** PDF com conteúdo de farmacologia
   - **Opção 2:** TXT com texto de estudo
   - **Opção 3:** Imagem (JPG/PNG) com texto (usa OCR)

3. Aguardar processamento (pode levar 1-3 minutos):
   - Sistema extrai texto do arquivo
   - Gemini AI gera automaticamente 20 perguntas
   - Perguntas são salvas no banco

4. Verificar se status mudou para **"Processado ✓"**

**Validação:**
- Ver contador "X perguntas geradas"
- Ir em **Table Editor → perguntas** no Supabase
- Confirmar que há registros de perguntas
- Coluna `materia_id` deve corresponder à sua matéria

**⚠️ SEM PERGUNTAS, O QUIZ NÃO FUNCIONA**

---

### 5. 🎯 Iniciar Quiz

**STATUS:** 🎉 Pronto para testar (após passos 1-4)

**O que fazer:**
1. Em `materia.html`, clicar em **"Iniciar Quiz"** (Ações Rápidas)
2. Quiz carrega perguntas automaticamente
3. Responder perguntas:
   - Selecionar opção
   - Ver feedback instantâneo
   - Usar botão **"NÃO SEI"** para registrar dificuldades
4. Finalizar quiz
5. Ver resultados e análise de dificuldades

**Validação:**
- Perguntas aparecem corretamente
- Feedback mostra resposta certa/errada
- Botão "NÃO SEI" registra dificuldade
- Modal de resultado mostra estatísticas
- Botão "✨ Gerar Resumo com IA" aparece (se 3+ dificuldades)

---

## 🔍 DEBUGGING - Se Algo Não Funcionar

### Console do Navegador (F12)

**Erros comuns e soluções:**

#### 1. "CONFIG is not defined"
- Problema: config.js não carregou
- Solução: Verificar se arquivo `config/config.js` existe e está incluído no HTML

#### 2. "supabase is not defined"
- Problema: CDN do Supabase não carregou
- Solução: Verificar conexão com internet, ou usar versão local

#### 3. "Cannot read property 'from' of undefined"
- Problema: Cliente Supabase não inicializou
- Solução: Verificar credenciais em `config.js`

#### 4. "No questions found"
- Problema: Não há perguntas no banco
- Solução: **Upload arquivo e aguardar processamento** (Passo 4)

#### 5. "generateResumoPersonalizado is not defined"
- Problema: gemini.js não incluído (já corrigido!)
- Solução: ✅ Script já adicionado neste commit

#### 6. API Error: "API key not valid"
- Problema: Chave Gemini inválida ou expirada
- Solução: Gerar nova chave em https://makersuite.google.com/app/apikey

---

## 📊 Ordem de Teste Recomendada

```
1. ✅ Executar schemas SQL no Supabase
2. ✅ Criar conta e fazer login (auth.html)
3. ✅ Criar matéria (dashboard.html)
4. ✅ Upload arquivo PDF/TXT (materia.html)
5. ⏳ AGUARDAR processamento (1-3 min)
6. ✅ Verificar perguntas geradas (Supabase Table Editor)
7. 🎯 Iniciar Quiz (materia.html → Iniciar Quiz)
8. ✅ Responder quiz + usar "NÃO SEI"
9. ✅ Testar geração de resumo personalizado
10. 🎉 Sistema completo funcionando!
```

---

## 🚀 Arquivos Já Prontos

✅ HTML: quiz.html, flashcards.html, materia.html, dashboard.html, resumos.html, resumo-personalizado.html
✅ JS: Todos os controllers, gemini.js, supabase-client.js, dificuldades.js
✅ CSS: Todos os estilos
✅ Config: config.js com credenciais
✅ SQL: Todos os schemas

---

## 🎓 O Que Funciona AGORA (Após Setup)

### Quiz:
- ✅ Carregamento de perguntas do banco
- ✅ Múltipla escolha, verdadeiro/falso
- ✅ Feedback instantâneo (certo/errado)
- ✅ Botão "NÃO SEI" registra dificuldade
- ✅ Estatísticas em tempo real
- ✅ Modal de resultado final
- ✅ Integração com Fase 5 (resumo personalizado)

### Flashcards:
- ✅ Flip 3D
- ✅ Botões SEI / NÃO SEI
- ✅ Registro de dificuldades
- ✅ Progresso salvo
- ✅ Modal de resultado
- ✅ Geração de resumo

### Resumos:
- ✅ Seleção de texto
- ✅ Marcação "NÃO ENTENDI"
- ✅ Sidebar com marcações
- ✅ Integração com dificuldades

### IA Personalizada (Fase 5):
- ✅ Análise de dificuldades
- ✅ Geração de resumo com Gemini
- ✅ Prompt otimizado para educação
- ✅ Visualização em markdown
- ✅ Links bidirecionais (dificuldades ↔ resumo)

---

## ⚡ Quick Start - 5 Minutos

Se você só quer testar RÁPIDO:

```bash
1. Abrir Supabase SQL Editor
2. Executar database-schema.sql (cole tudo e Run)
3. Executar database-schema-fase1-fixed.sql
4. Abrir auth.html no navegador
5. Criar conta teste@teste.com / senha123
6. Criar matéria "Teste"
7. Upload um TXT simples com texto sobre farmacologia
8. Aguardar 2 minutos (veja loading)
9. Clicar "Iniciar Quiz"
10. 🎉 PRONTO!
```

---

**Última atualização:** 2025-01-15 após Fase 5
**Status:** ✅ Backend pronto | ⚠️ Precisa executar schemas | 🎯 Pronto para upload de arquivos
