// ============================================
// CORE DO SISTEMA DE DIFICULDADES
// ============================================
// Este arquivo contém toda a lógica de tracking e análise
// de dificuldades do aluno

// ============================================
// REGISTRAR DIFICULDADES
// ============================================

/**
 * Registra dificuldade quando aluno clica "NÃO SEI" no quiz
 */
async function registrarDificuldadeQuiz(pergunta, materiaId) {
  try {
    const dificuldadeData = {
      materia_id: materiaId,
      tipo_origem: 'quiz',
      topico: pergunta.topico || extrairTopicoTexto(pergunta.pergunta),
      subtopico: pergunta.subtopico || null,
      conceito_especifico: pergunta.conceitos ? pergunta.conceitos[0] : null,
      texto_original: null,
      pergunta_relacionada: pergunta.pergunta,
      pergunta_id: pergunta.id
    };

    const dificuldade = await createDificuldade(dificuldadeData);
    console.log('✅ Dificuldade registrada:', dificuldade);

    return dificuldade;
  } catch (error) {
    console.error('❌ Erro ao registrar dificuldade do quiz:', error);
    throw error;
  }
}

/**
 * Registra dificuldade quando aluno clica "NÃO SEI" no flashcard
 */
async function registrarDificuldadeFlashcard(flashcard, materiaId) {
  try {
    // Suporta tanto objetos flashcard quanto perguntas usadas como flashcards
    const textoFrente = flashcard.frente || flashcard.pergunta;
    const topico = flashcard.topico || extrairTopicoTexto(textoFrente);

    const dificuldadeData = {
      materia_id: materiaId,
      tipo_origem: 'flashcard',
      topico: topico,
      subtopico: flashcard.subtopico || null,
      conceito_especifico: flashcard.conceitos ? flashcard.conceitos[0] : null,
      texto_original: textoFrente,
      pergunta_relacionada: textoFrente,
      pergunta_id: flashcard.id // Para rastrear origem
    };

    const dificuldade = await createDificuldade(dificuldadeData);
    console.log('✅ Dificuldade registrada:', dificuldade);

    return dificuldade;
  } catch (error) {
    console.error('❌ Erro ao registrar dificuldade do flashcard:', error);
    throw error;
  }
}

/**
 * Registra dificuldade quando aluno marca "NÃO ENTENDI" no resumo
 */
async function registrarDificuldadeResumo(resumoId, materiaId, selecao) {
  try {
    // Primeiro, criar a marcação no resumo
    const marcacao = await createMarcacao(resumoId, {
      texto_selecionado: selecao.texto,
      posicao_inicio: selecao.inicio || null,
      posicao_fim: selecao.fim || null,
      paragrafo_id: selecao.paragrafoId || null,
      tipo_marcacao: 'nao_entendi',
      nota_aluno: selecao.nota || null
    });

    // Depois, criar a dificuldade
    const topico = extrairTopicoTexto(selecao.texto);

    const dificuldadeData = {
      materia_id: materiaId,
      tipo_origem: 'resumo',
      topico: topico,
      subtopico: null,
      conceito_especifico: null,
      texto_original: selecao.texto,
      pergunta_relacionada: null
    };

    const dificuldade = await createDificuldade(dificuldadeData);
    console.log('✅ Dificuldade registrada:', dificuldade);

    return { marcacao, dificuldade };
  } catch (error) {
    console.error('❌ Erro ao registrar dificuldade do resumo:', error);
    throw error;
  }
}

// ============================================
// ANÁLISE DE DIFICULDADES
// ============================================

/**
 * Analisa dificuldades do aluno e retorna estatísticas
 */
