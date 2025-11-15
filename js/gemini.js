// ============================================
// GEMINI AI - PROCESSAMENTO E GERAÇÃO DE PERGUNTAS
// ============================================

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// ============================================
// PROCESSAR ARQUIVO E GERAR PERGUNTAS
// ============================================

async function processFileWithGemini(arquivo, materiaId) {
  try {
    console.log(`Processando arquivo: ${arquivo.nome_original}`);

    // 1. Baixar arquivo do Supabase Storage
    const fileBlob = await downloadFile(arquivo.storage_path);

    // 2. Extrair texto do arquivo
    const texto = await extractTextFromFile(fileBlob, arquivo.tipo);

    if (!texto || texto.trim().length < 50) {
      throw new Error('Não foi possível extrair texto suficiente do arquivo');
    }

    // 3. Atualizar status para 'processing'
    await updateArquivoStatus(arquivo.id, 'processing', texto);

    // 4. Gerar perguntas com Gemini
    const perguntas = await generateQuestionsWithGemini(texto, materiaId, arquivo.id);

    // 5. Salvar perguntas no banco
    if (perguntas && perguntas.length > 0) {
      await createPerguntas(perguntas);
    }

    // 6. Atualizar status para 'processed'
    await updateArquivoStatus(arquivo.id, 'processed', texto);

    return {
      success: true,
      perguntasGeradas: perguntas.length
    };

  } catch (error) {
    console.error('Erro ao processar arquivo:', error);

    // Atualizar status para 'error'
    await updateArquivoStatus(arquivo.id, 'error', null, error.message);

    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================
// EXTRAIR TEXTO DO ARQUIVO
// ============================================

async function extractTextFromFile(blob, tipo) {
  switch (tipo) {
    case 'txt':
    case 'md':
      return await blob.text();

    case 'pdf':
      return await extractTextFromPDF(blob);

    case 'jpg':
    case 'jpeg':
    case 'png':
      return await extractTextFromImage(blob);

    default:
      throw new Error('Tipo de arquivo não suportado');
  }
}

async function extractTextFromPDF(blob) {
  try {
    // Para PDFs, vamos usar a Google AI para extrair o texto
    // Convertendo PDF para base64
    const base64 = await blobToBase64(blob);

    const prompt = `Extraia todo o texto deste PDF. Retorne apenas o texto extraído, sem comentários adicionais.`;

    const response = await fetch(`${GEMINI_API_URL}?key=${CONFIG.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'application/pdf',
                data: base64.split(',')[1]
              }
            }
          ]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Erro ao processar PDF');
    }

    return data.candidates[0].content.parts[0].text;

  } catch (error) {
    console.error('Erro ao extrair texto do PDF:', error);
    throw new Error('Não foi possível extrair texto do PDF. Tente converter para TXT.');
  }
}

async function extractTextFromImage(blob) {
  try {
    const base64 = await blobToBase64(blob);

    const prompt = `Extraia todo o texto visível desta imagem. Se for uma imagem de conteúdo educacional (slides, notas, livro), transcreva todo o texto. Retorne apenas o texto extraído.`;

    const response = await fetch(`${GEMINI_API_URL}?key=${CONFIG.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: blob.type,
                data: base64.split(',')[1]
              }
            }
          ]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Erro ao processar imagem');
    }

    return data.candidates[0].content.parts[0].text;

  } catch (error) {
    console.error('Erro ao extrair texto da imagem:', error);
    throw new Error('Não foi possível extrair texto da imagem');
  }
}

// ============================================
// GERAR PERGUNTAS COM GEMINI
// ============================================

