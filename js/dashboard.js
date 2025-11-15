// ============================================
// DASHBOARD - LÓGICA DA PÁGINA
// ============================================

let materias = [];
let materiaToDelete = null;

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  setupEventListeners();
  await loadMaterias();
});

// ============================================
// AUTENTICAÇÃO
// ============================================

async function checkAuth() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      window.location.href = 'auth.html';
      return;
    }

    // Exibir e-mail do usuário
    document.getElementById('user-email').textContent = user.email;

  } catch (error) {
    console.error('Erro ao verificar autenticação:', error);
    window.location.href = 'auth.html';
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  // Logout
  document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
      await signOut();
      window.location.href = 'auth.html';
    } catch (error) {
      showToast('Erro ao sair', 'error');
    }
  });

  // Novo matéria
  document.getElementById('new-materia-btn').addEventListener('click', showNewMateriaModal);

  // Form nova matéria
  document.getElementById('new-materia-form').addEventListener('submit', handleCreateMateria);

  // Click fora do modal fecha
  document.getElementById('new-materia-modal').addEventListener('click', (e) => {
    if (e.target.id === 'new-materia-modal') hideNewMateriaModal();
  });

  document.getElementById('delete-modal').addEventListener('click', (e) => {
    if (e.target.id === 'delete-modal') hideDeleteModal();
  });
}

// ============================================
// CARREGAR MATÉRIAS
// ============================================

async function loadMaterias() {
  try {
    showLoadingState();

    materias = await getMaterias();

    if (materias.length === 0) {
      showEmptyState();
    } else {
      showMateriasGrid();
      renderMaterias();
      updateStats();
    }

  } catch (error) {
    console.error('Erro ao carregar matérias:', error);
    showToast('Erro ao carregar matérias', 'error');
    showEmptyState();
  }
}

function renderMaterias() {
  const grid = document.getElementById('materias-grid');
  grid.innerHTML = '';

  materias.forEach(materia => {
    const card = createMateriaCard(materia);
    grid.appendChild(card);
  });
}

function createMateriaCard(materia) {
  const card = document.createElement('div');
  card.className = 'materia-card';
  card.style.setProperty('--materia-color', materia.cor);

  card.innerHTML = `
    <div class="materia-header">
      <div class="materia-icon">${materia.icone}</div>
      <div class="materia-menu">
        <button class="menu-btn" onclick="toggleMenu(event, '${materia.id}')">⋮</button>
        <div class="menu-dropdown" id="menu-${materia.id}">
          <button class="menu-item" onclick="editMateria('${materia.id}')">✏️ Editar</button>
          <button class="menu-item danger" onclick="confirmDeleteMateria('${materia.id}')">🗑️ Excluir</button>
        </div>
      </div>
    </div>

    <div class="materia-body">
      <h3>${materia.nome}</h3>
      ${materia.descricao ? `<p class="materia-description">${materia.descricao}</p>` : ''}

      <div class="materia-stats">
        <div class="stat-item">
          📄 <span>${materia.total_arquivos || 0}</span> arquivos
        </div>
        <div class="stat-item">
          ❓ <span>${materia.total_perguntas || 0}</span> perguntas
        </div>
      </div>

      <div class="materia-actions">
        <button class="btn btn-outline btn-sm" onclick="goToMateria('${materia.id}')">
          Gerenciar
        </button>
        <button class="btn btn-primary btn-sm" onclick="startQuiz('${materia.id}')" ${materia.total_perguntas === 0 ? 'disabled' : ''}>
          Iniciar Quiz
        </button>
      </div>
    </div>
  `;

  return card;
}

// ============================================
// ESTATÍSTICAS
// ============================================

function updateStats() {
  const totalArquivos = materias.reduce((sum, m) => sum + (m.total_arquivos || 0), 0);
  const totalPerguntas = materias.reduce((sum, m) => sum + (m.total_perguntas || 0), 0);

  document.getElementById('total-materias').textContent = materias.length;
  document.getElementById('total-arquivos').textContent = totalArquivos;
  document.getElementById('total-perguntas').textContent = totalPerguntas;
}

// ============================================
// CRIAR MATÉRIA
// ============================================

