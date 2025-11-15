// ============================================
// MATERIA PAGE - GERENCIAMENTO DE ARQUIVOS E UPLOAD
// ============================================

// Estado global
let currentMateriaId = null;
let selectedFiles = [];
let uploadingFiles = new Map(); // Rastrear progresso de cada arquivo

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  // Verificar autenticação
  if (!await requireAuth()) return;

  // Obter ID da matéria da URL
  const urlParams = new URLSearchParams(window.location.search);
  currentMateriaId = urlParams.get('id');

  if (!currentMateriaId) {
    showToast('Matéria não encontrada', 'error');
    setTimeout(() => window.location.href = 'materias.html', 2000);
    return;
  }

  // Inicializar página
  await loadMateriaData();
  await loadArquivos();
  setupEventListeners();

  // Carregar dashboard de dificuldades se existir
  if (typeof initDashboardDificuldades === 'function') {
    await initDashboardDificuldades(currentMateriaId);
  }
});

// ============================================
// SETUP EVENT LISTENERS
// ============================================

function setupEventListeners() {
  const uploadArea = document.getElementById('upload-area');
  const fileInput = document.getElementById('file-input');
  const selectFilesBtn = document.getElementById('select-files-btn');
  const processAiBtn = document.getElementById('process-ai-btn');

  // Drag and Drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.add('drag-over');
  });

  uploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove('drag-over');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove('drag-over');

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  });

  // Click to select
  uploadArea.addEventListener('click', (e) => {
    if (e.target.id !== 'select-files-btn') {
      fileInput.click();
    }
  });

  selectFilesBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  });

  // Processar com IA
  if (processAiBtn) {
    processAiBtn.addEventListener('click', handleProcessWithAI);
  }
}

// ============================================
// MANIPULAÇÃO DE ARQUIVOS
// ============================================

