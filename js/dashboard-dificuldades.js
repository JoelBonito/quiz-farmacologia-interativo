// ============================================
// DASHBOARD DE DIFICULDADES - COMPONENTE
// ============================================
// Componente reutilizável para mostrar dificuldades do aluno

class DashboardDificuldades {
  constructor(containerId, materiaId) {
    this.container = document.getElementById(containerId);
    this.materiaId = materiaId;
    this.dificuldades = [];
    this.analise = null;
  }

  /**
   * Inicializa e carrega dashboard
   */
  async init() {
    try {
      await this.carregarDados();
      this.renderizar();
    } catch (error) {
      console.error('Erro ao inicializar dashboard de dificuldades:', error);
      this.renderizarErro();
    }
  }

  /**
   * Carrega dados do backend
   */
  async carregarDados() {
    this.dificuldades = await getDificuldades(this.materiaId, { resolvido: false });
    this.analise = await DificuldadesService.analisarDificuldades(this.materiaId);
  }

  /**
   * Renderiza o dashboard completo
   */
  renderizar() {
    if (!this.container) {
      console.error('Container não encontrado');
      return;
    }

    if (this.analise.total === 0) {
      this.renderizarVazio();
      return;
    }

    this.container.innerHTML = `
      <div class="dificuldades-dashboard">
        ${this.renderizarResumo()}
        ${this.renderizarTopicos()}
        ${this.renderizarAcoes()}
      </div>
    `;

    // Adicionar event listeners
    this.adicionarEventListeners();
  }

