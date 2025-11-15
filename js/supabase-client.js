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
