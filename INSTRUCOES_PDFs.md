# 📚 Instruções para Adicionar PDFs de Referência

## Como Adicionar os PDFs

Para que eu possa validar as perguntas do quiz contra o material de farmacologia, siga estes passos:

### 1. Criar a pasta de referências

```bash
mkdir -p docs/referencias
```

### 2. Adicionar os 5 PDFs na pasta

Coloque seus arquivos PDF de farmacologia em `docs/referencias/`

Sugestão de nomes:
```
docs/referencias/
├── 01_corticosteroides.pdf
├── 02_broncodilatadores.pdf
├── 03_anticolinergicos.pdf
├── 04_ibp_antagonistas_h2.pdf
└── 05_leucotrienos_outros.pdf
```

### 3. Fazer commit dos PDFs

```bash
git add docs/referencias/*.pdf
git commit -m "Adicionar PDFs de referência de farmacologia"
git push
```

## O que será feito com os PDFs

Após você adicionar os PDFs, eu vou:

1. ✅ **Ler e analisar** o conteúdo de cada PDF
2. ✅ **Validar as 384 perguntas** contra o material
3. ✅ **Identificar erros conceituais** ou informações desatualizadas
4. ✅ **Verificar precisão** das justificativas
5. ✅ **Sugerir melhorias** baseadas no conteúdo dos PDFs
6. ✅ **Identificar gaps** (tópicos importantes não cobertos)
7. ✅ **Gerar relatório** detalhado de validação

## Tópicos que Serão Validados

Com base nas 384 perguntas atuais, vou validar:

### Corticosteroides (≈100 perguntas)
- Mecanismo de ação
- Efeitos adversos
- Supressão do eixo HPA
- Candidíase oral
- Uso em crianças

### Beta-2 Agonistas (≈80 perguntas)
- Mecanismo de ação
- SABA vs LABA
- Efeitos adversos (taquicardia, tremores)
- Uso na asma vs DPOC

### Anticolinérgicos (≈85 perguntas)
- SAMA vs LAMA
- Ipratrópio, tiotrópio
- Contraindicações

### IBPs e Antagonistas H2 (≈100 perguntas)
- Mecanismo (reversível vs irreversível)
- Administração (jejum)
- Efeitos adversos
- Interações (CYP2C19)
- Tratamento H. pylori

### Antagonistas de Leucotrienos (≈40 perguntas)
- Montelucaste
- Indicações
- Asma induzida por exercício

### Outros
- Metilxantinas (teofilina)
- Mucolíticos
- Casos clínicos

---

**Me avise quando adicionar os PDFs para eu começar a validação!** 📖
