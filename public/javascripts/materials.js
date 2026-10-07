// --- Funções Globais (Acessíveis pelo HTML onclick) ---

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

function openMaterialModal() {
  const modal = document.getElementById('materialModalOverlay');
  if (!modal) {
    console.error('Modal de material não encontrado.');
    return;
  }
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  document.body.classList.add('modal-open');
}

function closeMaterialModal() {
  const modal = document.getElementById('materialModalOverlay');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.querySelector('form')?.reset();
  document.body.style.overflow = '';
  document.body.classList.remove('modal-open');
}

function openViewMaterialModal(data) {
  const modal = document.getElementById('viewMaterialModalOverlay');
  if (!modal) return;

  document.getElementById('viewModalName').textContent = data.name || 'N/A';
  document.getElementById('viewModalCategory').textContent = data.category || 'N/A';
  document.getElementById('viewModalQty').textContent = data.qty || '0';
  document.getElementById('viewModalDescription').textContent = data.description || 'Nenhuma descrição fornecida.';
  document.getElementById('viewModalNotes').textContent = data.notes || 'Nenhuma observação.';

  const photoImg = document.getElementById('viewModalPhoto');
  const photoContainer = document.getElementById('viewModalPhotoContainer');
  
  if (data.photo) {
    photoImg.src = data.photo;
    if (photoContainer) photoContainer.style.display = '';
  } else {
    photoImg.src = '/images/sem-foto.jpg';
  }

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  document.body.classList.add('modal-open');
}

function closeViewMaterialModal() {
  const modal = document.getElementById('viewMaterialModalOverlay');
  if (!modal) return;

  modal.classList.add('hidden');
  document.body.style.overflow = '';
  document.body.classList.remove('modal-open');
}

function solicitarMaterialPopup() {
  closeViewMaterialModal();
  const requestModal = document.getElementById('requestMaterialModalOverlay');
  if (requestModal) {
    requestModal.classList.remove('hidden');
  }
}

function closeRequestModal() {
  const requestModal = document.getElementById('requestMaterialModalOverlay');
  if (requestModal) {
    requestModal.classList.add('hidden');
  }
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

  if (authButtons) authButtons.classList.remove('hidden');
  if (userCard) userCard.classList.add('hidden');
}

function switchView(mode) {
  const cardBtn = document.getElementById('viewCardBtn');
  const tableBtn = document.getElementById('viewTableBtn');
  const cardGrid = document.querySelector('.grid');
  const tableView = document.getElementById('tableView');

  if (mode === 'card') {
    cardBtn?.classList.add('active');
    tableBtn?.classList.remove('active');
    if (cardGrid) cardGrid.classList.remove('hidden');
    if (tableView) tableView.classList.add('hidden');
  } else {
    tableBtn?.classList.add('active');
    cardBtn?.classList.remove('active');
    if (cardGrid) cardGrid.classList.add('hidden');
    if (tableView) tableView.classList.remove('hidden');
  }
}

async function fetchUserRequests() {
  try {
    const response = await fetch('/api/my-requests'); 
    const requests = await response.json();
    
    const tbody = document.getElementById('myRequestsTableBody');
    const badge = document.getElementById('requestsCountBadge');
    
    if (!tbody) return;

    tbody.innerHTML = '';
    if (badge) badge.textContent = `${requests.length} itens`;

    if (requests.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Você ainda não possui nenhuma reserva.</td></tr>`;
      return;
    }

    requests.forEach(req => {
      tbody.innerHTML += `
        <tr>
          <td class="table-name">${req.materialName}</td>
          <td>${req.matricula}</td>
          <td>${new Date(req.createdAt).toLocaleDateString('pt-BR')}</td>
          <td>${req.dataDevolucao}</td>
          <td><span class="tag tag-emprestado">${req.status}</span></td>
          <td class="text-right">
            <button class="btn-outline btn-sm" onclick="cancelRequest('${req.id}')">Cancelar</button>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('Erro ao carregar reservas:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {

  const loginModalOverlay = document.getElementById('loginModalOverlay');
  const registerModalOverlay = document.getElementById('registerModalOverlay');
  const materialModalOverlay = document.getElementById('materialModalOverlay');
  const viewMaterialModalOverlay = document.getElementById('viewMaterialModalOverlay');

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
    modal.querySelector('form')?.reset();

    const loginClosed = loginModalOverlay?.classList.contains('hidden');
    const registerClosed = registerModalOverlay?.classList.contains('hidden');
    const materialClosed = materialModalOverlay?.classList.contains('hidden');
    const viewMaterialClosed = viewMaterialModalOverlay?.classList.contains('hidden');

    if (loginClosed && registerClosed && materialClosed && viewMaterialClosed) {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    }
  }

  function closeAllModals() {
    closeModal(loginModalOverlay);
    closeModal(registerModalOverlay);
    closeModal(materialModalOverlay);
    closeModal(viewMaterialModalOverlay);
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

  closeLoginButton?.addEventListener('click', () => closeModal(loginModalOverlay));
  closeRegisterButton?.addEventListener('click', () => closeModal(registerModalOverlay));

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
    if (event.target === loginModalOverlay) closeModal(loginModalOverlay);
  });

  registerModalOverlay?.addEventListener('click', (event) => {
    if (event.target === registerModalOverlay) closeModal(registerModalOverlay);
  });

  materialModalOverlay?.addEventListener('click', (event) => {
    if (event.target === materialModalOverlay) closeModal(materialModalOverlay);
  });

  viewMaterialModalOverlay?.addEventListener('click', (event) => {
    if (event.target === viewMaterialModalOverlay) closeModal(viewMaterialModalOverlay);
  });

  document.querySelectorAll('.btn-view-material').forEach(button => {
    button.addEventListener('click', () => {
      const materialData = {
        name: button.getAttribute('data-name'),
        category: button.getAttribute('data-category'),
        qty: button.getAttribute('data-qty'),
        description: button.getAttribute('data-description'),
        notes: button.getAttribute('data-notes'),
        photo: button.getAttribute('data-photo')
      };
      openViewMaterialModal(materialData);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAllModals();
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

      toggleButton.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Mostrar senha');
    });
  }

  configurePasswordToggle('toggleLoginPassword', 'password');
  configurePasswordToggle('toggleRegisterPassword', 'registerPassword');
  configurePasswordToggle('toggleRegisterConfirmPassword', 'registerConfirmPassword');

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

  const params = new URLSearchParams(window.location.search);
  if (params.get('login') === '1') {
    openModal(loginModalOverlay);
    const url = new URL(window.location.href);
    url.searchParams.delete('login');
    window.history.replaceState({}, '', url);
  }

  // --- Lógica de Alternância: Minhas Reservas <-> Painel Principal ---
  const btnMyRequests = document.querySelector('.controls button:nth-child(3)'); 
  const mainMaterialsPanel = document.querySelector('.main > .panel:nth-child(2)'); 
  const myRequestsSection = document.getElementById('myRequestsSection');
  const backToMaterialsBtn = document.getElementById('backToMaterialsBtn');

  btnMyRequests?.addEventListener('click', () => {
    if (mainMaterialsPanel) mainMaterialsPanel.classList.add('hidden');
    if (myRequestsSection) myRequestsSection.classList.remove('hidden');
    fetchUserRequests();
  });

  backToMaterialsBtn?.addEventListener('click', () => {
    if (myRequestsSection) myRequestsSection.classList.add('hidden');
    if (mainMaterialsPanel) mainMaterialsPanel.classList.remove('hidden');
  });

});