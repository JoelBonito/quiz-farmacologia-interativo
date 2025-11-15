// ============================================
// CLIENTE SUPABASE
// ============================================
// Este arquivo inicializa o cliente Supabase e fornece
// funções utilitárias para interagir com o backend

// Importar Supabase (será carregado via CDN no HTML)
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

let supabase;

// Inicializar cliente Supabase
function initSupabase() {
  if (typeof supabase !== 'undefined') {
    return supabase; // Já inicializado
  }

  try {
    supabase = window.supabase.createClient(
      CONFIG.SUPABASE_URL,
      CONFIG.SUPABASE_ANON_KEY
    );
    console.log('✅ Supabase inicializado com sucesso');
    return supabase;
  } catch (error) {
    console.error('❌ Erro ao inicializar Supabase:', error);
    throw error;
  }
}

// ============================================
// AUTENTICAÇÃO
// ============================================

async function signUp(email, password, metadata = {}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  });

  if (error) throw error;
  return data;
}

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password.html`
  });
  if (error) throw error;
}

// Listener para mudanças de autenticação
function onAuthStateChange(callback) {
  // Garantir que o Supabase esteja inicializado
  if (!supabase) {
    initSupabase();
  }
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

// ============================================
// MATÉRIAS
// ============================================

async function createMateria(nome, descricao = '', cor = null, icone = null) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('materias')
    .insert([{
      user_id: user.id,
      nome,
      descricao,
      cor: cor || CONFIG.DEFAULT_MATERIA_COLOR,
      icone: icone || CONFIG.DEFAULT_MATERIA_ICON
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getMaterias() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('materias')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

async function getMateria(materiaId) {
  const { data, error } = await supabase
    .from('materias')
    .select('*')
    .eq('id', materiaId)
    .single();

  if (error) throw error;
  return data;
}

async function updateMateria(materiaId, updates) {
  const { data, error } = await supabase
    .from('materias')
    .update(updates)
    .eq('id', materiaId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function deleteMateria(materiaId) {
  const { error } = await supabase
    .from('materias')
    .delete()
    .eq('id', materiaId);

  if (error) throw error;
}

// ============================================
// ARQUIVOS
// ============================================

async function uploadFile(materiaId, file) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  // Gerar nome único para o arquivo
  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${materiaId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

  // Upload para Supabase Storage
  const { data: storageData, error: storageError } = await supabase.storage
    .from(CONFIG.STORAGE_BUCKET)
    .upload(fileName, file);

  if (storageError) throw storageError;

  // Salvar metadados no banco
  const { data, error } = await supabase
    .from('arquivos')
    .insert([{
      materia_id: materiaId,
      nome_original: file.name,
      tipo: fileExt.toLowerCase(),
      tamanho: file.size,
      storage_path: storageData.path,
      status: 'pending'
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getArquivos(materiaId) {
  const { data, error } = await supabase
    .from('arquivos')
    .select('*')
    .eq('materia_id', materiaId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

async function deleteArquivo(arquivoId, storagePath) {
  // Deletar do storage
  const { error: storageError } = await supabase.storage
    .from(CONFIG.STORAGE_BUCKET)
    .remove([storagePath]);

  if (storageError) console.warn('Erro ao deletar arquivo do storage:', storageError);

  // Deletar do banco
  const { error } = await supabase
    .from('arquivos')
    .delete()
    .eq('id', arquivoId);

  if (error) throw error;
}

async function updateArquivoStatus(arquivoId, status, conteudoExtraido = null, erroMensagem = null) {
  const updates = { status };
  if (conteudoExtraido) updates.conteudo_extraido = conteudoExtraido;
  if (erroMensagem) updates.erro_mensagem = erroMensagem;

  const { data, error } = await supabase
    .from('arquivos')
    .update(updates)
    .eq('id', arquivoId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getFileUrl(storagePath) {
  const { data } = await supabase.storage
    .from(CONFIG.STORAGE_BUCKET)
    .createSignedUrl(storagePath, 3600); // URL válida por 1 hora

  return data?.signedUrl;
}

async function downloadFile(storagePath) {
  const { data, error } = await supabase.storage
    .from(CONFIG.STORAGE_BUCKET)
    .download(storagePath);

  if (error) throw error;
  return data;
}

// ============================================
// PERGUNTAS
// ============================================

async function createPergunta(perguntaData) {
  const { data, error } = await supabase
    .from('perguntas')
    .insert([perguntaData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function createPerguntas(perguntasArray) {
  const { data, error } = await supabase
    .from('perguntas')
    .insert(perguntasArray)
    .select();

  if (error) throw error;
  return data;
}

async function getPerguntas(materiaId, filters = {}) {
  let query = supabase
    .from('perguntas')
    .select('*')
    .eq('materia_id', materiaId);

  // Aplicar filtros opcionais
  if (filters.tipo) query = query.eq('tipo', filters.tipo);
  if (filters.dificuldade) query = query.eq('dificuldade', filters.dificuldade);
  if (filters.arquivoId) query = query.eq('arquivo_id', filters.arquivoId);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

async function getPergunta(perguntaId) {
  const { data, error } = await supabase
    .from('perguntas')
    .select('*')
    .eq('id', perguntaId)
    .single();

  if (error) throw error;
  return data;
}

async function deletePergunta(perguntaId) {
  const { error } = await supabase
    .from('perguntas')
    .delete()
    .eq('id', perguntaId);

  if (error) throw error;
}

// ============================================
// PROGRESSO DO USUÁRIO
// ============================================

async function saveProgresso(perguntaId, acertou, tempoResposta = null) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('progresso_usuario')
    .insert([{
      user_id: user.id,
      pergunta_id: perguntaId,
      acertou,
      tempo_resposta: tempoResposta
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getProgresso(materiaId = null) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  let query = supabase
    .from('progresso_usuario')
    .select('*, perguntas(*)')
    .eq('user_id', user.id);

  if (materiaId) {
    query = query.eq('perguntas.materia_id', materiaId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// ============================================
// UTILITÁRIOS
// ============================================

function showError(message, error = null) {
  console.error(message, error);
  alert(message + (error ? `\n\nDetalhes: ${error.message}` : ''));
}

function showSuccess(message) {
  console.log('✅', message);
  // Você pode implementar toast notifications aqui
}

// Verificar se usuário está autenticado
async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = '/auth.html';
    return false;
  }
  return true;
}

// ============================================
// DIFICULDADES DO ALUNO (FASE 1)
// ============================================

async function createDificuldade(dificuldadeData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('dificuldades_aluno')
    .insert([{
      user_id: user.id,
      ...dificuldadeData
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getDificuldades(materiaId, options = {}) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  let query = supabase
    .from('dificuldades_aluno')
    .select('*')
    .eq('user_id', user.id)
    .eq('materia_id', materiaId);

  // Filtros opcionais
  if (options.resolvido !== undefined) {
    query = query.eq('resolvido', options.resolvido);
  }
  if (options.tipoOrigem) {
    query = query.eq('tipo_origem', options.tipoOrigem);
  }
  if (options.topico) {
    query = query.eq('topico', options.topico);
  }

  // Ordenar por nível de dificuldade e data
  query = query.order('nivel_dificuldade', { ascending: false })
               .order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

async function getDificuldadesAgrupadas(materiaId) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .rpc('get_dificuldades_stats', {
      p_user_id: user.id,
      p_materia_id: materiaId
    });

  if (error) throw error;
  return data;
}

async function incrementarDificuldade(materiaId, topico, tipoOrigem, detalhes = {}) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .rpc('incrementar_dificuldade', {
      p_user_id: user.id,
      p_materia_id: materiaId,
      p_topico: topico,
      p_tipo_origem: tipoOrigem
    });

  if (error) throw error;

  // Se forneceu detalhes adicionais, atualizar o registro
  if (data && Object.keys(detalhes).length > 0) {
    await supabase
      .from('dificuldades_aluno')
      .update(detalhes)
      .eq('id', data);
  }

  return data;
}

async function resolverDificuldade(dificuldadeId) {
  const { error } = await supabase
    .rpc('resolver_dificuldade', {
      p_dificuldade_id: dificuldadeId
    });

  if (error) throw error;
}

async function updateDificuldade(dificuldadeId, updates) {
  const { data, error } = await supabase
    .from('dificuldades_aluno')
    .update(updates)
    .eq('id', dificuldadeId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// RESUMOS
// ============================================

async function createResumo(resumoData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('resumos')
    .insert([{
      user_id: resumoData.tipo === 'personalizado' ? user.id : null,
      ...resumoData
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getResumos(materiaId, tipo = null) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  let query = supabase
    .from('resumos')
    .select('*')
    .eq('materia_id', materiaId);

  if (tipo) {
    query = query.eq('tipo', tipo);
  } else {
    // Buscar resumos gerais ou personalizados do usuário
    query = query.or(`user_id.is.null,user_id.eq.${user.id}`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

async function getResumo(resumoId) {
  const { data, error } = await supabase
    .from('resumos')
    .select('*')
    .eq('id', resumoId)
    .single();

  if (error) throw error;
  return data;
}

async function updateResumo(resumoId, updates) {
  const { data, error } = await supabase
    .from('resumos')
    .update(updates)
    .eq('id', resumoId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function deleteResumo(resumoId) {
  const { error } = await supabase
    .from('resumos')
    .delete()
    .eq('id', resumoId);

  if (error) throw error;
}

// ============================================
// MARCAÇÕES DE RESUMOS
// ============================================

async function createMarcacao(resumoId, marcacaoData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('resumos_marcacoes')
    .insert([{
      user_id: user.id,
      resumo_id: resumoId,
      ...marcacaoData
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getMarcacoes(resumoId) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('resumos_marcacoes')
    .select('*')
    .eq('user_id', user.id)
    .eq('resumo_id', resumoId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

async function deleteMarcacao(marcacaoId) {
  const { error } = await supabase
    .from('resumos_marcacoes')
    .delete()
    .eq('id', marcacaoId);

  if (error) throw error;
}

// ============================================
// FLASHCARDS
// ============================================

async function createFlashcard(flashcardData) {
  const { data, error } = await supabase
    .from('flashcards')
    .insert([flashcardData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function createFlashcards(flashcardsArray) {
  const { data, error } = await supabase
    .from('flashcards')
    .insert(flashcardsArray)
    .select();

  if (error) throw error;
  return data;
}

async function getFlashcards(materiaId, filters = {}) {
  let query = supabase
    .from('flashcards')
    .select('*')
    .eq('materia_id', materiaId);

  if (filters.topico) query = query.eq('topico', filters.topico);
  if (filters.dificuldade) query = query.eq('dificuldade', filters.dificuldade);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

async function getFlashcard(flashcardId) {
  const { data, error } = await supabase
    .from('flashcards')
    .select('*')
    .eq('id', flashcardId)
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// SESSÕES DE FLASHCARDS
// ============================================

async function createFlashcardSessao(materiaId) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('flashcards_sessoes')
    .insert([{
      user_id: user.id,
      materia_id: materiaId
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateFlashcardSessao(sessaoId, updates) {
  const { data, error } = await supabase
    .from('flashcards_sessoes')
    .update(updates)
    .eq('id', sessaoId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function finalizarFlashcardSessao(sessaoId, stats) {
  const { data, error } = await supabase
    .from('flashcards_sessoes')
    .update({
      fim: new Date().toISOString(),
      ...stats
    })
    .eq('id', sessaoId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// PROGRESSO DE FLASHCARDS
// ============================================

async function saveFlashcardProgresso(flashcardId, sessaoId, resposta, tempoResposta = null) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('flashcards_progresso')
    .insert([{
      user_id: user.id,
      flashcard_id: flashcardId,
      sessao_id: sessaoId,
      resposta,
      tempo_resposta: tempoResposta
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getFlashcardProgresso(flashcardId) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('flashcards_progresso')
    .select('*')
    .eq('user_id', user.id)
    .eq('flashcard_id', flashcardId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Auto-inicializar quando o script carregar
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    try {
      initSupabase();
    } catch (error) {
      console.error('Erro ao inicializar Supabase:', error);
    }
  });
}