async function analisarDificuldades(materiaId) {
  try {
    const dificuldades = await getDificuldades(materiaId, { resolvido: false });

    if (dificuldades.length === 0) {
      return {
        total: 0,
        porTipo: {},
        porTopico: {},
        topicosProblematicos: [],
        nivelGeral: 0
      };
    }

    // Agrupar por tipo de origem
    const porTipo = agruparPor(dificuldades, 'tipo_origem');

    // Agrupar por tópico e calcular métricas
    const porTopico = {};
    dificuldades.forEach(d => {
      if (!porTopico[d.topico]) {
        porTopico[d.topico] = {
          total: 0,
          nivelMedio: 0,
          frequenciaTotal: 0,
          origens: []
        };
      }

      porTopico[d.topico].total++;
      porTopico[d.topico].nivelMedio += d.nivel_dificuldade;
      porTopico[d.topico].frequenciaTotal += d.frequencia;
      porTopico[d.topico].origens.push(d.tipo_origem);
    });

    // Calcular nível médio por tópico
    Object.keys(porTopico).forEach(topico => {
      porTopico[topico].nivelMedio =
        porTopico[topico].nivelMedio / porTopico[topico].total;
    });

    // Identificar tópicos mais problemáticos
    const topicosProblematicos = Object.entries(porTopico)
      .map(([topico, stats]) => ({
        topico,
        ...stats,
        score: stats.nivelMedio * stats.frequenciaTotal // Score de prioridade
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Top 5

    // Calcular nível geral de dificuldade (0-100)
    const nivelGeral = Math.min(
      100,
      (dificuldades.reduce((sum, d) => sum + d.nivel_dificuldade, 0) / dificuldades.length) * 20
    );

    return {
      total: dificuldades.length,
      porTipo,
      porTopico,
      topicosProblematicos,
      nivelGeral: Math.round(nivelGeral)
    };
  } catch (error) {
    console.error('❌ Erro ao analisar dificuldades:', error);
    throw error;
  }
}

/**
 * Identifica lacunas de conhecimento baseado nas dificuldades
 */
async function identificarLacunas(materiaId) {
  try {
    const analise = await analisarDificuldades(materiaId);

    if (analise.total === 0) {
      return {
        temLacunas: false,
        lacunas: [],
        recomendacoes: []
      };
    }

    const lacunas = analise.topicosProblematicos.map(t => ({
      topico: t.topico,
      severidade: calcularSeveridade(t.nivelMedio, t.frequenciaTotal),
      descricao: gerarDescricaoLacuna(t),
      acoes: gerarAcoesRecomendadas(t)
    }));

    const recomendacoes = gerarRecomendacoesEstudo(lacunas);

    return {
      temLacunas: lacunas.length > 0,
      lacunas,
      recomendacoes
    };
  } catch (error) {
    console.error('❌ Erro ao identificar lacunas:', error);
    throw error;
  }
}

/**
 * Verifica se deve gerar resumo personalizado
 */
async function deveGerarResumoPersonalizado(materiaId) {
  try {
    const dificuldades = await getDificuldades(materiaId, { resolvido: false });

    // Critérios para gerar resumo personalizado:
    // 1. Pelo menos 3 dificuldades registradas
    // 2. OU pelo menos 1 dificuldade nível 3+
    // 3. OU pelo menos 2 tópicos diferentes com dificuldade

    if (dificuldades.length >= 3) return true;

    const dificuldadesAltas = dificuldades.filter(d => d.nivel_dificuldade >= 3);
    if (dificuldadesAltas.length >= 1) return true;

    const topicosUnicos = new Set(dificuldades.map(d => d.topico));
    if (topicosUnicos.size >= 2) return true;

    return false;
  } catch (error) {
    console.error('❌ Erro ao verificar necessidade de resumo:', error);
    return false;
  }
}

/**
 * Prepara dados para enviar à IA gerar resumo personalizado
 */
async function prepararDadosResumoPersonalizado(materiaId) {
  try {
    const dificuldades = await getDificuldades(materiaId, { resolvido: false });

    if (dificuldades.length === 0) {
      throw new Error('Nenhuma dificuldade encontrada');
    }

    // Agrupar por tópico
    const porTopico = {};
    dificuldades.forEach(d => {
      if (!porTopico[d.topico]) {
        porTopico[d.topico] = {
          topico: d.topico,
          subtopicos: [],
          perguntas: [],
          textosOriginais: [],
          nivelDificuldade: 0,
          frequencia: 0
        };
      }

      if (d.subtopico) porTopico[d.topico].subtopicos.push(d.subtopico);
      if (d.pergunta_relacionada) porTopico[d.topico].perguntas.push(d.pergunta_relacionada);
      if (d.texto_original) porTopico[d.topico].textosOriginais.push(d.texto_original);

      porTopico[d.topico].nivelDificuldade = Math.max(
        porTopico[d.topico].nivelDificuldade,
        d.nivel_dificuldade
      );
      porTopico[d.topico].frequencia += d.frequencia;
    });

    // Ordenar por prioridade (nível * frequência)
    const topicosOrdenados = Object.values(porTopico)
      .map(t => ({
        ...t,
        prioridade: t.nivelDificuldade * t.frequencia
      }))
      .sort((a, b) => b.prioridade - a.prioridade);

    return {
      totalDificuldades: dificuldades.length,
      topicos: topicosOrdenados,
      metadados: {
        geradoEm: new Date().toISOString(),
        materiaId
      }
    };
  } catch (error) {
    console.error('❌ Erro ao preparar dados para resumo:', error);
    throw error;
  }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function extrairTopicoTexto(texto) {
  // Extrai tópico provável do texto da pergunta/resumo
  // Busca por palavras-chave médicas/farmacológicas

  const palavrasChave = [
    'agonista', 'antagonista', 'inibidor', 'bloqueador',
    'receptor', 'enzima', 'farmaco', 'medicamento',
    'mecanismo', 'ação', 'efeito', 'reação'
  ];

  const palavras = texto.toLowerCase().split(' ');

  // Buscar primeira palavra-chave + palavra anterior/posterior
  for (let i = 0; i < palavras.length; i++) {
    if (palavrasChave.some(pk => palavras[i].includes(pk))) {
      const inicio = Math.max(0, i - 1);
      const fim = Math.min(palavras.length, i + 2);
      return palavras.slice(inicio, fim).join(' ');
    }
  }

  // Se não encontrar, retornar primeiras 3-4 palavras significativas
  const palavrasSignificativas = palavras.filter(p => p.length > 3);
  return palavrasSignificativas.slice(0, 3).join(' ') || 'Tópico desconhecido';
}

function agruparPor(array, chave) {
  return array.reduce((acc, item) => {
    const valor = item[chave];
    if (!acc[valor]) {
      acc[valor] = [];
    }
    acc[valor].push(item);
    return acc;
  }, {});
}

function calcularSeveridade(nivelMedio, frequencia) {
  const score = (nivelMedio * 0.6) + (Math.min(frequencia, 10) * 0.4);

  if (score >= 4) return 'crítica';
  if (score >= 3) return 'alta';
  if (score >= 2) return 'média';
  return 'baixa';
}

function gerarDescricaoLacuna(topico) {
  const nivel = topico.nivelMedio;
  const freq = topico.frequenciaTotal;

  if (nivel >= 4 && freq >= 5) {
    return `Dificuldade crítica: você marcou "não sei" ${freq} vezes neste tópico.`;
  } else if (nivel >= 3) {
    return `Dificuldade significativa: revisar este conceito é prioritário.`;
  } else {
    return `Dificuldade moderada: revisar este tópico pode ajudar.`;
  }
}

function gerarAcoesRecomendadas(topico) {
  const acoes = [];

  if (topico.origens.includes('quiz')) {
    acoes.push({
      tipo: 'quiz',
      texto: 'Refazer quiz focado neste tópico',
      icone: '❓'
    });
  }

  if (topico.origens.includes('flashcard')) {
    acoes.push({
      tipo: 'flashcard',
      texto: 'Revisar flashcards deste tópico',
      icone: '🎴'
    });
  }

  acoes.push({
    tipo: 'resumo',
    texto: 'Estudar resumo personalizado',
    icone: '📝'
  });

  return acoes;
}

function gerarRecomendacoesEstudo(lacunas) {
  const recomendacoes = [];

  // Resumo personalizado sempre
  recomendacoes.push({
    titulo: 'Estudar Resumo Personalizado',
    descricao: 'Focado nos seus pontos fracos',
    prioridade: 1,
    icone: '📝'
  });

  // Se tem muitas lacunas de quiz
  const lacunasQuiz = lacunas.filter(l =>
    l.acoes.some(a => a.tipo === 'quiz')
  );

  if (lacunasQuiz.length >= 2) {
    recomendacoes.push({
      titulo: 'Refazer Quiz com Foco',
      descricao: `Apenas perguntas de: ${lacunasQuiz.map(l => l.topico).join(', ')}`,
      prioridade: 2,
      icone: '❓'
    });
  }

  // Se tem lacunas de flashcard
  const lacunasFlashcard = lacunas.filter(l =>
    l.acoes.some(a => a.tipo === 'flashcard')
  );

  if (lacunasFlashcard.length >= 1) {
    recomendacoes.push({
      titulo: 'Praticar Flashcards',
      descricao: `Revisar cards de: ${lacunasFlashcard.map(l => l.topico).join(', ')}`,
      prioridade: 3,
      icone: '🎴'
    });
  }

  return recomendacoes;
}

// ============================================
// EXPORTAR FUNÇÕES
// ============================================

if (typeof window !== 'undefined') {
  window.DificuldadesService = {
    registrarDificuldadeQuiz,
    registrarDificuldadeFlashcard,
    registrarDificuldadeResumo,
    analisarDificuldades,
    identificarLacunas,
    deveGerarResumoPersonalizado,
    prepararDadosResumoPersonalizado
  };
}
