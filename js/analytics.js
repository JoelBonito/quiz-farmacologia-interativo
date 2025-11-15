// ============================================
// SISTEMA DE ANALYTICS
// ============================================
// Rastreamento de uso e eventos importantes

class Analytics {
  constructor() {
    this.events = [];
    this.sessionId = this.generateSessionId();
    this.userId = null;
    this.startTime = new Date();
  }

  /**
   * Gera ID único de sessão
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Define usuário atual
   */
  setUser(userId) {
    this.userId = userId;
  }

  /**
   * Registra evento
   */
  track(eventName, properties = {}) {
    const event = {
      name: eventName,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      properties: {
        ...properties,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      }
    };

    this.events.push(event);
    console.log('📊 Analytics:', eventName, properties);

    // Salvar em localStorage (histórico local)
    this.saveToLocalStorage(event);

    // TODO: Enviar para servidor de analytics (futuro)
    // this.sendToServer(event);
  }

  /**
   * Eventos específicos
   */
  trackPageView(pageName) {
    this.track('page_view', { pageName });
  }

  trackQuizStart(materiaId, totalPerguntas) {
    this.track('quiz_start', { materiaId, totalPerguntas });
  }

  trackQuizComplete(materiaId, resultado) {
    this.track('quiz_complete', {
      materiaId,
      ...resultado,
      duration: this.calculateDuration(resultado.startTime, resultado.endTime)
    });
  }

  trackFlashcardStart(materiaId, totalCards, modo) {
    this.track('flashcard_start', { materiaId, totalCards, modo });
  }

  trackFlashcardComplete(materiaId, resultado) {
    this.track('flashcard_complete', {
      materiaId,
      ...resultado,
      duration: this.calculateDuration(resultado.startTime, resultado.endTime)
    });
  }

  trackDificuldadeRegistrada(tipo, topico, materiaId) {
    this.track('dificuldade_registrada', { tipo, topico, materiaId });
  }

  trackNaoSeiClicked(contexto, materiaId) {
    this.track('nao_sei_clicked', { contexto, materiaId });
  }

  trackArquivoUpload(materiaId, tipoArquivo, tamanho) {
    this.track('arquivo_upload', { materiaId, tipoArquivo, tamanho });
  }

  trackProcessamentoIA(materiaId, totalArquivos, resultado) {
    this.track('processamento_ia', { materiaId, totalArquivos, ...resultado });
  }

  trackResumoPersonalizadoGerado(materiaId, totalDificuldades) {
    this.track('resumo_personalizado_gerado', { materiaId, totalDificuldades });
  }

  /**
   * Métricas de engajamento
   */
  trackSessionDuration() {
    const duration = (new Date() - this.startTime) / 1000; // em segundos
    this.track('session_duration', { duration });
  }

  /**
   * Salvar em localStorage
   */
  saveToLocalStorage(event) {
    try {
      const key = 'analytics_events';
      const stored = localStorage.getItem(key);
      const events = stored ? JSON.parse(stored) : [];

      events.push(event);

      // Limitar a 1000 eventos (últimos)
      if (events.length > 1000) {
        events.splice(0, events.length - 1000);
      }

      localStorage.setItem(key, JSON.stringify(events));
    } catch (error) {
      console.error('Erro ao salvar analytics:', error);
    }
  }

  /**
   * Obter estatísticas da sessão
   */
  getSessionStats() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      totalEvents: this.events.length,
      duration: (new Date() - this.startTime) / 1000,
      events: this.events
    };
  }

  /**
   * Obter estatísticas gerais
   */
  static getGlobalStats() {
    try {
      const stored = localStorage.getItem('analytics_events');
      if (!stored) return null;

      const events = JSON.parse(stored);

      // Agrupar por tipo de evento
      const eventCounts = {};
      events.forEach(e => {
        eventCounts[e.name] = (eventCounts[e.name] || 0) + 1;
      });

      // Calcular estatísticas
      return {
        totalEvents: events.length,
        eventTypes: eventCounts,
        firstEvent: events[0]?.timestamp,
        lastEvent: events[events.length - 1]?.timestamp,
        uniqueSessions: new Set(events.map(e => e.sessionId)).size,
        uniqueUsers: new Set(events.map(e => e.userId).filter(Boolean)).size
      };
    } catch (error) {
      console.error('Erro ao obter stats:', error);
      return null;
    }
  }

  /**
   * Limpar dados de analytics
   */
  static clearData() {
    localStorage.removeItem('analytics_events');
    console.log('Analytics data cleared');
  }

  /**
   * Calcular duração entre dois timestamps
   */
  calculateDuration(start, end) {
    if (!start || !end) return 0;
    return (new Date(end) - new Date(start)) / 1000; // segundos
  }
}

// Instância global
const analytics = new Analytics();

// Rastrear visibilidade da página (quando usuário sai/volta)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    analytics.track('page_hidden');
  } else {
    analytics.track('page_visible');
  }
});

// Rastrear quando usuário sai da página
window.addEventListener('beforeunload', () => {
  analytics.trackSessionDuration();
});

// Exportar
if (typeof window !== 'undefined') {
  window.analytics = analytics;
  window.Analytics = Analytics;
}

// Log de inicialização
console.log('📊 Analytics inicializado - SessionID:', analytics.sessionId);
