// ============================================
// CONFIGURAÇÕES DO APLICATIVO
// ============================================
// NOTA: Em produção (GitHub Pages), estas variáveis devem ser
// configuradas diretamente aqui, pois não há suporte a .env no frontend

const CONFIG = {
  // Supabase
  SUPABASE_URL: 'https://tpwkthafekcmhbcxvupd.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwd2t0aGFmZWtjbWhiY3h2dXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4MzQ0MzgsImV4cCI6MjA3ODQxMDQzOH0.wDhuSojrGSluGc0eU-Y9isqYtf2J8OtwIccAhiu1TWc',

  // Edge Functions
  EDGE_FUNCTION_PROCESS_GEMINI: 'https://tpwkthafekcmhbcxvupd.supabase.co/functions/v1/process-with-gemini',

  // Storage
  STORAGE_BUCKET: 'materias-arquivos',

  // Limites (para MVP sem limites, deixar valores altos)
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_FILES_PER_MATERIA: 100,
  ALLOWED_FILE_TYPES: [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ],
  ALLOWED_EXTENSIONS: ['pdf', 'txt', 'md', 'jpg', 'jpeg', 'png'],

  // IA
  MAX_QUESTIONS_PER_FILE: 50, // Quantas perguntas gerar por arquivo

  // UI
  DEFAULT_MATERIA_COLOR: '#3B82F6',
  DEFAULT_MATERIA_ICON: '📚',

  // Redirecionamentos
  REDIRECT_AFTER_LOGIN: '/dashboard.html',
  REDIRECT_AFTER_LOGOUT: '/auth.html'
};

// Validação
if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
  console.error('❌ Configurações do Supabase não encontradas!');
}

// Exportar configurações
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
