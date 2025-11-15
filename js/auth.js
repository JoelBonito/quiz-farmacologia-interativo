// ============================================
// AUTENTICAÇÃO
// ============================================

// DOM Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const resetForm = document.getElementById('reset-form');
const tabBtns = document.querySelectorAll('.tab-btn');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const cancelResetBtn = document.getElementById('cancel-reset-btn');
const resetModal = document.getElementById('reset-modal');
const loadingSpinner = document.getElementById('loading-spinner');
const messageContainer = document.getElementById('message-container');

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function showLoading(show) {
  loadingSpinner.style.display = show ? 'flex' : 'none';
}

function showMessage(message, type = 'info') {
  const messageEl = document.createElement('div');
  messageEl.className = `message message-${type}`;
  messageEl.textContent = message;
  messageContainer.appendChild(messageEl);

  setTimeout(() => {
    messageEl.remove();
  }, 5000);
}

function disableForm(formEl, disabled) {
  const inputs = formEl.querySelectorAll('input, button');
  inputs.forEach(input => input.disabled = disabled);
}

// ============================================
// TROCA DE ABAS
// ============================================

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetTab = btn.dataset.tab;

    // Atualizar botões
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Atualizar conteúdo
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${targetTab}-tab`).classList.add('active');
  });
});

// ============================================
// LOGIN
// ============================================

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  showLoading(true);
  disableForm(loginForm, true);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    showMessage('Login realizado com sucesso! Redirecionando...', 'success');
    
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);

  } catch (error) {
    console.error('Erro no login:', error);
    showMessage(error.message || 'Erro ao fazer login. Verifique suas credenciais.', 'error');
  } finally {
    showLoading(false);
    disableForm(loginForm, false);
  }
});

// ============================================
// REGISTRO
// ============================================

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const passwordConfirm = document.getElementById('register-password-confirm').value;

  // Validação
  if (password !== passwordConfirm) {
    showMessage('As senhas não coincidem!', 'error');
    return;
  }

  if (password.length < 6) {
    showMessage('A senha deve ter no mínimo 6 caracteres!', 'error');
    return;
  }

  showLoading(true);
  disableForm(registerForm, true);

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name
        }
      }
    });

    if (error) throw error;

    showMessage('Conta criada com sucesso! Redirecionando...', 'success');
    
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);

  } catch (error) {
    console.error('Erro no registro:', error);
    showMessage(error.message || 'Erro ao criar conta. Tente novamente.', 'error');
  } finally {
    showLoading(false);
    disableForm(registerForm, false);
  }
});

// ============================================
// RECUPERAÇÃO DE SENHA
// ============================================

forgotPasswordLink.addEventListener('click', (e) => {
  e.preventDefault();
  resetModal.style.display = 'flex';
});

cancelResetBtn.addEventListener('click', () => {
  resetModal.style.display = 'none';
  resetForm.reset();
});

resetForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('reset-email').value.trim();

  showLoading(true);
  disableForm(resetForm, true);

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password.html`
    });

    if (error) throw error;

    showMessage('Link de recuperação enviado! Verifique seu e-mail.', 'success');
    resetModal.style.display = 'none';
    resetForm.reset();

  } catch (error) {
    console.error('Erro ao recuperar senha:', error);
    showMessage(error.message || 'Erro ao enviar link de recuperação.', 'error');
  } finally {
    showLoading(false);
    disableForm(resetForm, false);
  }
});

// Fechar modal ao clicar fora
resetModal.addEventListener('click', (e) => {
  if (e.target === resetModal) {
    resetModal.style.display = 'none';
    resetForm.reset();
  }
});

// ============================================
// VERIFICAR SE JÁ ESTÁ LOGADO
// ============================================

(async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    window.location.href = 'dashboard.html';
  }
})();