  /**
   * Resumo geral das dificuldades
   */
  renderizarResumo() {
    const nivelCor = this.getNivelCor(this.analise.nivelGeral);

    return `
      <div class="dificuldades-resumo">
        <h3>📊 Suas Dificuldades</h3>
        <div class="nivel-geral">
          <div class="nivel-barra">
            <div class="nivel-fill" style="width: ${this.analise.nivelGeral}%; background: ${nivelCor}"></div>
          </div>
          <span class="nivel-texto">${this.getNivelTexto(this.analise.nivelGeral)}</span>
        </div>
        <div class="estatisticas-grid">
          <div class="stat-mini">
            <div class="stat-valor">${this.analise.total}</div>
            <div class="stat-label">Dificuldades</div>
          </div>
          <div class="stat-mini">
            <div class="stat-valor">${Object.keys(this.analise.porTopico).length}</div>
            <div class="stat-label">Tópicos</div>
          </div>
          <div class="stat-mini">
            <div class="stat-valor">${this.analise.porTipo.quiz?.length || 0}</div>
            <div class="stat-label">Quiz</div>
          </div>
          <div class="stat-mini">
            <div class="stat-valor">${this.analise.porTipo.flashcard?.length || 0}</div>
            <div class="stat-label">Flashcards</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Lista de tópicos problemáticos
   */
  renderizarTopicos() {
    if (this.analise.topicosProblematicos.length === 0) {
      return '';
    }

    const topicosHTML = this.analise.topicosProblematicos.map(topico => `
      <div class="topico-card" data-topico="${topico.topico}">
        <div class="topico-header">
          <div class="topico-info">
            <span class="topico-icone">${this.getTopicoIcone(topico.nivelMedio)}</span>
            <div>
              <div class="topico-nome">${topico.topico}</div>
              <div class="topico-meta">
                ${topico.total} ocorrência${topico.total > 1 ? 's' : ''} •
                Nível ${topico.nivelMedio.toFixed(1)}/5
              </div>
            </div>
          </div>
          <button class="btn-expandir" onclick="dashboardDificuldades.toggleTopico('${topico.topico}')">
            <span class="icone-expandir">▼</span>
          </button>
        </div>
        <div class="topico-barra">
          <div class="topico-fill" style="width: ${(topico.nivelMedio / 5) * 100}%; background: ${this.getNivelCor((topico.nivelMedio / 5) * 100)}"></div>
        </div>
        <div class="topico-detalhes" style="display: none;">
          <div class="topico-origens">
            ${this.renderizarOrigens(topico.origens)}
          </div>
          <div class="topico-acoes">
            <button class="btn btn-sm btn-primary" onclick="dashboardDificuldades.estudarTopico('${topico.topico}')">
              📝 Estudar
            </button>
            <button class="btn btn-sm btn-outline" onclick="dashboardDificuldades.fazerQuizTopico('${topico.topico}')">
              ❓ Quiz
            </button>
            <button class="btn btn-sm btn-outline" onclick="dashboardDificuldades.marcarResolvido('${topico.topico}')">
              ✓ Marcar Resolvido
            </button>
          </div>
        </div>
      </div>
    `).join('');

    return `
      <div class="dificuldades-topicos">
        <h4>🎯 Tópicos que Precisam de Atenção</h4>
        ${topicosHTML}
      </div>
    `;
  }

  /**
   * Ações recomendadas
   */
  renderizarAcoes() {
    return `
      <div class="dificuldades-acoes">
        <h4>💡 Recomendações de Estudo</h4>
        <div class="acoes-grid">
          <button class="acao-card" onclick="dashboardDificuldades.gerarResumoPersonalizado()">
            <div class="acao-icone">📝</div>
            <div class="acao-titulo">Gerar Resumo Personalizado</div>
            <div class="acao-desc">Focado nos seus pontos fracos</div>
          </button>
          <button class="acao-card" onclick="dashboardDificuldades.quizDificuldades()">
            <div class="acao-icone">❓</div>
            <div class="acao-titulo">Quiz de Revisão</div>
            <div class="acao-desc">Apenas tópicos com dificuldade</div>
          </button>
          <button class="acao-card" onclick="dashboardDificuldades.flashcardsDificuldades()">
            <div class="acao-icone">🎴</div>
            <div class="acao-titulo">Flashcards Focados</div>
            <div class="acao-desc">Revisar conceitos difíceis</div>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza origens das dificuldades
   */
  renderizarOrigens(origens) {
    const contagem = {};
    origens.forEach(o => {
      contagem[o] = (contagem[o] || 0) + 1;
    });

    const icones = {
      quiz: '❓',
      flashcard: '🎴',
      resumo: '📝'
    };

    return Object.entries(contagem).map(([tipo, count]) => `
      <span class="origem-tag">${icones[tipo]} ${count}x</span>
    `).join('');
  }

  /**
   * Estado vazio
   */
  renderizarVazio() {
    this.container.innerHTML = `
      <div class="dificuldades-vazio">
        <div class="vazio-icone">🎉</div>
        <h3>Nenhuma dificuldade registrada!</h3>
        <p>Continue estudando. Quando você marcar algo como "não sei", aparecerá aqui.</p>
      </div>
    `;
  }

  /**
   * Estado de erro
   */
  renderizarErro() {
    this.container.innerHTML = `
      <div class="dificuldades-erro">
        <p>❌ Erro ao carregar dificuldades</p>
        <button onclick="dashboardDificuldades.init()">Tentar Novamente</button>
      </div>
    `;
  }

  /**
   * Event listeners
   */
  adicionarEventListeners() {
    // Já adicionados inline nos botões
  }

  // ============================================
  // AÇÕES DO USUÁRIO
  // ============================================

  toggleTopico(topico) {
    const card = document.querySelector(`[data-topico="${topico}"]`);
    const detalhes = card.querySelector('.topico-detalhes');
    const icone = card.querySelector('.icone-expandir');

    if (detalhes.style.display === 'none') {
      detalhes.style.display = 'block';
      icone.textContent = '▲';
    } else {
      detalhes.style.display = 'none';
      icone.textContent = '▼';
    }
  }

  async estudarTopico(topico) {
    // Redirecionar para resumo personalizado do tópico
    window.location.href = `resumos.html?materia=${this.materiaId}&topico=${encodeURIComponent(topico)}`;
  }

  async fazerQuizTopico(topico) {
    // Redirecionar para quiz filtrado por tópico
    window.location.href = `quiz.html?materia=${this.materiaId}&topico=${encodeURIComponent(topico)}`;
  }

  async marcarResolvido(topico) {
    if (!confirm(`Marcar "${topico}" como resolvido?\n\nIsso removerá o tópico da lista de dificuldades.`)) {
      return;
    }

    try {
      // Buscar todas as dificuldades deste tópico
      const dificuldadesTopico = this.dificuldades.filter(d => d.topico === topico);

      // Marcar todas como resolvidas
      for (const dif of dificuldadesTopico) {
        await resolverDificuldade(dif.id);
      }

      showToast(`Tópico "${topico}" marcado como resolvido!`, 'success');

      // Recarregar dashboard
      await this.init();

    } catch (error) {
      console.error('Erro ao marcar como resolvido:', error);
      showToast('Erro ao marcar como resolvido', 'error');
    }
  }

  async gerarResumoPersonalizado() {
    try {
      showLoadingOverlay('Gerando resumo personalizado...', 'A IA está analisando suas dificuldades');

      // Preparar dados para a IA
      const dados = await DificuldadesService.prepararDadosResumoPersonalizado(this.materiaId);

      // Gerar resumo (será implementado na Fase 4)
      console.log('Dados para IA:', dados);

      showToast('Funcionalidade em desenvolvimento (Fase 4)', 'warning');
      hideLoadingOverlay();

    } catch (error) {
      console.error('Erro ao gerar resumo:', error);
      showToast('Erro ao gerar resumo personalizado', 'error');
      hideLoadingOverlay();
    }
  }

  async quizDificuldades() {
    window.location.href = `quiz.html?materia=${this.materiaId}&modo=dificuldades`;
  }

  async flashcardsDificuldades() {
    window.location.href = `flashcards.html?materia=${this.materiaId}&modo=dificuldades`;
  }

  // ============================================
  // UTILITÁRIOS
  // ============================================

  getNivelCor(percentual) {
    if (percentual >= 70) return '#EF4444'; // Vermelho
    if (percentual >= 40) return '#F59E0B'; // Laranja
    return '#10B981'; // Verde
  }

  getNivelTexto(percentual) {
    if (percentual >= 70) return 'Muitas dificuldades';
    if (percentual >= 40) return 'Algumas dificuldades';
    if (percentual >= 20) return 'Poucas dificuldades';
    return 'Muito bom!';
  }

  getTopicoIcone(nivel) {
    if (nivel >= 4) return '🔴';
    if (nivel >= 3) return '🟡';
    return '🟢';
  }
}

// Função helper para criar toast (se não existir)
function showToast(message, type = 'info') {
  // Implementação já existe em outros arquivos
  if (typeof window.showToast === 'function') {
    window.showToast(message, type);
  } else {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

// Instância global
let dashboardDificuldades = null;

// Inicializar dashboard
async function initDashboardDificuldades(containerId, materiaId) {
  dashboardDificuldades = new DashboardDificuldades(containerId, materiaId);
  await dashboardDificuldades.init();
  return dashboardDificuldades;
}
