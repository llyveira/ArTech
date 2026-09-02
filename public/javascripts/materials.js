// Lógica do modal de cadastro (usado por Novo Material, e reaproveitável
// para outros formulários em modal como Eventos e Reservas).

function openMaterialModal() {
  document.getElementById('materialModalOverlay').classList.remove('hidden');
}

function closeMaterialModal() {
  document.getElementById('materialModalOverlay').classList.add('hidden');
}