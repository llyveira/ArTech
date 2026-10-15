function abrirModalEvento(id) {
  document.getElementById(id).classList.remove('hidden');
}

function fecharModalEvento(id) {
  document.getElementById(id).classList.add('hidden');
}

function cadastrarEvento(event) {
  const form = event.target;
  const name = form.querySelector('[name="name"]').value.trim();
  const purpose = form.querySelector('#reservation_purpose');

  if (purpose && !purpose.value) {
    purpose.value = `Realização de evento: ${name}`;
  }

  return true;
}

/*
 * Página de detalhes: preenche o modal "Editar Evento" com os dados do evento
 * (lidos dos atributos data-* do botão "Editar") e depois abre o modal.
 */
function abrirModalEditarEvento(botao) {
  const form = document.querySelector('#modalEditarEvento form');
  const dados = botao.dataset;

  // Aponta o formulário para a rota de edição do evento clicado
  if (dados.action) form.action = dados.action;

  const campos = {
    name: dados.name,
    description: dados.description,
    category: dados.category,
    image: dados.image,
    reservation_start_date: dados.startDate,
    reservation_start_time: dados.startTime,
    reservation_end_date: dados.endDate,
    reservation_end_time: dados.endTime,
    reservation_location: dados.location,
    reservation_spots: dados.spots,
    classroomId: dados.classroomId
  };

  Object.entries(campos).forEach(([nome, valor]) => {
    const campo = form.querySelector(`[name="${nome}"]`);
    if (campo) campo.value = valor || '';
  });

  abrirModalEvento('modalEditarEvento');
}
function limparFiltros() {
  document.querySelectorAll('.filters-section select').forEach((select) => {
    select.selectedIndex = 0;
  });
}
