// ============================================
// FLASHCARDS CONTROLLER (FASE 3)
// ============================================
// Controlador de sessão de flashcards com integração de tracking de dificuldades

// Estado da sessão
const flashcardState = {
  materiaId: null,
  materiaNome: '',
  flashcards: [],
  currentIndex: 0,
  isFlipped: false,
  respostas: {
    lembrei: 0,
    quase: 0,
    naoSei: 0,
    puladas: 0
  },
  dificuldadesRegistradas: [],
  startTime: null,
  endTime: null
};

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Verificar autenticação
    const user = await getCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    // Obter parâmetros da URL
    const urlParams = new URLSearchParams(window.location.search);
    flashcardState.materiaId = urlParams.get('materia');
    const modo = urlParams.get('modo'); // 'dificuldades' para flashcards focados

    if (!flashcardState.materiaId) {
      showToast('Matéria não especificada', 'error');
      setTimeout(() => window.location.href = 'dashboard.html', 2000);
      return;
    }

    // Carregar dados
    await initFlashcards(modo);

  } catch (error) {
    console.error('Erro ao inicializar flashcards:', error);
    showToast('Erro ao carregar flashcards', 'error');
    hideLoadingOverlay();
  }
});

/**
 * Inicializa sessão de flashcards
 */
async function initFlashcards(modo = null) {
  try {
    // Buscar matéria
    const materia = await getMateria(flashcardState.materiaId);
    flashcardState.materiaNome = materia.nome;
    document.getElementById('materia-nome').textContent = `Flashcards - ${materia.nome}`;

    // Buscar perguntas
    let perguntas;
    if (modo === 'dificuldades') {
      // Modo focado: apenas tópicos com dificuldade
      perguntas = await getFlashcardsDificuldades(flashcardState.materiaId);
      if (perguntas.length === 0) {
        showToast('Você não tem dificuldades registradas! 🎉', 'success');
        setTimeout(() => window.location.href = `materia.html?id=${flashcardState.materiaId}`, 2000);
        return;
      }
    } else {
      // Modo normal: todas as perguntas da matéria
      const allPerguntas = await getPerguntasByMateria(flashcardState.materiaId);

      if (allPerguntas.length === 0) {
        showToast('Nenhum flashcard disponível ainda', 'warning');
        setTimeout(() => window.location.href = `materia.html?id=${flashcardState.materiaId}`, 2000);
        return;
      }

      // Selecionar 10 perguntas aleatórias (ou menos se não houver 10)
      perguntas = shuffleArray(allPerguntas).slice(0, Math.min(10, allPerguntas.length));
    }

    flashcardState.flashcards = perguntas;
    flashcardState.startTime = new Date();

    // Iniciar sessão
    hideLoadingOverlay();
    renderFlashcard();
    updateStats();

  } catch (error) {
    console.error('Erro ao inicializar flashcards:', error);
    showToast('Erro ao carregar flashcards', 'error');
    hideLoadingOverlay();
  }
}

/**
 * Buscar flashcards de tópicos com dificuldade
 */
async function getFlashcardsDificuldades(materiaId) {
  const user = await getCurrentUser();

  // Buscar dificuldades não resolvidas
  const dificuldades = await getDificuldades(materiaId, { resolvido: false });

  if (dificuldades.length === 0) {
    return [];
  }

  // Extrair tópicos únicos
  const topicos = [...new Set(dificuldades.map(d => d.topico))];

  // Buscar perguntas desses tópicos
  const { data: perguntas, error } = await supabase
    .from('perguntas')
    .select('*')
    .eq('materia_id', materiaId)
    .in('topico', topicos);

  if (error) throw error;

  // Se não houver perguntas com topico exato, buscar por texto
  if (!perguntas || perguntas.length === 0) {
    const allPerguntas = await getPerguntasByMateria(materiaId);
    return allPerguntas.filter(p => {
      const perguntaTexto = p.pergunta.toLowerCase();
      return topicos.some(topico => perguntaTexto.includes(topico.toLowerCase()));
    });
  }

  return perguntas;
}