function showNewMateriaModal() {
  document.getElementById('new-materia-modal').style.display = 'flex';
  document.getElementById('materia-nome').focus();
}

function hideNewMateriaModal() {
  document.getElementById('new-materia-modal').style.display = 'none';
  document.getElementById('new-materia-form').reset();
}

async function handleCreateMateria(e) {
  e.preventDefault();

  const nome = document.getElementById('materia-nome').value.trim();
  const descricao = document.getElementById('materia-descricao').value.trim();
  const icone = document.getElementById('materia-icone').value;
  const cor = document.getElementById('materia-cor').value;

  if (!nome) {
    showToast('Por favor, preencha o nome da matéria', 'error');
    return;
  }

  try {
    const btn = document.getElementById('create-materia-btn');
    btn.disabled = true;
    btn.textContent = 'Criando...';

    const novaMateria = await createMateria(nome, descricao, cor, icone);

    showToast('Matéria criada com sucesso!', 'success');
    hideNewMateriaModal();

    // Recarregar matérias
    await loadMaterias();

    // Redirecionar para a página da matéria
    setTimeout(() => {
      goToMateria(novaMateria.id);
    }, 500);

  } catch (error) {
    console.error('Erro ao criar matéria:', error);
    showToast('Erro ao criar matéria. Tente novamente.', 'error');

  } finally {
    const btn = document.getElementById('create-materia-btn');
    btn.disabled = false;
    btn.textContent = 'Criar Matéria';
  }
}

// ============================================
// AÇÕES DA MATÉRIA
// ============================================

function toggleMenu(event, materiaId) {
  event.stopPropagation();

  // Fechar todos os menus
  document.querySelectorAll('.menu-dropdown').forEach(menu => {
    if (menu.id !== `menu-${materiaId}`) {
      menu.classList.remove('show');
    }
  });

  // Toggle do menu clicado
  const menu = document.getElementById(`menu-${materiaId}`);
  menu.classList.toggle('show');
}

// Fechar menus ao clicar fora
document.addEventListener('click', () => {
  document.querySelectorAll('.menu-dropdown').forEach(menu => {
    menu.classList.remove('show');
  });
});

function goToMateria(materiaId) {
  window.location.href = `materia.html?id=${materiaId}`;
}

function startQuiz(materiaId) {
  window.location.href = `quiz.html?materia=${materiaId}`;
}

function editMateria(materiaId) {
  // TODO: Implementar edição inline ou modal
  showToast('Funcionalidade em desenvolvimento', 'warning');
}

function confirmDeleteMateria(materiaId) {
  materiaToDelete = materiaId;
  document.getElementById('delete-modal').style.display = 'flex';

  const confirmBtn = document.getElementById('confirm-delete-btn');
  confirmBtn.onclick = () => handleDeleteMateria(materiaId);
}

function hideDeleteModal() {
  document.getElementById('delete-modal').style.display = 'none';
  materiaToDelete = null;
}

async function handleDeleteMateria(materiaId) {
  try {
    const btn = document.getElementById('confirm-delete-btn');
    btn.disabled = true;
    btn.textContent = 'Excluindo...';

    await deleteMateria(materiaId);

    showToast('Matéria excluída com sucesso', 'success');
    hideDeleteModal();

    // Recarregar matérias
    await loadMaterias();

  } catch (error) {
    console.error('Erro ao excluir matéria:', error);
    showToast('Erro ao excluir matéria', 'error');

  } finally {
    const btn = document.getElementById('confirm-delete-btn');
    btn.disabled = false;
    btn.textContent = 'Excluir';
  }
}

// ============================================
// UI STATES
// ============================================

function showLoadingState() {
  document.getElementById('loading-state').style.display = 'block';
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('materias-grid').style.display = 'none';
}

function showEmptyState() {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('empty-state').style.display = 'block';
  document.getElementById('materias-grid').style.display = 'none';

  // Zerar stats
  document.getElementById('total-materias').textContent = '0';
  document.getElementById('total-arquivos').textContent = '0';
  document.getElementById('total-perguntas').textContent = '0';
}

function showMateriasGrid() {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('materias-grid').style.display = 'grid';
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

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

  // Auto-remover após 4 segundos
  setTimeout(() => {
    toast.remove();
  }, 4000);
}
