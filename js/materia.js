// ============================================
// MATERIA PAGE - GERENCIAMENTO E UPLOAD
// ============================================

let currentMateria = null;
let selectedFiles = [];
let arquivos = [];

// Obter ID da matéria da URL
const urlParams = new URLSearchParams(window.location.search);
const materiaId = urlParams.get('id');

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
  if (!materiaId) {
    window.location.href = 'dashboard.html';
    return;
  }

  await checkAuth();
  await loadMateria();
  await loadArquivos();
  setupEventListeners();
});

// ============================================
// CARREGAR MATÉRIA
// ============================================

async function loadMateria() {
  try {
    currentMateria = await getMateria(materiaId);

    // Atualizar UI
    document.getElementById('materia-nome').textContent = currentMateria.nome;
    document.getElementById('materia-nome-display').textContent = currentMateria.nome;
    document.getElementById('materia-icone').textContent = currentMateria.icone;
    document.getElementById('materia-descricao').textContent = currentMateria.descricao || 'Sem descrição';
    document.getElementById('total-arquivos-display').textContent = currentMateria.total_arquivos || 0;
    document.getElementById('total-perguntas-display').textContent = currentMateria.total_perguntas || 0;

    document.title = `${currentMateria.nome} - Quiz Interativo`;

  } catch (error) {
    console.error('Erro ao carregar matéria:', error);
    showToast('Erro ao carregar matéria', 'error');
    setTimeout(() => window.location.href = 'dashboard.html', 2000);
  }
}

// ============================================
// CARREGAR ARQUIVOS
// ============================================

async function loadArquivos() {
  try {
    showFilesLoading();

    arquivos = await getArquivos(materiaId);

    if (arquivos.length === 0) {
      showFilesEmpty();
    } else {
      showFilesList();
      renderArquivos();
    }

    updateProcessButton();

  } catch (error) {
    console.error('Erro ao carregar arquivos:', error);
    showToast('Erro ao carregar arquivos', 'error');
    showFilesEmpty();
  }
}

function renderArquivos() {
  const filesList = document.getElementById('files-list');
  const filesCount = document.getElementById('files-count');

  filesCount.textContent = arquivos.length;
  filesList.innerHTML = '';

  arquivos.forEach(arquivo => {
    const card = createFileCard(arquivo);
    filesList.appendChild(card);
  });
}

function createFileCard(arquivo) {
  const card = document.createElement('div');
  card.className = 'file-card';

  const icon = getFileIcon(arquivo.tipo);
  const size = formatFileSize(arquivo.tamanho);
  const date = new Date(arquivo.created_at).toLocaleDateString('pt-BR');

  card.innerHTML = `
    <div class="file-card-info">
      <div class="file-icon">${icon}</div>
      <div class="file-card-details">
        <div class="file-name">${arquivo.nome_original}</div>
        <div class="file-meta">
          <span>${size}</span>
          <span>${date}</span>
        </div>
      </div>
    </div>
    <div class="file-actions">
      <span class="file-status ${arquivo.status}">${getStatusText(arquivo.status)}</span>
      <button class="btn btn-secondary btn-sm" onclick="deleteFile('${arquivo.id}', '${arquivo.storage_path}')">
        🗑️
      </button>
    </div>
  `;

  return card;
}

function getStatusText(status) {
  const texts = {
    pending: '⏳ Pendente',
    processing: '🔄 Processando',
    processed: '✓ Processado',
    error: '✕ Erro'
  };
  return texts[status] || status;
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  const uploadArea = document.getElementById('upload-area');
  const fileInput = document.getElementById('file-input');
  const selectFilesBtn = document.getElementById('select-files-btn');
  const processBtn = document.getElementById('process-ai-btn');

  // Drag and drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });

  // Click to upload
  uploadArea.addEventListener('click', () => fileInput.click());
  selectFilesBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });

  // Processar com IA
  processBtn.addEventListener('click', handleProcessWithAI);
}

// ============================================
// UPLOAD DE ARQUIVOS
// ============================================

function handleFiles(fileList) {
  selectedFiles = Array.from(fileList);

  if (selectedFiles.length === 0) return;

  // Validar arquivos
  const invalidFiles = selectedFiles.filter(file => {
    const ext = file.name.split('.').pop().toLowerCase();
    return !CONFIG.ALLOWED_EXTENSIONS.includes(ext);
  });

  if (invalidFiles.length > 0) {
    showToast(`Arquivos inválidos: ${invalidFiles.map(f => f.name).join(', ')}`, 'error');
    selectedFiles = selectedFiles.filter(f => !invalidFiles.includes(f));
  }

  if (selectedFiles.length === 0) return;

  renderSelectedFiles();
}