function handleFiles(fileList) {
  const validExtensions = ['pdf', 'txt', 'md', 'jpg', 'jpeg', 'png'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const validFiles = fileList.filter(file => {
    const ext = file.name.split('.').pop().toLowerCase();

    if (!validExtensions.includes(ext)) {
      showToast(`Arquivo ${file.name} não é suportado. Use: ${validExtensions.join(', ')}`, 'error');
      return false;
    }

    if (file.size > maxFileSize) {
      showToast(`Arquivo ${file.name} é muito grande. Máximo: 10MB`, 'error');
      return false;
    }

    return true;
  });

  if (validFiles.length === 0) return;

  selectedFiles = [...selectedFiles, ...validFiles];
  renderSelectedFiles();

  // Iniciar upload automaticamente
  uploadFiles();
}

function renderSelectedFiles() {
  const container = document.getElementById('selected-files');

  if (selectedFiles.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  container.innerHTML = `
    <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
      <h3 style="font-size: 16px; font-weight: 600;">Arquivos Selecionados (${selectedFiles.length})</h3>
      <button onclick="clearSelectedFiles()" class="btn-secondary" style="padding: 6px 12px; font-size: 13px;">Limpar Todos</button>
    </div>
    <div id="selected-files-list"></div>
  `;

  const filesList = document.getElementById('selected-files-list');

  selectedFiles.forEach((file, index) => {
    const fileIcon = getFileIcon(file.name);
    const fileSize = formatFileSize(file.size);

    const fileItem = document.createElement('div');
    fileItem.className = 'selected-file-item';
    fileItem.dataset.fileIndex = index;
    fileItem.innerHTML = `
      <div class="selected-file-info">
        <div class="file-icon">${fileIcon}</div>
        <div class="file-details">
          <div class="file-name">${file.name}</div>
          <div class="file-size">${fileSize}</div>
          <div class="file-upload-progress" id="progress-${index}" style="display: none;">
            <div class="file-progress-bar">
              <div class="file-progress-fill" id="progress-fill-${index}"></div>
            </div>
            <div class="file-progress-text">
              <div class="file-progress-status" id="progress-status-${index}">
                Aguardando...
              </div>
              <div id="progress-percent-${index}">0%</div>
            </div>
          </div>
        </div>
      </div>
      <button onclick="removeFile(${index})" class="remove-file-btn" title="Remover">✕</button>
    `;

    filesList.appendChild(fileItem);
  });
}

function clearSelectedFiles() {
  selectedFiles = [];
  uploadingFiles.clear();
  renderSelectedFiles();

  // Limpar input
  const fileInput = document.getElementById('file-input');
  if (fileInput) fileInput.value = '';
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  uploadingFiles.delete(index);
  renderSelectedFiles();
}

// ============================================
// UPLOAD DE ARQUIVOS COM PROGRESSO
// ============================================

async function uploadFiles() {
  if (selectedFiles.length === 0) {
    showToast('Nenhum arquivo selecionado', 'warning');
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  // Upload de cada arquivo com progresso individual
  for (let i = 0; i < selectedFiles.length; i++) {
    const file = selectedFiles[i];

    // Pular se já foi feito upload
    if (uploadingFiles.get(i)?.completed) {
      continue;
    }

    try {
      await uploadSingleFile(file, i);
      successCount++;
    } catch (error) {
      console.error(`Erro ao fazer upload de ${file.name}:`, error);
      errorCount++;
      updateFileProgress(i, 0, 'error', error.message);
    }
  }

  // Mensagem final
  if (successCount > 0) {
    showToast(`${successCount} arquivo(s) enviado(s) com sucesso!`, 'success');
    await loadArquivos();

    // Habilitar botão de processar IA
    const processBtn = document.getElementById('process-ai-btn');
    if (processBtn) {
      processBtn.disabled = false;
    }
  }

  if (errorCount > 0) {
    showToast(`${errorCount} arquivo(s) falharam no upload`, 'error');
  }
}

async function uploadSingleFile(file, index) {
  // Mostrar barra de progresso
  const progressContainer = document.getElementById(`progress-${index}`);
  if (progressContainer) {
    progressContainer.style.display = 'block';
  }

  updateFileProgress(index, 0, 'uploading', 'Iniciando...');

  try {
    // Simular progresso inicial
    updateFileProgress(index, 10, 'uploading', 'Preparando arquivo...');

    // Fazer upload real
    updateFileProgress(index, 30, 'uploading', 'Enviando para servidor...');

    const uploadedFile = await uploadFile(currentMateriaId, file);

    // Upload concluído
    updateFileProgress(index, 100, 'success', 'Upload concluído!');

    // Marcar como completo
    uploadingFiles.set(index, { completed: true, fileId: uploadedFile.id });

    return uploadedFile;

  } catch (error) {
    updateFileProgress(index, 0, 'error', `Erro: ${error.message}`);
    throw error;
  }
}

function updateFileProgress(index, percent, status, message) {
  const progressFill = document.getElementById(`progress-fill-${index}`);
  const progressPercent = document.getElementById(`progress-percent-${index}`);
  const progressStatus = document.getElementById(`progress-status-${index}`);

  if (progressFill) {
    progressFill.style.width = `${percent}%`;
  }

  if (progressPercent) {
    progressPercent.textContent = `${Math.round(percent)}%`;
  }

  if (progressStatus) {
    progressStatus.className = `file-progress-status ${status}`;

    let icon = '';
    switch (status) {
      case 'uploading':
        icon = '⏳';
        break;
      case 'success':
        icon = '✓';
        break;
      case 'error':
        icon = '✕';
        break;
    }

    progressStatus.textContent = `${icon} ${message}`;
  }
}

// ============================================
// CARREGAR DADOS DA MATÉRIA
// ============================================

async function loadMateriaData() {
  try {
    const materia = await getMateria(currentMateriaId);

    // Atualizar título
    document.getElementById('materia-nome').textContent = materia.nome;
    document.getElementById('materia-nome-display').textContent = materia.nome;
    document.getElementById('materia-descricao').textContent = materia.descricao || 'Sem descrição';

    if (materia.icone) {
      document.getElementById('materia-icone').textContent = materia.icone;
    }

    // Carregar estatísticas
    await loadMateriaStats();

  } catch (error) {
    console.error('Erro ao carregar matéria:', error);
    showToast('Erro ao carregar matéria', 'error');
  }
}

async function loadMateriaStats() {
  try {
    // Contar arquivos
    const arquivos = await getArquivos(currentMateriaId);
    document.getElementById('total-arquivos-display').textContent = arquivos.length;

    // Contar perguntas
    const perguntas = await getPerguntas(currentMateriaId);
    document.getElementById('total-perguntas-display').textContent = perguntas.length;

    // Mostrar seção de ações rápidas se houver conteúdo
    if (perguntas.length > 0) {
      document.getElementById('acoes-rapidas-section').style.display = 'block';
    }

  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
  }
}

// ============================================
// CARREGAR E EXIBIR ARQUIVOS
// ============================================

async function loadArquivos() {
  const filesLoading = document.getElementById('files-loading');
  const filesEmpty = document.getElementById('files-empty');
  const filesList = document.getElementById('files-list');
  const filesCount = document.getElementById('files-count');

  try {
    filesLoading.style.display = 'block';
    filesEmpty.style.display = 'none';
    filesList.style.display = 'none';

    const arquivos = await getArquivos(currentMateriaId);

    filesLoading.style.display = 'none';

    if (arquivos.length === 0) {
      filesEmpty.style.display = 'block';
      filesCount.textContent = '0';
      return;
    }

    filesCount.textContent = arquivos.length;
    filesList.style.display = 'block';
    filesList.innerHTML = '';

    arquivos.forEach(arquivo => {
      const fileCard = createFileCard(arquivo);
      filesList.appendChild(fileCard);
    });

  } catch (error) {
    console.error('Erro ao carregar arquivos:', error);
    filesLoading.style.display = 'none';
    filesEmpty.style.display = 'block';
    showToast('Erro ao carregar arquivos', 'error');
  }
}

function createFileCard(arquivo) {
  const card = document.createElement('div');
  card.className = 'file-card';

  const fileIcon = getFileIcon(arquivo.nome_original);
  const fileSize = formatFileSize(arquivo.tamanho);
  const uploadDate = new Date(arquivo.created_at).toLocaleDateString('pt-BR');
  const status = arquivo.status || 'pending';

  card.innerHTML = `
    <div class="file-card-info">
      <div class="file-icon">${fileIcon}</div>
      <div class="file-card-details">
        <div class="file-name">${arquivo.nome_original}</div>
        <div class="file-meta">
          <span>${fileSize}</span>
          <span>${uploadDate}</span>
        </div>
      </div>
    </div>
    <div style="display: flex; align-items: center; gap: 12px;">
      <div class="file-status ${status}">
        ${getStatusText(status)}
      </div>
      <div class="file-actions">
        ${status === 'pending' ? `
          <button onclick="processFileById('${arquivo.id}')" class="btn btn-primary" style="font-size: 13px; padding: 6px 12px;">
            🤖 Processar
          </button>
        ` : ''}
        <button onclick="deleteFileById('${arquivo.id}', '${arquivo.storage_path}')" class="btn btn-secondary" style="font-size: 13px; padding: 6px 12px;">
          🗑️ Deletar
        </button>
      </div>
    </div>
  `;

  return card;
}

// ============================================
// PROCESSAR ARQUIVO COM IA
// ============================================

async function handleProcessWithAI() {
  try {
    const arquivos = await getArquivos(currentMateriaId);
    const pendingFiles = arquivos.filter(a => a.status === 'pending');

    if (pendingFiles.length === 0) {
      showToast('Nenhum arquivo pendente para processar', 'warning');
      return;
    }

    // Processar primeiro arquivo pendente
    await processFile(pendingFiles[0]);

  } catch (error) {
    console.error('Erro ao processar com IA:', error);
    showToast('Erro ao processar arquivo', 'error');
  }
}

async function processFileById(arquivoId) {
  try {
    const arquivos = await getArquivos(currentMateriaId);
    const arquivo = arquivos.find(a => a.id === arquivoId);

    if (!arquivo) {
      showToast('Arquivo não encontrado', 'error');
      return;
    }

    await processFile(arquivo);

  } catch (error) {
    console.error('Erro ao processar arquivo:', error);
    showToast('Erro ao processar arquivo', 'error');
  }
}

async function processFile(arquivo) {
  try {
    showLoading('Processando arquivo...', 'Extraindo texto e gerando conteúdo com IA');

    // 1. Download do arquivo do storage
    const fileBlob = await downloadFile(arquivo.storage_path);

    // 2. Extrair texto do arquivo
    updateLoadingProgress(20);
    updateLoadingMessage('Extraindo texto do arquivo...');

    const file = new File([fileBlob], arquivo.nome_original);
    const fileContent = await extractTextFromFile(file);

    if (!fileContent || fileContent.trim().length === 0) {
      throw new Error('Não foi possível extrair texto do arquivo');
    }

    // 3. Processar com Gemini via Edge Function
    updateLoadingProgress(40);
    updateLoadingMessage('Processando com IA (isso pode levar alguns minutos)...');

    const result = await processWithGemini(
      fileContent,
      arquivo.tipo,
      currentMateriaId,
      arquivo.id
    );

    updateLoadingProgress(100);
    hideLoading();

    // Mostrar mensagem de sucesso
    showToast(
      `Processamento concluído! Gerados: ${result.perguntas} perguntas, ${result.flashcards} flashcards${result.resumo ? ' e 1 resumo' : ''}`,
      'success'
    );

    // Recarregar dados
    await loadMateriaData();
    await loadArquivos();

    // Mostrar seção de ações rápidas
    document.getElementById('acoes-rapidas-section').style.display = 'block';

  } catch (error) {
    console.error('Erro ao processar arquivo:', error);
    hideLoading();
    showToast('Erro ao processar arquivo: ' + error.message, 'error');

    // Atualizar status do arquivo como erro
    await updateArquivoStatus(arquivo.id, 'error', null, error.message);
  }
}

async function deleteFileById(arquivoId, storagePath) {
  if (!confirm('Tem certeza que deseja deletar este arquivo?')) {
    return;
  }

  try {
    await deleteArquivo(arquivoId, storagePath);
    showToast('Arquivo deletado com sucesso', 'success');
    await loadArquivos();
    await loadMateriaStats();
  } catch (error) {
    console.error('Erro ao deletar arquivo:', error);
    showToast('Erro ao deletar arquivo', 'error');
  }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const icons = {
    pdf: '📄',
    txt: '📝',
    md: '📋',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️'
  };
  return icons[ext] || '📎';
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function getStatusText(status) {
  const statusMap = {
    pending: '⏳ Pendente',
    processing: '⚙️ Processando',
    processed: '✓ Processado',
    error: '✕ Erro'
  };
  return statusMap[status] || status;
}

function showLoading(title, message) {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    document.getElementById('loading-title').textContent = title;
    document.getElementById('loading-message').textContent = message;
    overlay.style.display = 'flex';
  }
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.style.display = 'none';
}

function updateLoadingProgress(percent) {
  const progressFill = document.getElementById('progress-fill');
  if (progressFill) progressFill.style.width = `${percent}%`;
}

function updateLoadingMessage(message) {
  const messageEl = document.getElementById('loading-message');
  if (messageEl) messageEl.textContent = message;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.style.cssText = `
    position: fixed;
    top: 24px;
    right: 24px;
    background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : type === 'warning' ? '#F59E0B' : '#3B82F6'};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-weight: 600;
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// Expor funções globalmente para uso inline no HTML
window.removeFile = removeFile;
window.clearSelectedFiles = clearSelectedFiles;
window.processFileById = processFileById;
window.deleteFileById = deleteFileById;
window.iniciarQuiz = function() {
  window.location.href = `quiz.html?materia=${currentMateriaId}`;
};
window.iniciarFlashcards = function() {
  window.location.href = `flashcards.html?materia=${currentMateriaId}`;
};
window.iniciarFlashcardsDificuldades = function() {
  window.location.href = `flashcards.html?materia=${currentMateriaId}&dificuldades=true`;
};
window.verResumos = function() {
  window.location.href = `resumos.html?materia=${currentMateriaId}`;
};
window.gerarResumo = function() {
  window.location.href = `resumo-personalizado.html?materia=${currentMateriaId}`;
};
