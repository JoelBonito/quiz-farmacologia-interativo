// ============================================
// AUTENTICAÇÃO - LÓGICA DA PÁGINA
// ============================================

// Elementos DOM
let loginForm, registerForm, resetForm;
let loginBtn, registerBtn;
let loadingSpinner, messageContainer;
let resetModal;

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', async () => {
  initializeElements();
  setupEventListeners();
  setupAuthListener();
  await checkIfAlreadyLoggedIn();
});

// ============================================
// INICIALIZAÇÃO
// ============================================

function initializeElements() {
  // Forms
  loginForm = document.getElementById('login-form');
  registerForm = document.getElementById('register-form');
  resetForm = document.getElementById('reset-form');

  // Buttons
  loginBtn = document.getElementById('login-btn');
  registerBtn = document.getElementById('register-btn');

  // UI Elements
  loadingSpinner = document.getElementById('loading-spinner');
  messageContainer = document.getElementById('message-container');
  resetModal = document.getElementById('reset-modal');
}

function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
  });

  // Forms
  loginForm.addEventListener('submit', handleLogin);
  registerForm.addEventListener('submit', handleRegister);
  resetForm.addEventListener('submit', handleResetPassword);

  // Password reset modal
  document.getElementById('forgot-password-link').addEventListener('click', (e) => {
    e.preventDefault();
    showResetModal();
  });

  document.getElementById('cancel-reset-btn').addEventListener('click', hideResetModal);

  // Click outside modal to close
  resetModal.addEventListener('click', (e) => {
    if (e.target === resetModal) hideResetModal();
  });
}

// ============================================
// TAB SWITCHING
// ============================================

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-tab`);
  });
}

// ============================================
// AUTHENTICATION HANDLERS
// ============================================

async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showMessage('Por favor, preencha todos os campos', 'error');
    return;
  }

  try {
    showLoading(true);
    loginBtn.disabled = true;

    const data = await signIn(email, password);

    showMessage('Login realizado com sucesso!', 'success');

    // Redirecionar para dashboard
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);

  } catch (error) {
    console.error('Erro no login:', error);

    let errorMessage = 'Erro ao fazer login. Verifique suas credenciais.';

    if (error.message.includes('Invalid login credentials')) {
      errorMessage = 'E-mail ou senha incorretos.';
    } else if (error.message.includes('Email not confirmed')) {
      errorMessage = 'Por favor, confirme seu e-mail antes de fazer login.';
    }

    showMessage(errorMessage, 'error');

  } finally {
    showLoading(false);
    loginBtn.disabled = false;
  }
}

async function handleRegister(e) {
  e.preventDefault();

  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const passwordConfirm = document.getElementById('register-password-confirm').value;

  // Validações
  if (!name || !email || !password || !passwordConfirm) {
    showMessage('Por favor, preencha todos os campos', 'error');
    return;
  }

  if (password.length < 6) {
    showMessage('A senha deve ter no mínimo 6 caracteres', 'error');
    return;
  }

  if (password !== passwordConfirm) {
    showMessage('As senhas não coincidem', 'error');
    return;
  }

  try {
    showLoading(true);
    registerBtn.disabled = true;

    const data = await signUp(email, password, { full_name: name });

    showMessage('Conta criada com sucesso! Verifique seu e-mail para confirmar.', 'success');

    // Limpar formulário
    registerForm.reset();

    // Trocar para tab de login após 2 segundos
    setTimeout(() => {
      switchTab('login');
    }, 2000);

  } catch (error) {
    console.error('Erro no registro:', error);

    let errorMessage = 'Erro ao criar conta. Tente novamente.';

    if (error.message.includes('already registered')) {
      errorMessage = 'Este e-mail já está cadastrado.';
    } else if (error.message.includes('Invalid email')) {
      errorMessage = 'E-mail inválido.';
    }

    showMessage(errorMessage, 'error');

  } finally {
    showLoading(false);
    registerBtn.disabled = false;
  }
}

async function handleResetPassword(e) {
  e.preventDefault();

  const email = document.getElementById('reset-email').value.trim();

  if (!email) {
    showMessage('Por favor, digite seu e-mail', 'error');
    return;
  }

  try {
    showLoading(true);

    await resetPassword(email);

    showMessage('E-mail de recuperação enviado! Verifique sua caixa de entrada.', 'success');

    hideResetModal();
    resetForm.reset();

  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    showMessage('Erro ao enviar e-mail de recuperação. Tente novamente.', 'error');

  } finally {
    showLoading(false);
  }
}

// ============================================
// VERIFICAR SE JÁ ESTÁ LOGADO
// ============================================

async function checkIfAlreadyLoggedIn() {
  try {
    const user = await getCurrentUser();

    if (user) {
      // Usuário já está logado, redirecionar
      window.location.href = 'dashboard.html';
    }
  } catch (error) {
    // Não está logado, tudo certo
    console.log('Usuário não autenticado');
  }
}

// ============================================
// UI HELPERS
// ============================================

function showLoading(show) {
  loadingSpinner.style.display = show ? 'flex' : 'none';
}

function showResetModal() {
  resetModal.style.display = 'flex';
}

function hideResetModal() {
  resetModal.style.display = 'none';
}

function showMessage(text, type = 'info') {
  const message = document.createElement('div');
  message.className = `message ${type}`;

  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';

  message.innerHTML = `
    <span class="message-icon">${icon}</span>
    <span class="message-text">${text}</span>
    <button class="message-close" onclick="this.parentElement.remove()">×</button>
  `;

  messageContainer.appendChild(message);

  // Auto-remover após 5 segundos
  setTimeout(() => {
    if (message.parentElement) {
      message.remove();
    }
  }, 5000);
}

// ============================================
// LISTENER DE ESTADO DE AUTENTICAÇÃO
// ============================================

function setupAuthListener() {
  onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session);

    if (event === 'SIGNED_IN') {
      // Redirecionar para dashboard após login
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 500);
    }
  });
}
