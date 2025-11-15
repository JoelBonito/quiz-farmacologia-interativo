// ============================================
// RESUMOS CONTROLLER (FASE 4)
// ============================================
// Controlador de resumos interativos com marcações "NÃO ENTENDI"

// Estado da página
const resumoState = {
  materiaId: null,
  resumoId: null,
  resumo: null,
  marcacoes: [],
  selectedText: '',
  selectedRange: null,
  tipoMarcacao: null
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
    resumoState.materiaId = urlParams.get('materia');
    resumoState.resumoId = urlParams.get('id');

    if (!resumoState.materiaId) {
      showToast('Matéria não especificada', 'error');
      setTimeout(() => window.location.href = 'dashboard.html', 2000);
      return;
    }

    // Carregar dados
    await initResumo();

    // Setup event listeners
    setupTextSelection();

  } catch (error) {
    console.error('Erro ao inicializar resumo:', error);
    showToast('Erro ao carregar resumo', 'error');
  }
});

/**
 * Inicializa resumo
 */
async function initResumo() {
  try {
    showLoadingOverlay('Carregando resumo...', 'Aguarde um momento');

    // Se não tem ID de resumo, buscar o mais recente da matéria
    if (!resumoState.resumoId) {
      const resumos = await getResumos(resumoState.materiaId);

      if (resumos.length === 0) {
        // Não há resumos, criar um de exemplo
        showToast('Gerando resumo de exemplo...', 'info');
        await gerarResumoExemplo();
        hideLoadingOverlay();
        return;
      }

      resumoState.resumoId = resumos[0].id;
    }

    // Carregar resumo
    resumoState.resumo = await getResumo(resumoState.resumoId);

    // Carregar marcações existentes
    resumoState.marcacoes = await getMarcacoes(resumoState.resumoId);

    // Renderizar
    renderResumo();
    renderMarcacoes();
    updateStats();

    hideLoadingOverlay();

  } catch (error) {
    console.error('Erro ao carregar resumo:', error);
    showToast('Erro ao carregar resumo', 'error');
    hideLoadingOverlay();
  }
}

/**
 * Renderiza resumo na página
 */
function renderResumo() {
  const { resumo } = resumoState;

  // Atualizar título
  document.getElementById('resumo-titulo').textContent = resumo.titulo;
  document.getElementById('resumo-header-titulo').textContent = resumo.titulo;

  // Atualizar badge de tipo
  const tipoBadge = document.getElementById('resumo-tipo-badge');
  tipoBadge.textContent = resumo.tipo_resumo === 'personalizado' ? 'Resumo Personalizado' : 'Resumo Geral';
  if (resumo.tipo_resumo === 'personalizado') {
    tipoBadge.classList.add('personalizado');
  }

  // Atualizar data
  const data = new Date(resumo.created_at).toLocaleDateString('pt-BR');
  document.getElementById('resumo-data').textContent = data;

  // Renderizar conteúdo
  const contentDiv = document.getElementById('resumo-content');
  contentDiv.innerHTML = '';

  // Se tem conteúdo estruturado, renderizar com parágrafos
  if (resumo.conteudo_estruturado && resumo.conteudo_estruturado.paragrafos) {
    resumo.conteudo_estruturado.paragrafos.forEach((paragrafo, index) => {
      const p = document.createElement('p');
      p.id = `paragrafo-${index}`;
      p.textContent = paragrafo.texto || paragrafo;
      contentDiv.appendChild(p);
    });
  } else {
    // Renderizar conteúdo simples
    const paragrafos = resumo.conteudo.split('\n\n');
    paragrafos.forEach((texto, index) => {
      if (texto.trim()) {
        const p = document.createElement('p');
        p.id = `paragrafo-${index}`;
        p.textContent = texto.trim();
        contentDiv.appendChild(p);
      }
    });
  }

  // Aplicar marcações existentes
  aplicarMarcacoesExistentes();
}

/**
 * Aplica marcações existentes ao texto
 */
function aplicarMarcacoesExistentes() {
  resumoState.marcacoes.forEach(marcacao => {
    destacarTexto(marcacao.texto_selecionado, marcacao.tipo_marcacao, marcacao.id);
  });
}

/**
 * Destaca texto no conteúdo
 */
