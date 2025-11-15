// ============================================
// QUIZ CONTROLLER - FASE 2
// ============================================
// Gerencia o quiz com botão "NÃO SEI" e tracking de dificuldades

// Estado do quiz
let quizState = {
  materiaId: null,
  perguntas: [],
  currentIndex: 0,
  respostas: {
    corretas: 0,
    incorretas: 0,
    naoSei: 0,
    puladas: 0
  },
  dificuldadesRegistradas: [],
  iniciado: false,
  finalizado: false
};

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
  await init();
});

async function init() {
  try {
    // Verificar autenticação
    const user = await getCurrentUser();
    if (!user) {
      window.location.href = 'auth.html';
      return;
    }

    // Obter materia_id da URL
    const urlParams = new URLSearchParams(window.location.search);
    quizState.materiaId = urlParams.get('materia');

    if (!quizState.materiaId) {
      showToast('Matéria não especificada', 'error');
      setTimeout(() => window.location.href = 'dashboard.html', 2000);
      return;
    }

    // Carregar perguntas
    await loadPerguntas();

  } catch (error) {
    console.error('Erro ao inicializar quiz:', error);
    showToast('Erro ao carregar quiz', 'error');
  }
}

// ============================================
// CARREGAR PERGUNTAS
// ============================================

async function loadPerguntas() {
  try {
    showLoading(true);

    // Buscar perguntas da matéria
    const perguntas = await getPerguntas(quizState.materiaId);

    if (!perguntas || perguntas.length === 0) {
      showLoading(false);
      showToast('Nenhuma pergunta encontrada para esta matéria', 'error');
      setTimeout(() => window.history.back(), 2000);
      return;
    }

    // Embaralhar perguntas
    quizState.perguntas = shuffleArray(perguntas);

    // Atualizar UI
    const materia = await getMateria(quizState.materiaId);
    document.getElementById('materia-nome').textContent = `Quiz - ${materia.nome}`;

    showLoading(false);
    quizState.iniciado = true;

    // Mostrar primeira pergunta
    showQuestion();

  } catch (error) {
    console.error('Erro ao carregar perguntas:', error);
    showLoading(false);
    showToast('Erro ao carregar perguntas', 'error');
  }
}

// ============================================
// MOSTRAR PERGUNTA
// ============================================

function showQuestion() {
  const pergunta = quizState.perguntas[quizState.currentIndex];

  // Atualizar contador
  document.getElementById('question-counter').textContent =
    `Pergunta ${quizState.currentIndex + 1} de ${quizState.perguntas.length}`;

  // Atualizar porcentagem
  const percent = Math.round((quizState.currentIndex / quizState.perguntas.length) * 100);
  document.getElementById('progress-percent').textContent = `${percent}%`;
  document.getElementById('progress-fill').style.width = `${percent}%`;

  // Atualizar tipo e dificuldade
  document.getElementById('question-type').textContent = formatarTipo(pergunta.tipo);
  const difficultyBadge = document.getElementById('question-difficulty');
  difficultyBadge.textContent = pergunta.dificuldade;
  difficultyBadge.className = `badge-quiz badge-dificuldade ${pergunta.dificuldade.toLowerCase()}`;

  // Atualizar texto da pergunta
  document.getElementById('question-text').textContent = pergunta.pergunta;

  // Renderizar opções
  renderOptions(pergunta);

  // Resetar UI
  resetQuestionUI();
}

function renderOptions(pergunta) {
  const container = document.getElementById('options-container');
  container.innerHTML = '';

  const opcoes = typeof pergunta.opcoes === 'string' ?
    JSON.parse(pergunta.opcoes) : pergunta.opcoes;

  opcoes.forEach((opcao, index) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opcao;
    btn.onclick = () => selectOption(index, opcao);
    container.appendChild(btn);
  });
}

function resetQuestionUI() {
  // Esconder feedback
  document.getElementById('feedback-section').style.display = 'none';
  document.getElementById('hint-section').style.display = 'none';

  // Mostrar botão "NÃO SEI"
  document.getElementById('nao-sei-container').style.display = 'block';

  // Esconder botão "Próxima"
  document.getElementById('next-btn').style.display = 'none';

  // Mostrar botão "Ver Dica"
  document.getElementById('hint-btn').style.display = 'inline-flex';
}

// ============================================
// SELECIONAR OPÇÃO
// ============================================

