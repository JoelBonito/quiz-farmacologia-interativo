# FASE 5: IA Personalizada - Geração de Resumos com Gemini

## 📝 Visão Geral

A Fase 5 implementa a geração automática de **resumos de estudo personalizados** usando IA (Google Gemini). O sistema analisa todas as dificuldades acumuladas do aluno (marcadas via Quiz, Flashcards e Resumos) e gera um texto didático focado EXCLUSIVAMENTE nos tópicos que o aluno NÃO entendeu.

## 🎯 Objetivo

Fechar o ciclo de aprendizado adaptativo:
1. Aluno marca "NÃO SEI" em quiz/flashcards/resumos
2. Sistema registra dificuldades no banco de dados
3. IA analisa padrões de dificuldade
4. **IA gera resumo personalizado focado nas lacunas de conhecimento**
5. Aluno estuda resumo e testa novamente

## 🔧 Implementação Técnica

### Arquivos Criados/Modificados

**Novos:**
- `resumo-personalizado.html` - Interface para visualizar resumo gerado pela IA
- `FASE5-RESUMOS-IA.md` - Documentação da Fase 5

**Modificados:**
- `js/gemini.js` - Adicionada função `generateResumoPersonalizado()`
- `js/materia.js` - Implementada função `gerarResumo()` (antes placeholder)
- `js/quiz-controller.js` - Adicionada `gerarResumoPersonalizadoQuiz()`
- `js/flashcards-controller.js` - Adicionada `gerarResumoPersonalizadoFlashcards()`
- `quiz.html` - CTA para gerar resumo no modal de resultado
- `flashcards.html` - CTA para gerar resumo no modal de resultado

### Fluxo de Geração

```
1. Usuário clica "Gerar Resumo Personalizado"
   ↓
2. Sistema verifica critérios mínimos (3+ dificuldades)
   ↓
3. prepararDadosResumoPersonalizado() agrupa dificuldades por tópico
   ↓
4. generateResumoPersonalizado() envia dados ao Gemini
   ↓
5. Gemini gera resumo didático em markdown
   ↓
6. Sistema salva no banco (tabela resumos)
   ↓
7. Redireciona para resumo-personalizado.html
```

### Prompt Engineering

O prompt enviado ao Gemini inclui:

**Contexto:**
- Total de dificuldades registradas
- Lista de tópicos ordenados por prioridade (nível × frequência)
- Perguntas relacionadas
- Trechos marcados como "não entendi"

**Instruções:**
- Foco TOTAL nos tópicos listados
- Linguagem didática e acessível
- Estrutura por tópico: Conceito → Importância → Como Funciona → Dica Mnemônica → Erro Comum
- Formato markdown
- Tom motivacional

**Configuração da API:**
- `temperature: 0.4` (mais determinístico para conteúdo educacional)
- `maxOutputTokens: 8192` (permite resumos longos)

## 📊 Critérios para Geração

O sistema sugere gerar resumo quando:
- **Pelo menos 3 dificuldades registradas**, OU
- **Pelo menos 1 dificuldade nível 3+**, OU
- **Pelo menos 2 tópicos diferentes com dificuldade**

*(Ver função `deveGerarResumoPersonalizado()` em `js/dificuldades.js:263`)*

## 🚀 Como Usar

### 1. Via Matéria Dashboard
```
materia.html → Ações Rápidas → "Resumo Personalizado"
```

### 2. Após Quiz
```
quiz.html → Finalizar Quiz → Modal de Resultado → "✨ Gerar Resumo com IA"
```

### 3. Após Flashcards
```
flashcards.html → Finalizar → Modal de Resultado → "✨ Gerar Resumo com IA"
```

## 📦 Estrutura de Dados

### Resumo Salvo no Banco

```javascript
{
  materia_id: UUID,
  titulo: "Resumo Personalizado - Farmacologia",
  tipo_resumo: 'personalizado', // vs 'geral'
  conteudo: "## Tópico 1\n\n...", // Markdown gerado
  conteudo_estruturado: {
    topicos: ["Agonistas beta-adrenérgicos", ...],
    totalDificuldades: 12
  },
  gerado_por: 'ia', // vs 'manual' ou 'upload'
  baseado_em_dificuldades: true,
  dificuldades_ids: [UUID, UUID, ...] // Link bidirecional
}
```

## 🎨 Interface - resumo-personalizado.html

**Recursos:**
- ✅ Renderização de markdown (usando marked.js)
- ✅ Destaque dos tópicos abordados (badges)
- ✅ Estatísticas (dificuldades, tópicos, data)
- ✅ Botão para imprimir
- ✅ Botão para estudar com marcações (redireciona para resumos.html)
- ✅ Botão para gerar novo resumo

**Estilos específicos:**
- Títulos (h2-h4) em tons de roxo (#8B5CF6)
- Listas formatadas
- Citações com borda lateral
- Design responsivo

## 🔗 Integração com Fases Anteriores

**Fase 1 (Tracking):**
- Usa dados de `dificuldades_aluno`
- Link bidirecional: resumo ↔ dificuldades

**Fase 2 (Quiz):**
- Modal de resultado sugere geração
- Dados de perguntas incluídos no contexto da IA

**Fase 3 (Flashcards):**
- Modal de resultado sugere geração
- Conceitos dos flashcards incluídos no contexto

**Fase 4 (Resumos Interativos):**
- Usa tabela `resumos` existente
- Pode-se converter resumo personalizado em resumo com marcações

## 🧪 Testando

1. **Acumular dificuldades:**
   - Fazer quiz e marcar "NÃO SEI" em 3+ perguntas
   - OU fazer flashcards e marcar "NÃO SEI"

2. **Gerar resumo:**
   - Ao finalizar quiz/flashcards, clicar no botão "✨ Gerar Resumo com IA"
   - OU ir em materia.html → "Resumo Personalizado"

3. **Verificar resultado:**
   - Resumo deve focar nos tópicos marcados
   - Deve ter tom didático e motivacional
   - Deve estar em markdown formatado

## 📈 Métricas de Sucesso

- ✅ Geração de resumos em <30 segundos
- ✅ Resumos focados (não incluem tópicos não marcados)
- ✅ Linguagem didática e clara
- ✅ Integração perfeita com Quiz e Flashcards
- ✅ Interface responsiva e intuitiva

## 🔮 Melhorias Futuras

1. **Cache de resumos:** Evitar regerar para mesmas dificuldades
2. **Versioning:** Manter histórico de resumos gerados
3. **Comparação:** Mostrar evolução das dificuldades ao longo do tempo
4. **Exportação:** PDF, DOCX, Notion, etc.
5. **Personalização:** Permitir ajustar tom (formal/informal) e profundidade

## 🎓 Impacto Pedagógico

**Antes:** Aluno estuda conteúdo genérico que pode já dominar

**Depois:** Aluno recebe resumo 100% focado nas suas lacunas de conhecimento

**Resultado esperado:**
- ⬆️ Eficiência do estudo (tempo gasto nos tópicos certos)
- ⬆️ Motivação (sistema reconhece dificuldades específicas)
- ⬆️ Retenção (revisão direcionada)

---

**Desenvolvido na Fase 5** | Última atualização: 2025-01-15