function destacarTexto(texto, tipo, marcacaoId) {
  const contentDiv = document.getElementById('resumo-content');
  const html = contentDiv.innerHTML;

  // Procurar e destacar o texto
  const regex = new RegExp(`(${escapeRegex(texto)})`, 'gi');
  const highlighted = html.replace(regex, `<span class="highlight highlight-${tipo}" data-marcacao-id="${marcacaoId}">$1</span>`);

  contentDiv.innerHTML = highlighted;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Renderiza lista de marcações na sidebar
 */
function renderMarcacoes() {
  const list = document.getElementById('marcacoes-list');

  if (resumoState.marcacoes.length === 0) {
    list.innerHTML = '<p class="empty-marcacoes">Nenhuma marcação ainda</p>';
    return;
  }

  list.innerHTML = '';

  resumoState.marcacoes.forEach(marcacao => {
    const item = createMarcacaoItem(marcacao);
    list.appendChild(item);
  });
}

/**
 * Cria elemento de marcação
 */
function createMarcacaoItem(marcacao) {
  const div = document.createElement('div');
  div.className = `marcacao-item ${marcacao.tipo_marcacao}`;
  div.dataset.marcacaoId = marcacao.id;

  const tipoLabels = {
    nao_entendi: 'Não Entendi',
    importante: 'Importante',
    duvida: 'Dúvida',
    anotacao: 'Anotação'
  };

  div.innerHTML = `
    <div class="marcacao-item-header">
      <span class="marcacao-tipo">${tipoLabels[marcacao.tipo_marcacao]}</span>
      <button class="marcacao-delete" onclick="deletarMarcacao('${marcacao.id}')">×</button>
    </div>
    <div class="marcacao-texto">${marcacao.texto_selecionado}</div>
    ${marcacao.nota_aluno ? `<div class="marcacao-nota">${marcacao.nota_aluno}</div>` : ''}
  `;

  // Click para rolar até a marcação
  div.addEventListener('click', (e) => {
    if (!e.target.classList.contains('marcacao-delete')) {
      const highlight = document.querySelector(`[data-marcacao-id="${marcacao.id}"]`);
      if (highlight) {
        highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
        highlight.style.animation = 'pulse 0.5s ease';
        setTimeout(() => {
          highlight.style.animation = '';
        }, 500);
      }
    }
  });

  return div;
}

/**
 * Atualiza estatísticas
 */
function updateStats() {
  const contentDiv = document.getElementById('resumo-content');
  const paragrafos = contentDiv.querySelectorAll('p').length;

  const totalMarcacoes = resumoState.marcacoes.length;
  const naoEntendi = resumoState.marcacoes.filter(m => m.tipo_marcacao === 'nao_entendi').length;

  // Calcular percentual de compreensão (inverso das marcações "não entendi")
  const compreensao = paragrafos > 0 ? Math.max(0, Math.round((1 - (naoEntendi / paragrafos)) * 100)) : 100;

  document.getElementById('total-paragrafos').textContent = paragrafos;
  document.getElementById('total-marcacoes').textContent = totalMarcacoes;
  document.getElementById('total-nao-entendi').textContent = naoEntendi;
  document.getElementById('percentual-compreensao').textContent = `${compreensao}%`;

  // Mostrar botão de resumo personalizado se houver dificuldades
  if (naoEntendi >= 3) {
    document.getElementById('btn-gerar-resumo-personalizado').style.display = 'inline-flex';
  }
}

// ============================================
// SELEÇÃO DE TEXTO
// ============================================

/**
 * Setup de seleção de texto
 */
function setupTextSelection() {
  const contentDiv = document.getElementById('resumo-content');

  contentDiv.addEventListener('mouseup', handleTextSelection);
  contentDiv.addEventListener('touchend', handleTextSelection);

  // Fechar modal ao clicar fora
  document.addEventListener('click', (e) => {
    const modal = document.getElementById('selection-modal');
    if (e.target === modal) {
      cancelarSelecao();
    }
  });
}

/**
 * Manipula seleção de texto
 */
function handleTextSelection(e) {
  const selection = window.getSelection();
  const text = selection.toString().trim();

  if (text.length >= 10) { // Mínimo 10 caracteres
    resumoState.selectedText = text;
    resumoState.selectedRange = selection.getRangeAt(0);

    // Mostrar modal de seleção
    showSelectionModal(text);
  }
}

/**
 * Mostra modal de seleção
 */
function showSelectionModal(text) {
  const modal = document.getElementById('selection-modal');
  const preview = document.getElementById('selected-text-preview');

  // Limitar preview a 200 caracteres
  const previewText = text.length > 200 ? text.substring(0, 200) + '...' : text;
  preview.textContent = previewText;

  modal.style.display = 'flex';

  // Reset seleção anterior
  resetSelectionButtons();
}

/**
 * Reset dos botões de seleção
 */
function resetSelectionButtons() {
  document.querySelectorAll('.btn-selection').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector('.nota-container').style.display = 'none';
  document.getElementById('btn-confirmar-marcacao').style.display = 'none';
  document.getElementById('nota-input').value = '';
  resumoState.tipoMarcacao = null;
}

// ============================================
// AÇÕES DE MARCAÇÃO
// ============================================

/**
 * Marcar como "NÃO ENTENDI" (核心功能 - CORE FEATURE)
 */
function marcarNaoEntendi() {
  resumoState.tipoMarcacao = 'nao_entendi';
  activateButton('.btn-nao-entendi');
  document.querySelector('.nota-container').style.display = 'block';
  document.getElementById('btn-confirmar-marcacao').style.display = 'inline-flex';
}

/**
 * Marcar como "IMPORTANTE"
 */
function marcarImportante() {
  resumoState.tipoMarcacao = 'importante';
  activateButton('.btn-importante');
  document.getElementById('btn-confirmar-marcacao').style.display = 'inline-flex';
}

/**
 * Marcar como "DÚVIDA"
 */
function marcarDuvida() {
  resumoState.tipoMarcacao = 'duvida';
  activateButton('.btn-duvida');
  document.querySelector('.nota-container').style.display = 'block';
  document.getElementById('btn-confirmar-marcacao').style.display = 'inline-flex';
}

/**
 * Ativa botão selecionado
 */
function activateButton(selector) {
  document.querySelectorAll('.btn-selection').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(selector).classList.add('active');
}

/**
 * Confirma marcação
 */
async function confirmarMarcacao() {
  if (!resumoState.tipoMarcacao) {
    showToast('Selecione um tipo de marcação', 'warning');
    return;
  }

  try {
    showLoadingOverlay('Salvando marcação...', 'Aguarde');

    const nota = document.getElementById('nota-input').value.trim();

    // Criar marcação no banco
    const marcacaoData = {
      texto_selecionado: resumoState.selectedText,
      tipo_marcacao: resumoState.tipoMarcacao,
      nota_aluno: nota || null,
      cor_destaque: getCorDestaque(resumoState.tipoMarcacao)
    };

    const marcacao = await createMarcacao(resumoState.resumoId, marcacaoData);

    // Se for "não entendi", registrar dificuldade (FASE 4)
    if (resumoState.tipoMarcacao === 'nao_entendi') {
      await registrarDificuldadeDeResumo(marcacao);
    }

    // Adicionar à lista
    resumoState.marcacoes.push(marcacao);

    // Atualizar UI
    destacarTexto(resumoState.selectedText, resumoState.tipoMarcacao, marcacao.id);
    renderMarcacoes();
    updateStats();

    // Fechar modal
    cancelarSelecao();

    hideLoadingOverlay();
    showToast('Marcação salva com sucesso!', 'success');

  } catch (error) {
    console.error('Erro ao salvar marcação:', error);
    hideLoadingOverlay();
    showToast('Erro ao salvar marcação', 'error');
  }
}

/**
 * Registra dificuldade a partir da marcação (INTEGRAÇÃO FASE 1)
 */
async function registrarDificuldadeDeResumo(marcacao) {
  try {
    const selecao = {
      texto: marcacao.texto_selecionado,
      nota: marcacao.nota_aluno
    };

    const resultado = await DificuldadesService.registrarDificuldadeResumo(
      resumoState.resumoId,
      resumoState.materiaId,
      selecao
    );

    console.log('✅ Dificuldade registrada:', resultado.dificuldade);

    // Atualizar marcação com ID da dificuldade
    await supabase
      .from('resumos_marcacoes')
      .update({ dificuldade_id: resultado.dificuldade.id })
      .eq('id', marcacao.id);

  } catch (error) {
    console.error('Erro ao registrar dificuldade:', error);
    // Não bloquear o fluxo
  }
}

function getCorDestaque(tipo) {
  const cores = {
    nao_entendi: 'red',
    importante: 'yellow',
    duvida: 'blue',
    anotacao: 'green'
  };
  return cores[tipo] || 'yellow';
}

/**
 * Cancela seleção
 */
function cancelarSelecao() {
  document.getElementById('selection-modal').style.display = 'none';
  window.getSelection().removeAllRanges();
  resumoState.selectedText = '';
  resumoState.selectedRange = null;
  resumoState.tipoMarcacao = null;
}

/**
 * Deletar marcação
 */
async function deletarMarcacao(marcacaoId) {
  if (!confirm('Deseja realmente excluir esta marcação?')) {
    return;
  }

  try {
    await deleteMarcacao(marcacaoId);

    // Remover da lista
    resumoState.marcacoes = resumoState.marcacoes.filter(m => m.id !== marcacaoId);

    // Recarregar resumo para remover highlight
    renderResumo();
    renderMarcacoes();
    updateStats();

    showToast('Marcação excluída', 'success');

  } catch (error) {
    console.error('Erro ao deletar marcação:', error);
    showToast('Erro ao excluir marcação', 'error');
  }
}

/**
 * Limpar todas as marcações
 */
async function limparMarcacoes() {
  if (!confirm('Deseja realmente limpar todas as marcações? Esta ação não pode ser desfeita.')) {
    return;
  }

  try {
    showLoadingOverlay('Limpando marcações...', 'Aguarde');

    // Deletar todas
    for (const marcacao of resumoState.marcacoes) {
      await deleteMarcacao(marcacao.id);
    }

    resumoState.marcacoes = [];

    renderResumo();
    renderMarcacoes();
    updateStats();

    hideLoadingOverlay();
    showToast('Todas as marcações foram removidas', 'success');

  } catch (error) {
    console.error('Erro ao limpar marcações:', error);
    hideLoadingOverlay();
    showToast('Erro ao limpar marcações', 'error');
  }
}

// ============================================
// GERAR RESUMO PERSONALIZADO (FASE 5)
// ============================================

/**
 * Gerar resumo personalizado baseado nas dificuldades
 */
async function gerarResumoPersonalizado() {
  try {
    showLoadingOverlay('Gerando resumo personalizado...', 'Analisando suas dificuldades com IA');

    // Preparar dados
    const dados = await DificuldadesService.prepararDadosResumoPersonalizado(resumoState.materiaId);

    // Aqui você chamaria a API do Gemini para gerar o resumo
    // Por enquanto, mostrar modal com dados
    showToast('Funcionalidade em desenvolvimento (Fase 5)', 'warning');

    hideLoadingOverlay();

  } catch (error) {
    console.error('Erro ao gerar resumo:', error);
    hideLoadingOverlay();
    showToast('Erro ao gerar resumo personalizado', 'error');
  }
}

function closeResumoGeradoModal() {
  document.getElementById('resumo-gerado-modal').style.display = 'none';
}

function verResumoPersonalizado() {
  // Redirecionar para novo resumo personalizado
  showToast('Abrindo resumo personalizado...', 'info');
  closeResumoGeradoModal();
}

// ============================================
// GERAR RESUMO DE EXEMPLO
// ============================================

async function gerarResumoExemplo() {
  const user = await getCurrentUser();

  const resumoExemplo = {
    user_id: user.id,
    materia_id: resumoState.materiaId,
    titulo: 'Resumo de Farmacologia',
    tipo_resumo: 'geral',
    conteudo: `# Farmacologia Básica

A farmacologia é a ciência que estuda a interação entre substâncias químicas e os sistemas biológicos.

## Farmacocinética

A farmacocinética descreve o que o organismo faz com o fármaco, incluindo absorção, distribuição, metabolismo e excreção (ADME).

A absorção é o processo pelo qual o fármaco passa do local de administração para a corrente sanguínea. Fatores como solubilidade, pH e perfusão sanguínea influenciam este processo.

## Farmacodinâmica

A farmacodinâmica estuda o que o fármaco faz no organismo, incluindo mecanismos de ação e efeitos terapêuticos.

Os receptores são proteínas celulares que se ligam especificamente a fármacos, desencadeando respostas celulares. Existem agonistas (que ativam receptores) e antagonistas (que bloqueiam receptores).

## Metabolismo de Fármacos

O metabolismo hepático é a principal via de biotransformação de fármacos. O citocromo P450 é uma família de enzimas fundamentais neste processo.

As reações de fase I incluem oxidação, redução e hidrólise. As reações de fase II envolvem conjugação com moléculas endógenas.`,
    conteudo_estruturado: null,
    gerado_por: 'manual'
  };

  const resumo = await createResumo(resumoExemplo);
  resumoState.resumoId = resumo.id;
  resumoState.resumo = resumo;

  renderResumo();
  updateStats();
}

// ============================================
// UI HELPERS
// ============================================

function showLoadingOverlay(title, message) {
  const overlay = document.getElementById('loading-overlay');
  document.getElementById('loading-title').textContent = title;
  document.getElementById('loading-message').textContent = message;
  overlay.style.display = 'flex';
}

function hideLoadingOverlay() {
  document.getElementById('loading-overlay').style.display = 'none';
}

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

  setTimeout(() => toast.remove(), 3000);
}
