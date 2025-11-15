// ============================================
// CLIENTE SUPABASE
// ============================================
// Inicializa o cliente Supabase uma única vez
// e exporta para uso em todo o app

const supabase = window.supabase.createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_ANON_KEY
);

console.log('✅ Supabase client inicializado');