async function generateQuestionsWithGemini(texto, materiaId, arquivoId) {
  try {
    // Limitar texto a ~30k caracteres para não exceder limite da API
    const textoLimitado = texto.substring(0, 30000);

    const prompt = `Você é um professor especializado em criar questões educacionais de alta qualidade.

Analise o seguinte conteúdo e gere exatamente 20 perguntas variadas sobre o tema, seguindo estas regras:

REGRAS:
1. Misture os tipos: múltipla escolha (60%), verdadeiro/falso (20%), casos clínicos (20%)
2. Varie a dificuldade: fácil (20%), médio (60%), difícil (20%)
3. Para múltipla escolha: sempre 4 opções (A, B, C, D)
4. Foque nos conceitos mais importantes do texto
5. Seja preciso e baseie-se apenas no conteúdo fornecido
6. Evite pegadinhas ou ambiguidades

FORMATO DE SAÍDA (JSON):
Retorne um array JSON válido com este formato exato:

[
  {
    "pergunta": "Texto da pergunta",
    "tipo": "multipla_escolha",
    "opcoes": ["Opção A", "Opção B", "Opção C", "Opção D"],
    "resposta_correta": "Opção A",
    "dica": "Dica útil para ajudar o aluno",
    "justificativa": "Explicação detalhada da resposta correta",
    "dificuldade": "médio"
  }
]

Para verdadeiro/falso, use opcoes: ["Verdadeiro", "Falso"]

IMPORTANTE: Retorne APENAS o JSON, sem texto adicional antes ou depois.

CONTEÚDO PARA ANÁLISE:
${textoLimitado}`;

    const response = await fetch(`${GEMINI_API_URL}?key=${CONFIG.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Erro ao gerar perguntas');
    }

    let textoResposta = data.candidates[0].content.parts[0].text;

    // Limpar resposta (remover markdown, etc)
    textoResposta = textoResposta.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Parse JSON
    const perguntasGeradas = JSON.parse(textoResposta);

    // Adicionar materia_id e arquivo_id a cada pergunta
    const perguntasComIds = perguntasGeradas.map(p => ({
      ...p,
      materia_id: materiaId,
      arquivo_id: arquivoId,
      opcoes: JSON.stringify(p.opcoes) // Converter array para JSONB
    }));

    return perguntasComIds;

  } catch (error) {
    console.error('Erro ao gerar perguntas com Gemini:', error);
    throw new Error('Erro ao gerar perguntas: ' + error.message);
  }
}

// ============================================
// PROCESSAR MÚLTIPLOS ARQUIVOS
// ============================================

async function processMultipleFiles(arquivos, materiaId, onProgress) {
  const results = [];
  let totalPerguntas = 0;

  for (let i = 0; i < arquivos.length; i++) {
    const arquivo = arquivos[i];

    // Callback de progresso
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: arquivos.length,
        fileName: arquivo.nome_original
      });
    }

    const result = await processFileWithGemini(arquivo, materiaId);
    results.push(result);

    if (result.success) {
      totalPerguntas += result.perguntasGeradas;
    }

    // Pequeno delay entre arquivos para não sobrecarregar a API
    await sleep(1000);
  }

  return {
    results,
    totalPerguntas,
    sucessos: results.filter(r => r.success).length,
    erros: results.filter(r => !r.success).length
  };
}

// ============================================
// UTILITÁRIOS
// ============================================

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getFileIcon(tipo) {
  const icons = {
    pdf: '📄',
    txt: '📝',
    md: '📋',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️'
  };
  return icons[tipo] || '📁';
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ============================================
// FASE 5: GERAÇÃO DE RESUMOS PERSONALIZADOS
// ============================================

/**
 * Gera resumo personalizado focado nas dificuldades do aluno usando Gemini
 * @param {string} materiaId - ID da matéria
 * @param {string} materiaNome - Nome da matéria (ex: "Farmacologia")
 * @returns {Object} - { resumo, dificuldadesIds }
 */
async function generateResumoPersonalizado(materiaId, materiaNome = 'esta matéria') {
  try {
    console.log('🤖 Gerando resumo personalizado com Gemini...');

    // 1. Obter dados das dificuldades do aluno
    const dados = await DificuldadesService.prepararDadosResumoPersonalizado(materiaId);

    if (!dados || dados.topicos.length === 0) {
      throw new Error('Nenhuma dificuldade encontrada para gerar resumo');
    }

    // 2. Construir prompt personalizado focado nas dificuldades
    const topicosFormatados = dados.topicos.map((t, index) => {
      let descricao = `${index + 1}. **${t.topico}** (Dificuldade: ${t.nivelDificuldade}/5, Frequência: ${t.frequencia}x)`;

      if (t.subtopicos && t.subtopicos.length > 0) {
        descricao += `\n   - Aspectos específicos: ${t.subtopicos.join(', ')}`;
      }

      if (t.perguntas && t.perguntas.length > 0) {
        descricao += `\n   - Perguntas relacionadas:`;
        t.perguntas.slice(0, 2).forEach(p => {
          descricao += `\n     • ${p.substring(0, 100)}${p.length > 100 ? '...' : ''}`;
        });
      }

      if (t.textosOriginais && t.textosOriginais.length > 0) {
        descricao += `\n   - Trechos marcados como "não entendi":`;
        t.textosOriginais.slice(0, 2).forEach(txt => {
          descricao += `\n     • "${txt.substring(0, 80)}${txt.length > 80 ? '...' : ''}"`;
        });
      }

      return descricao;
    }).join('\n\n');

    const prompt = `Você é um professor especializado em ${materiaNome}, com excelente didática.

Um aluno está com dificuldades em alguns tópicos específicos. Crie um RESUMO DE ESTUDO PERSONALIZADO focado EXCLUSIVAMENTE nos tópicos que ele NÃO entendeu.

📊 ANÁLISE DAS DIFICULDADES DO ALUNO:
Total de dificuldades registradas: ${dados.totalDificuldades}

🎯 TÓPICOS QUE O ALUNO NÃO ENTENDEU (ordenados por prioridade):

${topicosFormatados}

📝 INSTRUÇÕES PARA O RESUMO:

1. **Foco Total**: Explique APENAS os tópicos listados acima. Não inclua conceitos que o aluno já domina.

2. **Linguagem Didática**:
   - Use linguagem clara e acessível
   - Evite jargões sem explicação
   - Use analogias quando possível
   - Divida conceitos complexos em partes simples

3. **Estrutura por Tópico**:
   Para cada tópico de dificuldade, inclua:
   - **Conceito Fundamental**: O que é? (definição clara)
   - **Por Que é Importante**: Relevância prática/clínica
   - **Como Funciona**: Mecanismo/processo explicado passo a passo
   - **Dica Mnemônica**: Se aplicável, uma forma fácil de lembrar
   - **Erro Comum**: O que costuma confundir os alunos neste tópico

4. **Formato**:
   - Use markdown para formatação (títulos ##, listas, negrito)
   - Seja objetivo mas completo
   - Máximo de 4000 palavras no total
   - Priorize os tópicos com maior dificuldade/frequência

5. **Tom Motivacional**:
   - Seja encorajador
   - Mostre que o conceito é compreensível com a explicação correta
   - Evite frases desanimadoras

IMPORTANTE: Retorne APENAS o texto do resumo em markdown, sem introduções como "Aqui está o resumo..." ou conclusões genéricas. Comece direto com o primeiro tópico.`;

    // 3. Chamar Gemini API
    const response = await fetch(`${GEMINI_API_URL}?key=${CONFIG.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.4, // Mais determinístico para conteúdo educacional
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Erro ao gerar resumo personalizado');
    }

    let resumoTexto = data.candidates[0].content.parts[0].text;

    // 4. Limpar resposta
    resumoTexto = resumoTexto.trim();

    // 5. Extrair IDs das dificuldades usadas para criar o resumo
    const dificuldadesIds = dados.topicos.map(t => t.id).filter(Boolean);

    console.log('✅ Resumo personalizado gerado com sucesso!');

    return {
      resumo: resumoTexto,
      dificuldadesIds: dificuldadesIds,
      topicos: dados.topicos.map(t => t.topico),
      totalDificuldades: dados.totalDificuldades
    };

  } catch (error) {
    console.error('❌ Erro ao gerar resumo personalizado:', error);
    throw new Error('Erro ao gerar resumo personalizado: ' + error.message);
  }
}
