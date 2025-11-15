// Atualizar apenas a função de processamento
// Substituir a chamada direta ao Gemini pela Edge Function

// ... (manter todo o código existente até a função processFile)

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

// Funções auxiliares que já devem existir no arquivo original
// Se não existirem, adicionar:

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
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 5000);
}
