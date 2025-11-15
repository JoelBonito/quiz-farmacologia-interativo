// ============================================
// MATÉRIAS
// ============================================

let currentUser = null;

// Verificar autenticação
async function checkAuth() {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (!user || error) {
    window.location.href = 'auth.html';
    return null;
  }

  return user;
}

// Carregar dados do usuário na sidebar
async function loadUserInfo(user) {
  const userName = user.user_metadata?.name || user.email.split('@')[0];
  document.getElementById('user-name').textContent = userName;
  document.getElementById('user-email').textContent = user.email;
}

// Carregar matérias
async function loadMaterias() {
  try {
    const { data: materias, error } = await supabase
      .from('materias')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const grid = document.getElementById('materias-grid');
    const emptyState = document.getElementById('empty-state');

    if (!materias || materias.length === 0) {
      grid.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    grid.style.display = 'grid';
    emptyState.style.display = 'none';

    grid.innerHTML = materias.map(materia => `
      <div class="stat-card" style="cursor: pointer; transition: transform 0.2s;" onclick="window.location.href='materia.html?id=${materia.id}'" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
        <div class="stat-icon" style="background: ${materia.cor || '#667eea'};">${materia.icone || '📚'}</div>
        <div class="stat-info">
          <h3 style="font-size: 18px; margin-bottom: 4px;">${materia.nome}</h3>
          <p style="font-size: 12px; color: #6b7280;">${materia.total_arquivos || 0} arquivos • ${materia.total_perguntas || 0} perguntas</p>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Erro ao carregar matérias:', error);
    alert('Erro ao carregar matérias');
  }
}

// Modal
const modal = document.getElementById('modal-nova-materia');
const novaMateriaBtns = [document.getElementById('nova-materia-btn'), document.getElementById('primeira-materia-btn')];
const cancelarBtn = document.getElementById('cancelar-btn');
const form = document.getElementById('form-nova-materia');

novaMateriaBtns.forEach(btn => {
  if (btn) {
    btn.addEventListener('click', () => {
      modal.style.display = 'flex';
    });
  }
});

cancelarBtn.addEventListener('click', () => {
  modal.style.display = 'none';
  form.reset();
});

modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.style.display = 'none';
    form.reset();
  }
});

// Criar matéria
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nome = document.getElementById('nome-materia').value.trim();
  const descricao = document.getElementById('descricao-materia').value.trim();

  try {
    const { data, error } = await supabase
      .from('materias')
      .insert([
        {
          user_id: currentUser.id,
          nome,
          descricao: descricao || null
        }
      ])
      .select();

    if (error) throw error;

    modal.style.display = 'none';
    form.reset();
    
    // Redirecionar para a matéria criada
    window.location.href = `materia.html?id=${data[0].id}`;

  } catch (error) {
    console.error('Erro ao criar matéria:', error);
    alert('Erro ao criar matéria: ' + error.message);
  }
});

// Configurações
document.getElementById('config-btn').addEventListener('click', (e) => {
  e.preventDefault();
  alert('Configurações em desenvolvimento!');
});

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
  currentUser = await checkAuth();
  if (currentUser) {
    await loadUserInfo(currentUser);
    await loadMaterias();
  }
})();