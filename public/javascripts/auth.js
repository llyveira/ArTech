function openLoginModal() {
  const modal = document.getElementById('loginModalOverlay');

  if (!modal) {
    console.error('Modal de login não encontrado.');
    return;
  }

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeLoginModal() {
  const modal = document.getElementById('loginModalOverlay');

  if (!modal) return;

  modal.classList.add('hidden');
  document.body.style.overflow = '';
}

function openRegisterModal() {
  const modal = document.getElementById('registerModalOverlay');

  if (!modal) {
    console.error('Modal de cadastro não encontrado.');
    return;
  }

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeRegisterModal() {
  const modal = document.getElementById('registerModalOverlay');

  if (!modal) return;

  modal.classList.add('hidden');
  document.body.style.overflow = '';
}

function togglePassword(inputId, button) {
  const input = document.getElementById(inputId);

  if (!input) return;

  if (input.type === 'password') {
    input.type = 'text';
    button.setAttribute('aria-label', 'Ocultar senha');
    button.innerHTML = '<i class="bi bi-eye-slash"></i>';
  } else {
    input.type = 'password';
    button.setAttribute('aria-label', 'Mostrar senha');
    button.innerHTML = '<i class="bi bi-eye"></i>';
  }
}

function logout() {
  const authButtons = document.getElementById('authButtons');
  const userCard = document.getElementById('userCard');

  if (authButtons) {
    authButtons.classList.remove('hidden');
  }

  if (userCard) {
    userCard.classList.add('hidden');
  }
}
document.addEventListener('DOMContentLoaded', () => {

  const loginModalOverlay = document.getElementById('loginModalOverlay');
  const registerModalOverlay = document.getElementById('registerModalOverlay');

  const openLoginButton = document.getElementById('openLoginButton');
  const openRegisterButton = document.getElementById('openRegisterButton');

  const closeLoginButton = document.getElementById('closeLoginButton');
  const closeRegisterButton = document.getElementById('closeRegisterButton');

  const openRegisterFromLogin = document.getElementById('openRegisterFromLogin');
  const openLoginFromRegister = document.getElementById('openLoginFromRegister');

  const logoutButton = document.getElementById('logoutButton');

  function openModal(modal) {
    if (!modal) return;

    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
  }


  function closeModal(modal) {
    if (!modal) return;

    modal.classList.add('hidden');

    // Limpa os campos do formulário desse modal, para que da próxima vez
    // que for aberto não venha com dados da tentativa anterior.
    modal.querySelector('form')?.reset();

    const loginClosed = loginModalOverlay?.classList.contains('hidden');
    const registerClosed = registerModalOverlay?.classList.contains('hidden');

    if (loginClosed && registerClosed) {
      document.body.classList.remove('modal-open');
    }
  }


  function closeAllModals() {
    closeModal(loginModalOverlay);
    closeModal(registerModalOverlay);
  }

  openLoginButton?.addEventListener('click', (event) => {
    event.preventDefault();

    closeModal(registerModalOverlay);
    openModal(loginModalOverlay);
  });


  openRegisterButton?.addEventListener('click', (event) => {
    event.preventDefault();

    closeModal(loginModalOverlay);
    openModal(registerModalOverlay);
  });


  closeLoginButton?.addEventListener('click', () => {
    closeModal(loginModalOverlay);
  });


  closeRegisterButton?.addEventListener('click', () => {
    closeModal(registerModalOverlay);
  });

  openRegisterFromLogin?.addEventListener('click', (event) => {
    event.preventDefault();

    closeModal(loginModalOverlay);
    openModal(registerModalOverlay);
  });


  openLoginFromRegister?.addEventListener('click', (event) => {
    event.preventDefault();

    closeModal(registerModalOverlay);
    openModal(loginModalOverlay);
  });

  loginModalOverlay?.addEventListener('click', (event) => {
    if (event.target === loginModalOverlay) {
      closeModal(loginModalOverlay);
    }
  });


  registerModalOverlay?.addEventListener('click', (event) => {
    if (event.target === registerModalOverlay) {
      closeModal(registerModalOverlay);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeAllModals();
    }
  });

  function configurePasswordToggle(buttonId, inputId) {
    const toggleButton = document.getElementById(buttonId);
    const passwordInput = document.getElementById(inputId);

    if (!toggleButton || !passwordInput) return;

    toggleButton.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';

      passwordInput.type = isPassword ? 'text' : 'password';

      const icon = toggleButton.querySelector('i');

      if (icon) {
        icon.classList.toggle('bi-eye', !isPassword);
        icon.classList.toggle('bi-eye-slash', isPassword);
      }

      toggleButton.setAttribute(
        'aria-label',
        isPassword ? 'Ocultar senha' : 'Mostrar senha'
      );
    });
  }

  configurePasswordToggle(
    'toggleLoginPassword',
    'password'
  );

  configurePasswordToggle(
    'toggleRegisterPassword',
    'registerPassword'
  );

  configurePasswordToggle(
    'toggleRegisterConfirmPassword',
    'registerConfirmPassword'
  );

  const forgotPasswordLink = document.getElementById('forgotPasswordLink');

  forgotPasswordLink?.addEventListener('click', (event) => {
    event.preventDefault();

    alert('A recuperação de senha será implementada posteriormente.');
  });


  logoutButton?.addEventListener('click', async (event) => {
    event.preventDefault();

    try {
      await fetch('/users/logout', { method: 'POST' });
    } catch (err) {
      console.error('Erro ao sair:', err);
    }

    window.location.href = '/';
  });

  // Abre o modal de login automaticamente quando a página carrega com
  // ?login=1 na URL (usado após o cadastro redirecionar para a home).
  const params = new URLSearchParams(window.location.search);

  if (params.get('login') === '1') {
    openModal(loginModalOverlay);

    // Remove o "?login=1" da URL sem recarregar a página, para que um
    // F5 depois não reabra o modal sozinho.
    const url = new URL(window.location.href);
    url.searchParams.delete('login');
    window.history.replaceState({}, '', url);
  }

});