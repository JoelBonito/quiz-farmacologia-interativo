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
    // Validação de dados
    if (!pergunta || !pergunta.id) {
      throw new Error('Pergunta inválida');
    }
    if (!materiaId) {
      throw new Error('ID da matéria é obrigatório');
    }
    if (!pergunta.pergunta || pergunta.pergunta.trim().length === 0) {
      throw new Error('Texto da pergunta está vazio');
    }

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

    // Validar tópico extraído
    if (!dificuldadeData.topico || dificuldadeData.topico.trim().length === 0) {
      dificuldadeData.topico = 'Tópico não identificado';
    }

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
    // Validação de dados
    if (!flashcard || !flashcard.id) {
      throw new Error('Flashcard inválido');
    }
    if (!materiaId) {
      throw new Error('ID da matéria é obrigatório');
    }

    // Suporta tanto objetos flashcard quanto perguntas usadas como flashcards
    const textoFrente = flashcard.frente || flashcard.pergunta;

    if (!textoFrente || textoFrente.trim().length === 0) {
      throw new Error('Texto do flashcard está vazio');
    }

    const topico = flashcard.topico || extrairTopicoTexto(textoFrente);

    const dificuldadeData = {
      materia_id: materiaId,
      tipo_origem: 'flashcard',
      topico: topico || 'Tópico não identificado',
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
    // Validação de dados
    if (!resumoId) {
      throw new Error('ID do resumo é obrigatório');
    }
    if (!materiaId) {
      throw new Error('ID da matéria é obrigatório');
    }
    if (!selecao || !selecao.texto || selecao.texto.trim().length === 0) {
      throw new Error('Texto selecionado está vazio');
    }
    if (selecao.texto.length < 10) {
      throw new Error('Texto selecionado muito curto (mínimo 10 caracteres)');
    }

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
      topico: topico || 'Tópico não identificado',
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
  // Usa palavras-chave farmacológicas expandidas e heurísticas melhoradas

  if (!texto || texto.trim().length === 0) {
    return 'Tópico não identificado';
  }

  // Palavras-chave categorizadas por contexto farmacológico
  const palavrasChave = {
    // Mecanismo de ação
    mecanismo: ['agonista', 'antagonista', 'inibidor', 'bloqueador', 'estimulante', 'depressor'],
    // Alvos farmacológicos
    alvos: ['receptor', 'enzima', 'canal', 'transportador', 'proteína'],
    // Classes e conceitos
    conceitos: ['fármaco', 'medicamento', 'droga', 'substância', 'princípio ativo'],
    // Ações e efeitos
    acoes: ['mecanismo', 'ação', 'efeito', 'reação', 'resposta', 'metabolismo'],
    // Classes terapêuticas
    classes: ['analgésico', 'antibiótico', 'anti-inflamatório', 'antihipertensivo', 'antidepressivo'],
    // Sistemas
    sistemas: ['cardiovascular', 'respiratório', 'nervoso', 'digestivo', 'renal']
  };

  // Flatten todas as palavras-chave
  const todasPalavrasChave = Object.values(palavrasChave).flat();

  const textoLower = texto.toLowerCase();
  const palavras = textoLower.split(/\s+/);

  // Filtrar stopwords comuns
  const stopwords = ['o', 'a', 'de', 'da', 'do', 'em', 'na', 'no', 'para', 'qual', 'que', 'é', 'são'];
  const palavrasFiltradas = palavras.filter(p => !stopwords.includes(p) && p.length > 2);

  // Estratégia 1: Buscar expressões com palavras-chave (contexto ampliado)
  for (let i = 0; i < palavras.length; i++) {
    const palavraAtual = palavras[i];

    for (const pk of todasPalavrasChave) {
      if (palavraAtual.includes(pk)) {
        // Capturar contexto: 1 palavra antes e 2 depois
        const inicio = Math.max(0, i - 1);
        const fim = Math.min(palavras.length, i + 3);
        const contexto = palavras.slice(inicio, fim);

        // Filtrar stopwords do contexto
        const contextoLimpo = contexto.filter(p => !stopwords.includes(p));
        return contextoLimpo.slice(0, 4).join(' ');
      }
    }
  }

  // Estratégia 2: Buscar nomes de medicamentos (geralmente com maiúscula no original)
  const palavrasOriginais = texto.split(/\s+/);
  const possivelMedicamento = palavrasOriginais.find(p =>
    /^[A-Z][a-z]+/.test(p) && p.length > 4 && !stopwords.includes(p.toLowerCase())
  );

  if (possivelMedicamento) {
    const index = palavrasOriginais.indexOf(possivelMedicamento);
    const inicio = Math.max(0, index - 1);
    const fim = Math.min(palavrasOriginais.length, index + 2);
    return palavrasOriginais.slice(inicio, fim).join(' ').toLowerCase();
  }

  // Estratégia 3: Primeiras palavras significativas (fallback)
  const topico = palavrasFiltradas.slice(0, 3).join(' ');
  return topico.length > 0 ? topico : 'Tópico não identificado';
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
