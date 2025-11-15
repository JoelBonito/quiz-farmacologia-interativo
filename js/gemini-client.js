// ============================================
// CLIENTE GEMINI (VIA EDGE FUNCTION)
// ============================================
// Processa arquivos com Gemini através de Edge Function no Supabase
// A API key fica segura no backend

/**
 * Processa um arquivo com Gemini AI via Edge Function
 * @param {string} fileContent - Conteúdo extraído do arquivo
 * @param {string} fileType - Tipo do arquivo (pdf, txt, etc)
 * @param {string} materiaId - ID da matéria
 * @param {string} arquivoId - ID do arquivo no banco
 * @returns {Promise<Object>} Resultado do processamento
 */
async function processWithGemini(fileContent, fileType, materiaId, arquivoId) {
  try {
    // Pegar token de autenticação
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('Usuário não autenticado')
    }

    console.log('Enviando para processamento com Gemini...')

    // Chamar Edge Function
    const response = await fetch(CONFIG.EDGE_FUNCTION_PROCESS_GEMINI, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        fileContent,
        fileType,
        materiaId,
        arquivoId
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Erro ao processar com Gemini')
    }

    const result = await response.json()
    console.log('Processamento concluído:', result)
    
    return result

  } catch (error) {
    console.error('Erro no processamento Gemini:', error)
    throw error
  }
}

/**
 * Extrai texto de diferentes tipos de arquivo
 * @param {File} file - Arquivo a ser processado
 * @returns {Promise<string>} Texto extraído
 */
async function extractTextFromFile(file) {
  const fileType = file.name.split('.').pop().toLowerCase()

  try {
    switch (fileType) {
      case 'txt':
      case 'md':
        return await file.text()

      case 'pdf':
        // Para PDF, vamos usar uma biblioteca cliente
        // Por enquanto, retornar placeholder
        return await extractTextFromPDF(file)

      case 'jpg':
      case 'jpeg':
      case 'png':
        // Para imagens, converter para base64
        return await fileToBase64(file)

      default:
        throw new Error(`Tipo de arquivo não suportado: ${fileType}`)
    }
  } catch (error) {
    console.error('Erro ao extrair texto:', error)
    throw error
  }
}

/**
 * Extrai texto de PDF usando PDF.js
 * @param {File} file - Arquivo PDF
 * @returns {Promise<string>} Texto extraído
 */
async function extractTextFromPDF(file) {
  // Carregar PDF.js se ainda não estiver carregado
  if (typeof pdfjsLib === 'undefined') {
    await loadPDFJS()
  }

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  
  let fullText = ''
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items.map(item => item.str).join(' ')
    fullText += pageText + '\n\n'
  }
  
  return fullText
}

/**
 * Carrega a biblioteca PDF.js dinamicamente
 */
function loadPDFJS() {
  return new Promise((resolve, reject) => {
    if (typeof pdfjsLib !== 'undefined') {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.onload = () => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      resolve()
    }
    script.onerror = reject
    document.head.appendChild(script)
  })
}

/**
 * Converte arquivo para base64
 * @param {File} file - Arquivo
 * @returns {Promise<string>} String base64
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
