// ============================================
// GEMINI AI - PROCESSAMENTO E GERAÇÃO DE PERGUNTAS
// ============================================
// ATUALIZADO: Agora usa Edge Function do Supabase para chamar Gemini

// ============================================
// PROCESSAR ARQUIVO E GERAR PERGUNTAS
// ============================================

async function processFileWithGemini(arquivo, materiaId) {
  try {
    console.log(`Processando arquivo: ${arquivo.nome_original}`);

    // 1. Baixar arquivo do Supabase Storage
    const fileBlob = await downloadFile(arquivo.storage_path);

    // 2. Extrair texto do arquivo
    const file = new File([fileBlob], arquivo.nome_original, { type: `application/${arquivo.tipo}` });
    const texto = await extractTextFromFile(file);

    if (!texto || texto.trim().length < 50) {
      throw new Error('Não foi possível extrair texto suficiente do arquivo');
    }

    // 3. Atualizar status para 'processing'
    await updateArquivoStatus(arquivo.id, 'processing', texto);

    // 4. Gerar perguntas usando Edge Function
    const result = await processWithGemini(texto, arquivo.tipo, materiaId, arquivo.id);

    // 5. Atualizar status para 'processed'
    await updateArquivoStatus(arquivo.id, 'processed', texto);

    return {
      success: true,
      perguntasGeradas: result.perguntas || 0,
      flashcardsGerados: result.flashcards || 0
    };

  } catch (error) {
    console.error('Erro ao processar arquivo:', error);

    // Atualizar status para 'error'
    await updateArquivoStatus(arquivo.id, 'error', null, error.message);

    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================
// PROCESSAR COM GEMINI VIA EDGE FUNCTION
// ============================================

async function processWithGemini(fileContent, fileType, materiaId, arquivoId) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Obter token de acesso
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';

    console.log('Enviando para processamento com Gemini...');

    // Chamar Edge Function
    const response = await fetch(CONFIG.EDGE_FUNCTION_PROCESS_GEMINI, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        fileContent,
        fileType,
        materiaId,
        arquivoId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao processar com IA');
    }

    const data = await response.json();
    console.log('Processamento concluído:', data);
    return data;

  } catch (error) {
    console.error('Erro ao processar com IA:', error);
    throw error;
  }
}

// ============================================
// EXTRAIR TEXTO DO ARQUIVO
// ============================================

async function extractTextFromFile(file) {
  const fileType = file.name.split('.').pop().toLowerCase();

  try {
    switch (fileType) {
      case 'txt':
      case 'md':
        return await file.text();

      case 'pdf':
        return await extractTextFromPDF(file);

      case 'jpg':
      case 'jpeg':
      case 'png':
        // Para imagens, retornar base64 para a Edge Function processar
        return await fileToBase64(file);

      default:
        throw new Error(`Tipo de arquivo não suportado: ${fileType}`);
    }
  } catch (error) {
    console.error('Erro ao extrair texto:', error);
    throw error;
  }
}

// ============================================
// EXTRAIR TEXTO DE PDF USANDO PDF.JS
// ============================================

async function extractTextFromPDF(file) {
  try {
    // Carregar PDF.js se ainda não estiver carregado
    if (typeof pdfjsLib === 'undefined') {
      await loadPDFJS();
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n\n';
    }

    if (!fullText || fullText.trim().length === 0) {
      throw new Error('PDF não contém texto extraível');
    }

    return fullText;

  } catch (error) {
    console.error('Erro ao extrair texto do PDF:', error);
    throw new Error('Não foi possível extrair texto do PDF. Certifique-se de que o PDF contém texto (não apenas imagens).');
  }
}

// ============================================
// CARREGAR PDF.JS DINAMICAMENTE
// ============================================

function loadPDFJS() {
  return new Promise((resolve, reject) => {
    if (typeof pdfjsLib !== 'undefined') {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ============================================
// PROCESSAR MÚLTIPLOS ARQUIVOS
// ============================================

async function processMultipleFiles(arquivos, materiaId, onProgress) {
  const results = [];
  let totalPerguntas = 0;
  let totalFlashcards = 0;

  for (let i = 0; i < arquivos.length; i++) {
    const arquivo = arquivos[i];

    // Callback de progresso
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: arquivos.length,
        fileName: arquivo.nome_original
      });
    }

    const result = await processFileWithGemini(arquivo, materiaId);
    results.push(result);

    if (result.success) {
      totalPerguntas += result.perguntasGeradas || 0;
      totalFlashcards += result.flashcardsGerados || 0;
    }

    // Pequeno delay entre arquivos para não sobrecarregar a API
    await sleep(1000);
  }

  return {
    results,
    totalPerguntas,
    totalFlashcards,
    sucessos: results.filter(r => r.success).length,
    erros: results.filter(r => !r.success).length
  };
}

// ============================================
// GERAR RESUMO PERSONALIZADO (FASE 5)
// ============================================

async function generateResumoPersonalizado(materiaId, materiaNome = 'esta matéria') {
  try {
    console.log('🤖 Gerando resumo personalizado...');

    const user = await getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Obter dados das dificuldades
    const dados = await DificuldadesService.prepararDadosResumoPersonalizado(materiaId);

    if (!dados || dados.topicos.length === 0) {
      throw new Error('Nenhuma dificuldade encontrada para gerar resumo');
    }

    // Obter token de acesso
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';

    // Chamar Edge Function para gerar resumo
    const response = await fetch(CONFIG.EDGE_FUNCTION_PROCESS_GEMINI + '/resumo-personalizado', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        materiaId,
        materiaNome,
        dados
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao gerar resumo personalizado');
    }

    const result = await response.json();
    console.log('✅ Resumo personalizado gerado com sucesso!');

    return {
      resumo: result.resumo,
      dificuldadesIds: dados.topicos.map(t => t.id).filter(Boolean),
      topicos: dados.topicos.map(t => t.topico),
      totalDificuldades: dados.totalDificuldades
    };

  } catch (error) {
    console.error('❌ Erro ao gerar resumo personalizado:', error);
    throw new Error('Erro ao gerar resumo personalizado: ' + error.message);
  }
}

// ============================================
// UTILITÁRIOS
// ============================================

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getFileIcon(tipo) {
  const icons = {
    pdf: '📄',
    txt: '📝',
    md: '📋',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️'
  };
  return icons[tipo] || '📁';
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