// ============================================
// RENDERIZAÇÃO
// ============================================

/**
 * Renderiza flashcard atual
 */
function renderFlashcard() {
  const flashcard = flashcardState.flashcards[flashcardState.currentIndex];

  if (!flashcard) {
    finishSession();
    return;
  }

  // Reset flip state
  flashcardState.isFlipped = false;
  document.getElementById('flashcard-card').classList.remove('flipped');
  document.getElementById('response-buttons').style.display = 'none';

  // Atualizar contador
  const total = flashcardState.flashcards.length;
  const current = flashcardState.currentIndex + 1;
  document.getElementById('card-counter').textContent = `Flashcard ${current} de ${total}`;

  // Atualizar progresso
  const percentage = ((current - 1) / total) * 100;
  document.getElementById('progress-fill').style.width = `${percentage}%`;
  document.getElementById('progress-percent').textContent = `${Math.round(percentage)}%`;

  // Atualizar badges
  document.getElementById('card-type').textContent = flashcard.tipo || 'Conceito';

  const difficultyBadge = document.getElementById('card-difficulty');
  difficultyBadge.textContent = flashcard.dificuldade || 'Médio';
  difficultyBadge.className = 'badge-flashcard badge-dificuldade';
  if (flashcard.dificuldade === 'Fácil') {
    difficultyBadge.classList.add('facil');
  } else if (flashcard.dificuldade === 'Difícil') {
    difficultyBadge.classList.add('dificil');
  }

  // Atualizar bookmark
  const isBookmarked = localStorage.getItem(`bookmark_${flashcard.id}`) === 'true';
  document.getElementById('bookmark-icon').textContent = isBookmarked ? '★' : '☆';

  // Atualizar conteúdo - FRONT (Question)
  document.getElementById('card-question').textContent = flashcard.pergunta;

  // Atualizar conteúdo - BACK (Answer)
  const respostaCorreta = flashcard.opcoes?.find(o => o.correta);
  document.getElementById('card-answer').textContent = respostaCorreta?.texto || flashcard.resposta_correta || 'Resposta não disponível';

  // Explicação (se houver)
  if (flashcard.explicacao) {
    document.getElementById('card-explanation').style.display = 'block';
    document.getElementById('explanation-text').textContent = flashcard.explicacao;
  } else {
    document.getElementById('card-explanation').style.display = 'none';
  }
}

/**
 * Atualiza estatísticas
 */
function updateStats() {
  document.getElementById('lembrei-count').textContent = flashcardState.respostas.lembrei;
  document.getElementById('quase-count').textContent = flashcardState.respostas.quase;
  document.getElementById('nao-sei-count').textContent = flashcardState.respostas.naoSei;
  document.getElementById('skip-count').textContent = flashcardState.respostas.puladas;
}

// ============================================
// INTERAÇÕES DO USUÁRIO
// ============================================

/**
 * Vira o card (flip)
 */
function flipCard() {
  const card = document.getElementById('flashcard-card');
  card.classList.toggle('flipped');
  flashcardState.isFlipped = !flashcardState.isFlipped;

  // Mostrar botões de resposta após virar para o verso
  if (flashcardState.isFlipped) {
    document.getElementById('response-buttons').style.display = 'grid';
  } else {
    document.getElementById('response-buttons').style.display = 'none';
  }
}

/**
 * Manipula resposta do usuário
 */
async function handleResponse(tipo) {
  const flashcard = flashcardState.flashcards[flashcardState.currentIndex];

  // Atualizar estatísticas
  if (tipo === 'lembrei') {
    flashcardState.respostas.lembrei++;
    showToast('Ótimo! Continue assim! ✅', 'success');
  } else if (tipo === 'quase') {
    flashcardState.respostas.quase++;
    showToast('Quase lá! Continue estudando 🟡', 'warning');
  } else if (tipo === 'nao_sei') {
    flashcardState.respostas.naoSei++;

    // REGISTRAR DIFICULDADE (核心功能 - CORE FEATURE)
    await registrarDificuldadeFlashcard(flashcard);

    showToast('Dificuldade registrada! Vamos ajudá-lo a aprender 📚', 'warning');
  }

  updateStats();

  // Salvar progresso no banco
  await saveProgressoFlashcard(flashcard.id, tipo);

  // Próximo card
  setTimeout(() => {
    nextCard();
  }, 500);
}