function selectOption(index, opcao) {
  const pergunta = quizState.perguntas[quizState.currentIndex];

  // Marcar opção selecionada
  const buttons = document.querySelectorAll('.option-btn');
  buttons.forEach((btn, i) => {
    btn.classList.remove('selected');
    if (i === index) {
      btn.classList.add('selected');
    }
  });

  // Desabilitar todas as opções
  buttons.forEach(btn => btn.disabled = true);

  // Verificar resposta
  const correto = opcao === pergunta.resposta_correta;

  // Marcar visual
  buttons[index].classList.add(correto ? 'correct' : 'incorrect');

  // Mostrar resposta correta se errou
  if (!correto) {
    buttons.forEach((btn, i) => {
      if (btn.textContent === pergunta.resposta_correta) {
        btn.classList.add('correct');
      }
    });
  }

  // Atualizar estatísticas
  if (correto) {
    quizState.respostas.corretas++;
    document.getElementById('correct-count').textContent = quizState.respostas.corretas;
  } else {
    quizState.respostas.incorretas++;
    document.getElementById('incorrect-count').textContent = quizState.respostas.incorretas;

    // REGISTRAR DIFICULDADE (errou a pergunta)
    registrarDificuldadePergunta(pergunta, 'incorreta');
  }

  // Mostrar feedback
  showFeedback(correto, pergunta);

  // Esconder botão "NÃO SEI"
  document.getElementById('nao-sei-container').style.display = 'none';

  // Mostrar botão "Próxima"
  document.getElementById('next-btn').style.display = 'inline-flex';
  document.getElementById('hint-btn').style.display = 'none';

  // Salvar progresso
  saveProgressoResposta(pergunta.id, correto, 'correta');
}

// ============================================
// BOTÃO "NÃO SEI" (FASE 2 - PRINCIPAL)
// ============================================

async function handleNaoSei() {
  const pergunta = quizState.perguntas[quizState.currentIndex];

  // Desabilitar botões
  const buttons = document.querySelectorAll('.option-btn');
  buttons.forEach(btn => btn.disabled = true);

  // Marcar resposta correta
  buttons.forEach(btn => {
    if (btn.textContent === pergunta.resposta_correta) {
      btn.classList.add('correct');
    }
  });

  // Atualizar estatísticas
  quizState.respostas.naoSei++;
  document.getElementById('nao-sei-count').textContent = quizState.respostas.naoSei;

  // REGISTRAR DIFICULDADE (marcou "não sei")
  await registrarDificuldadePergunta(pergunta, 'nao_sei');

  // Mostrar feedback especial "NÃO SEI"
  showFeedbackNaoSei(pergunta);

  // Esconder botão "NÃO SEI"
  document.getElementById('nao-sei-container').style.display = 'none';

  // Mostrar botão "Próxima"
  document.getElementById('next-btn').style.display = 'inline-flex';
  document.getElementById('hint-btn').style.display = 'none';

  // Salvar progresso
  saveProgressoResposta(pergunta.id, false, 'nao_sei');

  // Toast informativo
  showToast('Dificuldade registrada! Vamos ajudá-lo a aprender 📚', 'warning');
}

// ============================================
// REGISTRAR DIFICULDADE (INTEGRAÇÃO FASE 1)
// ============================================

async function registrarDificuldadePergunta(pergunta, tipoResposta) {
  try {
    const dificuldade = await DificuldadesService.registrarDificuldadeQuiz(
      pergunta,
      quizState.materiaId
    );

    quizState.dificuldadesRegistradas.push(dificuldade);

    console.log('✅ Dificuldade registrada:', dificuldade);
  } catch (error) {
    console.error('❌ Erro ao registrar dificuldade:', error);
  }
}

// ============================================
// FEEDBACK
// ============================================

function showFeedback(correto, pergunta) {
  const section = document.getElementById('feedback-section');
  const icon = document.getElementById('feedback-icon');
  const title = document.getElementById('feedback-title');
  const text = document.getElementById('feedback-text');

  section.className = 'feedback-section';
  section.classList.add(correto ? 'correct' : 'incorrect');

  icon.textContent = correto ? '✅' : '❌';
  title.textContent = correto ? 'Correto!' : 'Incorreto';

  text.innerHTML = `
    <strong>Resposta correta:</strong> ${pergunta.resposta_correta}<br><br>
    ${pergunta.justificativa || 'Sem justificativa disponível.'}
  `;

  section.style.display = 'block';
}

function showFeedbackNaoSei(pergunta) {
  const section = document.getElementById('feedback-section');
  const icon = document.getElementById('feedback-icon');
  const title = document.getElementById('feedback-title');
  const text = document.getElementById('feedback-text');

  section.className = 'feedback-section nao-sei';

  icon.textContent = '📚';
  title.textContent = 'Vamos aprender juntos!';

  text.innerHTML = `
    <strong>Resposta correta:</strong> ${pergunta.resposta_correta}<br><br>
    <strong>Explicação:</strong><br>
    ${pergunta.justificativa || 'Sem explicação disponível.'}<br><br>
    💡 <strong>Dica:</strong> ${pergunta.dica || 'Revise este tópico no material de estudo.'}
  `;

  section.style.display = 'block';
}

// ============================================
// DICA
// ============================================

function showHint() {
  const pergunta = quizState.perguntas[quizState.currentIndex];

  const section = document.getElementById('hint-section');
  const text = document.getElementById('hint-text');

  text.textContent = pergunta.dica || 'Nenhuma dica disponível para esta pergunta.';
  section.style.display = 'block';
}

// ============================================
// NAVEGAÇÃO
// ============================================

