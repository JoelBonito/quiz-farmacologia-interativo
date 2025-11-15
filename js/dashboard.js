// ============================================
// DASHBOARD
// ============================================

// Verificar autenticação
async function checkAuth() {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (!user || error) {
    window.location.href = 'auth.html';
    return null;
  }

  return user;
}

// Carregar dados do usuário
async function loadUserData(user) {
  // Atualizar informações do usuário
  const userName = user.user_metadata?.name || user.email.split('@')[0];
  document.getElementById('user-name').textContent = userName;
  document.getElementById('user-email').textContent = user.email;

  // Carregar estatísticas
  await loadStats(user.id);
}

// Carregar estatísticas
async function loadStats(userId) {
  try {
    // Contar matérias
    const { count: materiasCount } = await supabase
      .from('materias')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    document.getElementById('total-materias').textContent = materiasCount || 0;

    // Contar perguntas (através das matérias do usuário)
    const { data: materias } = await supabase
      .from('materias')
      .select('id')
      .eq('user_id', userId);

    if (materias && materias.length > 0) {
      const materiaIds = materias.map(m => m.id);
      
      const { count: perguntasCount } = await supabase
        .from('perguntas')
        .select('*', { count: 'exact', head: true })
        .in('materia_id', materiaIds);

      document.getElementById('total-perguntas').textContent = perguntasCount || 0;

      // Contar acertos
      const { data: progresso } = await supabase
        .from('progresso_usuario')
        .select('acertou')
        .eq('user_id', userId);

      if (progresso) {
        const acertos = progresso.filter(p => p.acertou).length;
        const total = progresso.length;
        const taxaAcerto = total > 0 ? Math.round((acertos / total) * 100) : 0;

        document.getElementById('total-acertos').textContent = acertos;
        document.getElementById('taxa-acerto').textContent = `${taxaAcerto}%`;
      }
    }
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
  }
}

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Erro ao fazer logout:', error);
    alert('Erro ao fazer logout');
  } else {
    window.location.href = 'auth.html';
  }
});

// Inicializar
(async () => {
  const user = await checkAuth();
  if (user) {
    await loadUserData(user);
  }
})();