/**
 * Registra dificuldade do flashcard (FASE 3)
 */
async function registrarDificuldadeFlashcard(flashcard) {
  try {
    const dificuldade = await DificuldadesService.registrarDificuldadeFlashcard(
      flashcard,
      flashcardState.materiaId
    );

    flashcardState.dificuldadesRegistradas.push(dificuldade);

    console.log('Dificuldade registrada:', dificuldade);

  } catch (error) {
    console.error('Erro ao registrar dificuldade:', error);
  }
}

/**
 * Salva progresso da resposta
 */
async function saveProgressoFlashcard(perguntaId, tipo) {
  try {
    const user = await getCurrentUser();

    // Mapear tipo para resposta_tipo
    let respostaTipo;
    if (tipo === 'lembrei') respostaTipo = 'correta';
    else if (tipo === 'quase') respostaTipo = 'incorreta'; // Quase = parcialmente incorreta
    else if (tipo === 'nao_sei') respostaTipo = 'nao_sei';
    else respostaTipo = 'pulada';

    const { error } = await supabase
      .from('progresso_usuario')
      .insert([{
        user_id: user.id,
        pergunta_id: perguntaId,
        resposta_tipo: respostaTipo,
        tempo_resposta: null // Pode adicionar tracking de tempo no futuro
      }]);

    if (error) throw error;

  } catch (error) {
    console.error('Erro ao salvar progresso:', error);
  }
}

/**
 * Pula card atual
 */
function skipCard() {
  flashcardState.respostas.puladas++;
  updateStats();

  const flashcard = flashcardState.flashcards[flashcardState.currentIndex];
  saveProgressoFlashcard(flashcard.id, 'pulada');

  showToast('Card pulado ⏭️', 'info');
  nextCard();
}

/**
 * Avança para próximo card
 */
function nextCard() {
  flashcardState.currentIndex++;

  if (flashcardState.currentIndex >= flashcardState.flashcards.length) {
    finishSession();
  } else {
    renderFlashcard();
  }
}

/**
 * Toggle bookmark
 */
function toggleBookmark() {
  const flashcard = flashcardState.flashcards[flashcardState.currentIndex];
  const key = `bookmark_${flashcard.id}`;
  const isBookmarked = localStorage.getItem(key) === 'true';

  localStorage.setItem(key, !isBookmarked);
  document.getElementById('bookmark-icon').textContent = !isBookmarked ? '★' : '☆';

  showToast(
    !isBookmarked ? 'Card marcado como favorito ★' : 'Card desmarcado ☆',
    'info'
  );
}

// ============================================
// FINALIZAÇÃO
// ============================================

/**
 * Finaliza sessão e mostra resultado
 */
async function finishSession() {
  flashcardState.endTime = new Date();

  // Atualizar progresso final
  const total = flashcardState.flashcards.length;
  document.getElementById('progress-fill').style.width = '100%';
  document.getElementById('progress-percent').textContent = '100%';

  // Analisar dificuldades registradas
  await analisarDificuldadesSessao();

  // Mostrar modal de resultado
  showResultModal();
}

/**
 * Finalizar antecipadamente
 */
function finishFlashcardsEarly() {
  if (!confirm('Deseja finalizar a sessão de flashcards agora?')) {
    return;
  }

  finishSession();
}

/**
 * Analisa dificuldades da sessão
 */