function renderSelectedFiles() {
  const container = document.getElementById('selected-files');
  container.style.display = 'block';
  container.innerHTML = '';

  // Lista de arquivos
  selectedFiles.forEach((file, index) => {
    const item = createSelectedFileItem(file, index);
    container.appendChild(item);
  });

  // Botões de ação
  const actions = document.createElement('div');
  actions.className = 'upload-actions';
  actions.innerHTML = `
    <button class="btn btn-secondary" onclick="cancelUpload()">Cancelar</button>
    <button class="btn btn-primary" onclick="uploadFiles()">📤 Upload ${selectedFiles.length} arquivo(s)</button>
  `;
  container.appendChild(actions);
}

function createSelectedFileItem(file, index) {
  const item = document.createElement('div');
  item.className = 'selected-file-item';

  const ext = file.name.split('.').pop().toLowerCase();
  const icon = getFileIcon(ext);

  item.innerHTML = `
    <div class="selected-file-info">
      <div class="file-icon">${icon}</div>
      <div class="file-details">
        <div class="file-name">${file.name}</div>
        <div class="file-size">${formatFileSize(file.size)}</div>
      </div>
    </div>
    <button class="remove-file-btn" onclick="removeSelectedFile(${index})">×</button>
  `;

  return item;
}

function removeSelectedFile(index) {
  selectedFiles.splice(index, 1);

  if (selectedFiles.length === 0) {
    cancelUpload();
  } else {
    renderSelectedFiles();
  }
}

function cancelUpload() {
  selectedFiles = [];
  document.getElementById('selected-files').style.display = 'none';
  document.getElementById('file-input').value = '';
}

async function uploadFiles() {
  if (selectedFiles.length === 0) return;

  showLoadingOverlay('Fazendo upload...', 'Enviando arquivos para o servidor');

  try {
    let uploaded = 0;

    for (const file of selectedFiles) {
      await uploadFile(materiaId, file);
      uploaded++;
      updateProgress((uploaded / selectedFiles.length) * 100);
    }

    showToast(`${uploaded} arquivo(s) enviado(s) com sucesso!`, 'success');
    cancelUpload();

    // Recarregar arquivos e matéria
    await loadArquivos();
    await loadMateria();

  } catch (error) {
    console.error('Erro no upload:', error);
    showToast('Erro ao fazer upload: ' + error.message, 'error');

  } finally {
    hideLoadingOverlay();
  }
}

// ============================================
// PROCESSAR COM IA
// ============================================

async function handleProcessWithAI() {
  const arquivosPendentes = arquivos.filter(a => a.status === 'pending' || a.status === 'error');

  if (arquivosPendentes.length === 0) {
    showToast('Todos os arquivos já foram processados', 'warning');
    return;
  }

  if (!confirm(`Processar ${arquivosPendentes.length} arquivo(s) com IA?\n\nIsso pode levar alguns minutos e consumir créditos da API Gemini.`)) {
    return;
  }

  showLoadingOverlay('Processando com IA...', 'Extraindo conteúdo e gerando perguntas');

  try {
    const result = await processMultipleFiles(arquivosPendentes, materiaId, (progress) => {
      const percent = (progress.current / progress.total) * 100;
      updateProgress(percent);
      updateLoadingMessage(`Processando: ${progress.fileName} (${progress.current}/${progress.total})`);
    });

    hideLoadingOverlay();

    const msg = `
Processamento concluído!

✅ Sucessos: ${result.sucessos}
❌ Erros: ${result.erros}
📝 Total de perguntas geradas: ${result.totalPerguntas}
    `.trim();

    alert(msg);
    showToast(`${result.totalPerguntas} perguntas geradas!`, 'success');

    // Recarregar tudo
    await loadArquivos();
    await loadMateria();

    // Mostrar preview das perguntas
    if (result.totalPerguntas > 0) {
      await loadQuestionsPreview();
    }

  } catch (error) {
    console.error('Erro ao processar com IA:', error);
    showToast('Erro ao processar: ' + error.message, 'error');
    hideLoadingOverlay();
  }
}

// ============================================
// PREVIEW DE PERGUNTAS
// ============================================