function nextQuestion() {
  if (quizState.currentIndex < quizState.perguntas.length - 1) {
    quizState.currentIndex++;
    showQuestion();
  } else {
    // Última pergunta
    finishQuiz();
  }
}

function skipQuestion() {
  quizState.respostas.puladas++;
  document.getElementById('skip-count').textContent = quizState.respostas.puladas;

  const pergunta = quizState.perguntas[quizState.currentIndex];
  saveProgressoResposta(pergunta.id, false, 'pulada');

  nextQuestion();
}

// ============================================
// FINALIZAR QUIZ
// ============================================

async function finishQuizEarly() {
  if (!confirm('Deseja finalizar o quiz agora?')) {
    return;
  }
  await finishQuiz();
}

async function finishQuiz() {
  quizState.finalizado = true;

  // Calcular resultados
  const total = quizState.respostas.corretas + quizState.respostas.incorretas +
                quizState.respostas.naoSei + quizState.respostas.puladas;

  const percentual = total > 0 ?
    Math.round((quizState.respostas.corretas / total) * 100) : 0;

  // Atualizar modal de resultado
  document.getElementById('final-percentage').textContent = `${percentual}%`;
  document.getElementById('final-correct').textContent = quizState.respostas.corretas;
  document.getElementById('final-incorrect').textContent = quizState.respostas.incorretas;
  document.getElementById('final-naosei').textContent = quizState.respostas.naoSei;
  document.getElementById('final-skip').textContent = quizState.respostas.puladas;

  // Analisar dificuldades e mostrar resumo
  await mostrarAnaliseDificuldades();

  // Mostrar modal
  document.getElementById('result-modal').style.display = 'flex';
}

// ============================================
// ANÁLISE DE DIFICULDADES PÓS-QUIZ (FASE 2)
// ============================================

async function mostrarAnaliseDificuldades() {
  try {
    // Verificar se deve gerar resumo personalizado
    const deveGerar = await DificuldadesService.deveGerarResumoPersonalizado(quizState.materiaId);

    if (!deveGerar) {
      document.getElementById('dificuldades-analise').style.display = 'none';
      return;
    }

    // Analisar dificuldades
    const analise = await DificuldadesService.analisarDificuldades(quizState.materiaId);

    if (analise.total === 0) {
      document.getElementById('dificuldades-analise').style.display = 'none';
      return;
    }

    // Mostrar seção de análise
    document.getElementById('dificuldades-analise').style.display = 'block';

    // Renderizar tópicos com dificuldade
    const topicosHTML = analise.topicosProblematicos.slice(0, 3).map(t => `
      <div class="topico-dificuldade-item">
        <span class="topico-icone">${getTopicoIcone(t.nivelMedio)}</span>
        <div class="topico-info">
          <div class="topico-nome">${t.topico}</div>
          <div class="topico-meta">${t.total} dificuldade${t.total > 1 ? 's' : ''}</div>
        </div>
      </div>
    `).join('');

    document.getElementById('dificuldades-topicos').innerHTML = topicosHTML ||
      '<p>Nenhuma dificuldade específica identificada.</p>';

  } catch (error) {
    console.error('Erro ao analisar dificuldades:', error);
  }
}

function getTopicoIcone(nivel) {
  if (nivel >= 4) return '🔴';
  if (nivel >= 3) return '🟡';
  return '🟢';
}

// ============================================
// AÇÕES DO RESULTADO
// ============================================

function closeResultModal() {
  document.getElementById('result-modal').style.display = 'none';
}

function voltarMateria() {
  window.location.href = `materia.html?id=${quizState.materiaId}`;
}

function refazerQuiz() {
  window.location.reload();
}

function estudarDificuldades() {
  window.location.href = `materia.html?id=${quizState.materiaId}#dificuldades`;
}

async function verResumoPersonalizado() {
  // Gerar resumo personalizado (será implementado na Fase 4)
  showToast('Funcionalidade em desenvolvimento (Fase 4)', 'warning');
}

// ============================================
// SALVAR PROGRESSO
// ============================================

async function saveProgressoResposta(perguntaId, acertou, tipoResposta) {
  try {
    await supabase.from('progresso_usuario').insert([{
      pergunta_id: perguntaId,
      acertou,
      resposta_tipo: tipoResposta,
      user_id: (await getCurrentUser()).id
    }]);
  } catch (error) {
    console.error('Erro ao salvar progresso:', error);
  }
}

// ============================================
// UTILITÁRIOS
// ============================================

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function formatarTipo(tipo) {
  const tipos = {
    multipla_escolha: 'Múltipla Escolha',
    verdadeiro_falso: 'Verdadeiro/Falso',
    caso_clinico: 'Caso Clínico'
  };
  return tipos[tipo] || tipo;
}

function showLoading(show) {
  document.getElementById('loading-state').style.display = show ? 'flex' : 'none';
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ';

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-text">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => toast.remove(), 4000);
}

function toggleBookmark() {
  const icon = document.getElementById('bookmark-icon');
  icon.textContent = icon.textContent === '☆' ? '★' : '☆';
}