async function analisarDificuldadesSessao() {
  if (flashcardState.dificuldadesRegistradas.length === 0) {
    return;
  }

  try {
    // Buscar análise completa
    const analise = await DificuldadesService.analisarDificuldades(flashcardState.materiaId);

    // Verificar se deve gerar resumo personalizado
    const deveGerar = await DificuldadesService.deveGerarResumoPersonalizado(flashcardState.materiaId);

    // Renderizar análise no modal
    renderDificuldadesAnalise(analise, deveGerar);

  } catch (error) {
    console.error('Erro ao analisar dificuldades:', error);
  }
}

/**
 * Renderiza análise de dificuldades no modal
 */
function renderDificuldadesAnalise(analise, deveGerar) {
  const container = document.getElementById('dificuldades-analise');
  const topicosContainer = document.getElementById('dificuldades-topicos');

  if (!analise || analise.topicosProblematicos.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';

  // Renderizar tópicos
  topicosContainer.innerHTML = analise.topicosProblematicos
    .slice(0, 5) // Top 5 tópicos
    .map(topico => `
      <div class="topico-dificuldade-item">
        <span class="topico-icone">${getTopicoIcone(topico.nivelMedio)}</span>
        <div class="topico-info">
          <div class="topico-nome">${topico.topico}</div>
          <div class="topico-meta">
            ${topico.total} ocorrência${topico.total > 1 ? 's' : ''} •
            Nível ${topico.nivelMedio.toFixed(1)}/5
          </div>
        </div>
      </div>
    `)
    .join('');

  // Mostrar/ocultar CTA de resumo personalizado
  const cta = container.querySelector('.resumo-personalizado-cta');
  if (deveGerar) {
    cta.style.display = 'block';
  } else {
    cta.style.display = 'none';
  }
}

function getTopicoIcone(nivel) {
  if (nivel >= 4) return '🔴';
  if (nivel >= 3) return '🟡';
  return '🟢';
}

/**
 * Mostra modal de resultado
 */
function showResultModal() {
  const total = flashcardState.flashcards.length;
  const respondidas = total - flashcardState.respostas.puladas;

  // Calcular percentual de retenção
  // Lembrei = 100%, Quase = 50%, Não Sei = 0%
  const pontos = (flashcardState.respostas.lembrei * 1.0) + (flashcardState.respostas.quase * 0.5);
  const percentage = respondidas > 0 ? Math.round((pontos / respondidas) * 100) : 0;

  // Atualizar valores
  document.getElementById('final-percentage').textContent = `${percentage}%`;
  document.getElementById('final-lembrei').textContent = flashcardState.respostas.lembrei;
  document.getElementById('final-quase').textContent = flashcardState.respostas.quase;
  document.getElementById('final-naosei').textContent = flashcardState.respostas.naoSei;
  document.getElementById('final-skip').textContent = flashcardState.respostas.puladas;

  // Mostrar modal
  document.getElementById('result-modal').style.display = 'flex';
}

/**
 * Fecha modal de resultado
 */
function closeResultModal() {
  document.getElementById('result-modal').style.display = 'none';
}

// ============================================
// AÇÕES PÓS-SESSÃO
// ============================================

/**
 * Volta para página da matéria
 */
function voltarMateria() {
  window.location.href = `materia.html?id=${flashcardState.materiaId}`;
}

/**
 * Refaz sessão de flashcards
 */
function refazerFlashcards() {
  window.location.reload();
}

/**
 * Vai para página de dificuldades
 */
function estudarDificuldades() {
  window.location.href = `dificuldades.html?materia=${flashcardState.materiaId}`;
}

/**
 * Ver resumo personalizado (FASE 4/5)
 */
function verResumoPersonalizado() {
  showToast('Funcionalidade em desenvolvimento (Fase 4-5)', 'warning');
  // TODO: Implementar na Fase 4/5
  // window.location.href = `resumo-personalizado.html?materia=${flashcardState.materiaId}`;
}

// ============================================
// UTILITÁRIOS
// ============================================

/**
 * Embaralha array
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Mostra toast
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-text">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

/**
 * Esconde overlay de loading
 */
function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-state');
  if (overlay) {
    overlay.style.display = 'none';
  }
}