async function loadQuestionsPreview() {
  try {
    const perguntas = await getPerguntas(materiaId);

    if (perguntas.length === 0) return;

    const section = document.getElementById('questions-section');
    const list = document.getElementById('questions-list');
    const count = document.getElementById('questions-count');

    count.textContent = perguntas.length;
    list.innerHTML = '';

    // Mostrar primeiras 10 perguntas
    perguntas.slice(0, 10).forEach(p => {
      const card = createQuestionCard(p);
      list.appendChild(card);
    });

    if (perguntas.length > 10) {
      const moreBtn = document.createElement('button');
      moreBtn.className = 'btn btn-outline';
      moreBtn.textContent = `Ver todas as ${perguntas.length} perguntas no Quiz`;
      moreBtn.onclick = () => window.location.href = `quiz.html?materia=${materiaId}`;
      list.appendChild(moreBtn);
    }

    section.style.display = 'block';

  } catch (error) {
    console.error('Erro ao carregar perguntas:', error);
  }
}

function createQuestionCard(pergunta) {
  const card = document.createElement('div');
  card.className = 'question-card';

  const opcoes = typeof pergunta.opcoes === 'string' ? JSON.parse(pergunta.opcoes) : pergunta.opcoes;

  card.innerHTML = `
    <div class="question-header">
      <span class="question-type ${pergunta.tipo}">${pergunta.tipo.replace('_', ' ')}</span>
      <span class="question-difficulty">${pergunta.dificuldade}</span>
    </div>
    <div class="question-text">${pergunta.pergunta}</div>
    <div class="question-options">
      ${opcoes.map(op => `
        <div class="question-option ${op === pergunta.resposta_correta ? 'correct' : ''}">
          ${op} ${op === pergunta.resposta_correta ? '✓' : ''}
        </div>
      `).join('')}
    </div>
    ${pergunta.justificativa ? `<div class="question-justification"><strong>Justificativa:</strong> ${pergunta.justificativa}</div>` : ''}
  `;

  return card;
}

// ============================================
// DELETAR ARQUIVO
// ============================================

async function deleteFile(arquivoId, storagePath) {
  if (!confirm('Tem certeza que deseja excluir este arquivo? As perguntas geradas a partir dele serão mantidas.')) {
    return;
  }

  try {
    await deleteArquivo(arquivoId, storagePath);
    showToast('Arquivo excluído', 'success');

    await loadArquivos();
    await loadMateria();

  } catch (error) {
    console.error('Erro ao excluir arquivo:', error);
    showToast('Erro ao excluir arquivo', 'error');
  }
}

// ============================================
// UI HELPERS
// ============================================

function updateProcessButton() {
  const btn = document.getElementById('process-ai-btn');
  const arquivosPendentes = arquivos.filter(a => a.status === 'pending' || a.status === 'error');

  if (arquivosPendentes.length > 0) {
    btn.disabled = false;
    btn.innerHTML = `🤖 Processar ${arquivosPendentes.length} arquivo(s) com IA`;
  } else if (arquivos.length > 0) {
    btn.disabled = true;
    btn.innerHTML = '✓ Todos os arquivos processados';
  } else {
    btn.disabled = true;
    btn.innerHTML = '🤖 Processar com IA';
  }
}

function showFilesLoading() {
  document.getElementById('files-loading').style.display = 'block';
  document.getElementById('files-empty').style.display = 'none';
  document.getElementById('files-list').style.display = 'none';
}

function showFilesEmpty() {
  document.getElementById('files-loading').style.display = 'none';
  document.getElementById('files-empty').style.display = 'block';
  document.getElementById('files-list').style.display = 'none';
}

function showFilesList() {
  document.getElementById('files-loading').style.display = 'none';
  document.getElementById('files-empty').style.display = 'none';
  document.getElementById('files-list').style.display = 'block';
}

function showLoadingOverlay(title, message) {
  document.getElementById('loading-overlay').style.display = 'flex';
  document.getElementById('loading-title').textContent = title;
  document.getElementById('loading-message').textContent = message;
  document.getElementById('progress-fill').style.width = '0%';
}

function hideLoadingOverlay() {
  document.getElementById('loading-overlay').style.display = 'none';
}

function updateProgress(percent) {
  document.getElementById('progress-fill').style.width = `${percent}%`;
}

function updateLoadingMessage(message) {
  document.getElementById('loading-message').textContent = message;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');

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

async function checkAuth() {
  const user = await getCurrentUser();
  if (!user) window.location.href = 'auth.html';
}
