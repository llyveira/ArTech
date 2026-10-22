var express = require('express');
var router = express.Router();

// Repassa erros de rotas assíncronas para o tratador de erros do Express
// (sem isso, um erro dentro de uma rota async derruba o servidor).
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const sequelize = require('../config/database');
const Event = require('../models/events');
const Users = require('../models/users');
const { Reservations, Classrooms } = require('../models/rooms');
const { Op } = require('sequelize');

/*
 * Fluxo de status do evento (e da reserva vinculada):
 *   Rascunho  -> reserva EDITING
 *   Solicitado -> reserva PENDING
 *   Aprovado  -> reserva APPROVED (feito por quem responde a solicitação)
 */
const RESERVATION_STATUS = {
  Rascunho: 'EDITING',
  Solicitado: 'PENDING',
  Aprovado: 'APPROVED'
};

function combineDateTime(date, time) {
  if (!date || !time) return null;
  const value = new Date(`${date}T${time}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}

function formatDate(date) {
  if (!date) return '';
  const value = new Date(`${date}T00:00:00`);
  return value.toLocaleDateString('pt-BR');
}

function pad(n) {
  return String(n).padStart(2, '0');
}

// Converte um Date em "YYYY-MM-DD" e "HH:MM" (valores dos inputs do formulário).
function toInputDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toInputTime(value) {
  if (!value) return '';
  const d = new Date(value);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "dd/mm/aaaa" (usado na tela de detalhes para as datas de entrada e saída)
function displayDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Nomes legíveis das categorias (o banco guarda o valor do select)
const CATEGORY_NAMES = {
  'oficinas-artisticas': 'Oficinas artísticas',
  'apresentacoes-culturais': 'Apresentações culturais',
  'ensaios': 'Ensaios',
  'exposicoes': 'Exposições',
  'reunioes': 'Reuniões',
  'projetos-culturais': 'Projetos culturais',
  'aulas-musicais': 'Aulas e atividades musicais',
  'palestras': 'Palestras'
};

// Nomes legíveis dos locais (o banco guarda o valor do select, ex: "nuarte")
const LOCATION_NAMES = {
  'nuarte': 'NUARTE',
  'biblioteca-ifrn': 'Biblioteca IFRN',
  'espaco-cultural': 'Espaço Cultural',
  'auditorio-ifrn': 'Auditório IFRN'
};

const RESERVATION_LABELS = {
  EDITING: 'Em edição',
  PENDING: 'Pendente',
  APPROVED: 'Aprovada',
  CANCELLED: 'Cancelada',
  FINISHED: 'Finalizada'
};

// Traz junto do evento: a reserva, a sala da reserva e quem criou o evento.
const eventIncludes = [
  {
    model: Reservations,
    as: 'reservation',
    include: [{ model: Classrooms, as: 'classroom' }]
  },
  { model: Users, as: 'creator', attributes: ['id', 'name'] }
];

// `user` é o usuário logado (res.locals.currentUser) ou null.
function formatEvent(event, user = null) {
  const data = event.toJSON ? event.toJSON() : event;
  const reservation = data.reservation || null;

  return {
    ...data,
    titulo: data.name,
    // Só usa a imagem se for um caminho válido (/uploads/... ou http...);
    // valores antigos (só o nome do arquivo) caem na imagem padrão.
    imagem: /^(\/|https?:)/.test(data.image || '') ? data.image : '/images/event-placeholder.svg',
    imagemUrl: data.image || '', // para preencher o campo de URL no editar
    descricao: data.description || '',
    data: formatDate(data.date),
    horario: data.time,
    local: data.location,
    vagas: data.vacancies,
    // Campos da tela de detalhes
    localNome: LOCATION_NAMES[data.location] || data.location,
    // Se o evento não tiver reserva vinculada, a entrada usa a data/hora do próprio evento
    dataEntrada: reservation ? displayDate(reservation.pickup) : formatDate(data.date),
    horaEntrada: reservation ? toInputTime(reservation.pickup) : data.time,
    dataSaida: reservation ? displayDate(reservation.return) : 'Não informada',
    horaSaida: reservation ? toInputTime(reservation.return) : 'Não informado',
    categoria: CATEGORY_NAMES[data.category] || 'Não informada',
    categoriaValor: data.category || '',
    criador: data.creator ? data.creator.name : '',
    finalidade: reservation ? reservation.purpose : '',
    statusReserva: reservation ? (RESERVATION_LABELS[reservation.status] || reservation.status) : '',
    sala: reservation && reservation.classroom
      ? `${reservation.classroom.number} - ${reservation.classroom.name}`
      : '',
    statusClass: String(data.status || 'Rascunho').toLowerCase(),
    // Regras da página de detalhes
    podeInscrever: data.status === 'Aprovado',
    podeEditar: data.status === 'Rascunho',
    podeSolicitar: data.status === 'Rascunho',
    // Só o criador exclui, e só enquanto for rascunho.
    // (evento sem dono, criado sem login, qualquer um pode excluir)
    podeExcluir: data.status === 'Rascunho' &&
      (!data.createdById || (!!user && user.id === data.createdById)),
    deleteAction: `/events/${data.id}/delete`,
    editAction: `/events/${data.id}/edit`,
    // Valores para preencher o formulário de edição
    form: {
      startDate: data.date,
      startTime: data.time,
      endDate: reservation ? toInputDate(reservation.return) : data.date,
      endTime: reservation ? toInputTime(reservation.return) : data.time,
      classroomId: reservation && reservation.classroomId ? reservation.classroomId : ''
    }
  };
}

/*
 * Lê e valida os campos do formulário (criar/editar).
 * Retorna { error } ou { values }.
 */
function parseEventForm(body) {
  const {
    name,
    description,
    category,
    image,
    reservation_start_date: startDate,
    reservation_start_time: startTime,
    reservation_end_date: endDate,
    reservation_end_time: endTime,
    reservation_location: location,
    reservation_spots: spots,
    reservation_purpose: purpose,
    classroomId
  } = body;

  if (!name || !startDate || !startTime || !endDate || !endTime || !location) {
    return { error: 'Preencha todos os campos obrigatórios do evento e da reserva.' };
  }

  const pickup = combineDateTime(startDate, startTime);
  const returnDate = combineDateTime(endDate, endTime);

  if (!pickup || !returnDate || returnDate <= pickup) {
    return { error: 'A data/horário de saída deve ser posterior à entrada.' };
  }

  let maxParticipants = null;
  if (spots && String(spots).trim().toLowerCase() !== 'livre') {
    maxParticipants = Number.parseInt(spots, 10);
    if (!Number.isInteger(maxParticipants) || maxParticipants < 1) {
      return { error: 'Informe uma quantidade de vagas válida ou use "Livre".' };
    }
  }

  // Imagem: opcional, mas se vier precisa ser uma URL http(s).
  const imageUrl = image ? String(image).trim() : '';
  if (imageUrl && !/^https?:\/\/\S+$/i.test(imageUrl)) {
    return { error: 'Informe uma URL de imagem válida (começando com http:// ou https://).' };
  }

  const parsedClassroom = Number.parseInt(classroomId, 10);

  return {
    values: {
      name,
      description: description || null,
      category: category || null,
      image: imageUrl || null,
      startDate,
      startTime,
      location,
      vacancies: spots || 'Livre',
      pickup,
      returnDate,
      maxParticipants,
      purpose: purpose || `Realização de evento: ${name}`,
      classroomId: Number.isInteger(parsedClassroom) ? parsedClassroom : null
    }
  };
}

/*
 * O botão clicado no formulário define o status:
 *   "Salvar"       (action=salvar) -> Rascunho
 *   "Criar Evento" (action=criar)  -> Solicitado
 */
function statusFromAction(action) {
  return action === 'salvar' ? 'Rascunho' : 'Solicitado';
}

/*
 * Lista os eventos: os aprovados (visíveis para todos) e, se houver
 * usuário logado, também os eventos criados por ele (rascunhos/solicitados).
 */
router.get('/', wrap(async function(req, res, next) {
  const user = res.locals.currentUser;

  const eventos = await Event.findAll({
    where: { status: { [Op.ne]: 'Excluído' } }, 
    include: eventIncludes,
    order: [['date', 'ASC'], ['time', 'ASC']]
  });

  res.render('events/index', {
    title: 'Eventos do NUARTE',
    subtitle: 'Gerencie os eventos realizados pelo NUARTE.',
    eventos: eventos.map((e) => formatEvent(e, user)),
    quantidadeEventos: eventos.length
  });
}));

/*
 * POST /events
 * Cria primeiro uma Reservation (já com o status correspondente) e depois
 * vincula essa reserva ao Event. O status do evento vem do botão clicado.
 */
router.post('/', wrap(async function(req, res, next) {
  const { error, values } = parseEventForm(req.body);
  if (error) return res.status(400).send(error);

  // Se houver usuário logado, o evento fica associado a ele; senão fica sem dono.
  // Pega o id do usuário pelo campo hidden "userID" do formulário.
  // Se estiver vazio (ninguém logado), o evento fica sem dono.
  const idDoForm = Number.parseInt(req.body.userID, 10);
  const userId = Number.isInteger(idDoForm) ? idDoForm : null;

  // Segurança: o hidden pode ser alterado no navegador (F12), então
  // confere se bate com o usuário realmente logado.
  const logado = res.locals.currentUser;
  if (userId !== (logado ? logado.id : null)) {
    return res.status(403).send('Usuário inválido.');
  }
  const status = statusFromAction(req.body.action);
  const transaction = await sequelize.transaction();

  try {
    const reservation = await Reservations.createForEvent({
      purpose: values.purpose,
      maxParticipants: values.maxParticipants,
      pickup: values.pickup,
      returnDate: values.returnDate,
      classroomId: values.classroomId,
      orderById: userId,
      status: RESERVATION_STATUS[status],
      transaction
    });

    const event = await Event.create({
      name: values.name,
      description: values.description,
      category: values.category,
      image: values.image,
      status,
      date: values.startDate,
      time: values.startTime,
      location: values.location,
      vacancies: values.vacancies,
      reservationId: reservation.id,
      createdById: userId
    }, { transaction });

    await transaction.commit();
    return res.redirect(`/events/${event.id}`);
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
}));

/* GET /events/:id - mostra um evento específico e a reserva vinculada. */
router.get('/:id', wrap(async function(req, res, next) {
  const user = res.locals.currentUser;
  const eventoBanco = await Event.findByPk(req.params.id, { include: eventIncludes });

    if (!eventoBanco || eventoBanco.status === 'Excluído') {
    return res.status(404).send('Evento não encontrado');
  }

  const evento = formatEvent(eventoBanco, user);
  res.render('events/show', {
    title: evento.titulo,
    evento,
    reserva: eventoBanco.reservation
  });
}));

/*
 * POST /events/:id/edit
 * Edita um evento em Rascunho (e a reserva vinculada).
 *   "Salvar"       -> continua Rascunho
 *   "Criar Evento" -> passa para Solicitado
 */
router.post('/:id/edit', wrap(async function(req, res, next) {
  const { error, values } = parseEventForm(req.body);
  if (error) return res.status(400).send(error);

  const transaction = await sequelize.transaction();

  try {
    const event = await Event.findByPk(req.params.id, {
      include: [{ model: Reservations, as: 'reservation' }],
      transaction
    });

    if (!event) {
      await transaction.rollback();
      return res.status(404).send('Evento não encontrado');
    }

    if (event.status !== 'Rascunho') {
      await transaction.rollback();
      return res.status(400).send('Só é possível editar eventos em Rascunho.');
    }

    const status = statusFromAction(req.body.action);

    Object.assign(event, {
      name: values.name,
      description: values.description,
      category: values.category,
      image: values.image, // campo vazio remove a imagem (volta para a padrão)
      date: values.startDate,
      time: values.startTime,
      location: values.location,
      vacancies: values.vacancies
    });

    const reservation = event.reservation;
    if (reservation) {
      reservation.purpose = values.purpose;
      reservation.maxParticipants = values.maxParticipants;
      reservation.pickup = values.pickup;
      reservation.return = values.returnDate;
      reservation.classroomId = values.classroomId;
      reservation.status = RESERVATION_STATUS[status];
      await reservation.save({ transaction });
    }

    event.status = status;
    await event.save({ transaction });

    await transaction.commit();
    return res.redirect(`/events/${event.id}`);
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
}));

/*
 * POST /events/:id/solicitar
 * Botão "Criar Evento" da página de detalhes:
 * Rascunho -> Solicitado (a reserva passa de EDITING para PENDING).
 */
router.post('/:id/solicitar', wrap(async function(req, res, next) {
  const transaction = await sequelize.transaction();

  try {
    const event = await Event.findByPk(req.params.id, {
      include: [{ model: Reservations, as: 'reservation' }],
      transaction
    });

    if (!event) {
      await transaction.rollback();
      return res.status(404).send('Evento não encontrado');
    }

    if (event.status !== 'Rascunho') {
      await transaction.rollback();
      return res.status(400).send('Só é possível solicitar um evento em Rascunho.');
    }

    // EDITING -> PENDING (mesma transição de Reservations.request(), dentro da transação)
    if (event.reservation) {
      event.reservation.status = RESERVATION_STATUS.Solicitado;
      await event.reservation.save({ transaction });
    }

    event.status = 'Solicitado';
    await event.save({ transaction });

    await transaction.commit();
    return res.redirect(`/events/${event.id}`);
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
}));

/* POST /events/:id/delete - exclusão lógica: marca como Excluído e cancela a reserva. */
router.post('/:id/delete', wrap(async function(req, res, next) {
  const user = res.locals.currentUser;
  const transaction = await sequelize.transaction();

  try {
    const event = await Event.findByPk(req.params.id, {
      include: [{ model: Reservations, as: 'reservation' }],
      transaction
    });

    if (!event || event.status === 'Excluído') {
      await transaction.rollback();
      return res.status(404).send('Evento não encontrado');
    }

    // Só rascunho pode ser excluído.
    if (event.status !== 'Rascunho') {
      await transaction.rollback();
      return res.status(403).send('Só é possível excluir eventos em rascunho.');
    }

    // Se o evento tem dono, só ele pode excluir.
    if (event.createdById && (!user || user.id !== event.createdById)) {
      await transaction.rollback();
      return res.status(403).send('Você não pode excluir este evento.');
    }

    // O evento não é apagado do banco: só recebe o status Excluído.
    event.status = 'Excluído';
    await event.save({ transaction });

    // Chama a função de cancelar do modelo de reservas.
    if (event.reservation) {
      await event.reservation.cancel({ transaction });
    }

    await transaction.commit();
    return res.redirect('/events');
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
}));

// A página inicial (routes/index.js) reutiliza o formatEvent.
router.formatEvent = formatEvent;

module.exports = router;
