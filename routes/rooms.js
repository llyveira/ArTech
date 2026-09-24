var express = require('express');
var router = express.Router();

let { Classrooms, Reservations, ReservationParticipants } = require("../models/rooms");

// PENDÊNCIA: ainda não existe sessão de login (ver routes/users.js), então toda
// reserva é gravada em nome deste usuário fixo. Quando a autenticação existir,
// troque por algo como req.session.userId.
const USUARIO_PADRAO_ID = 1;

// Fuso de Santa Cruz/RN (UTC-3, sem horário de verão). Assim as datas do
// formulário são interpretadas sempre no mesmo fuso, em qualquer servidor.
const FUSO = '-03:00';
const FUSO_EM_HORAS = -3;

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const STATUS = {
  EDITING:   { label: 'Em edição',  css: 'pendente' },
  PENDING:   { label: 'Pendente',   css: 'pendente' },
  APPROVED:  { label: 'Confirmada', css: 'confirmada' },
  CANCELLED: { label: 'Cancelada',  css: 'cancelada' },
  FINISHED:  { label: 'Finalizada', css: 'cancelada' },
};

// Converte um Date (UTC no banco) para as partes de data/hora no fuso local.
function partesLocais(date) {
  const d = new Date(date.getTime() + FUSO_EM_HORAS * 60 * 60 * 1000);
  return {
    diaSemana: DIAS_SEMANA[d.getUTCDay()],
    dia: d.getUTCDate(),
    mes: MESES[d.getUTCMonth()],
    hora: d.getUTCHours(),
    minuto: d.getUTCMinutes(),
  };
}

// 14:00 -> "14h" | 09:30 -> "9h30"
function formatarHora(p) {
  return p.hora + 'h' + (p.minuto ? String(p.minuto).padStart(2, '0') : '');
}

// Transforma uma reserva do banco no objeto simples que a view usa.
function paraView(reserva) {
  const ini = partesLocais(reserva.pickup);
  const fim = partesLocais(reserva.return);
  const status = STATUS[reserva.status] || STATUS.PENDING;

  return {
    id: reserva.id,
    sala: reserva.classroom ? reserva.classroom.name : 'Sala removida',
    horario: `${ini.diaSemana}, ${ini.dia} de ${ini.mes} · ${formatarHora(ini)} às ${formatarHora(fim)}`,
    statusTexto: status.label,
    statusClass: status.css,
    podeCancelar: reserva.status !== 'CANCELLED' && reserva.status !== 'FINISHED',
  };
}

/* GET /rooms - tela de salas + minhas reservas (lidas do banco) */
router.get('/', async function (req, res, next) {
  try {
    const salas = await Classrooms.findAllRooms();

    const reservas = await Reservations.findAll({
      where: { orderById: USUARIO_PADRAO_ID },
      include: [{ model: Classrooms, as: 'classroom' }],
      order: [['createdAt', 'DESC']],
    });

    res.render('rooms/index', {
      title: 'Reserva de Salas',
      subtitle: 'Consulte a disponibilidade das salas, solicite sua reserva e acompanhe tudo em um só lugar.',
      salas: salas.map((s) => s.get({ plain: true })),
      reservas: reservas.map(paraView),
      totalReservas: reservas.length + (reservas.length === 1 ? ' reserva' : ' reservas'),
    });
  } catch (err) {
    next(err);
  }
});

/* POST /rooms - recebe o formulário do modal "Nova Reserva de Sala" e salva no banco */
router.post('/', async function (req, res) {
  const form = req.body;

  try {
    const sala = await Classrooms.findByPk(form.sala);
    if (!sala) {
      return res.status(400).send('Sala inválida.');
    }

    // Junta data + horário do formulário (ex.: "2026-09-25" + "14:00")
    const pickup = new Date(`${form.date}T${form.startTime}:00${FUSO}`);
    const returnDate = new Date(`${form.date}T${form.endTime}:00${FUSO}`);

    if (isNaN(pickup.getTime()) || isNaN(returnDate.getTime())) {
      return res.status(400).send('Data ou horário inválido.');
    }

    // Verifica se a sala já está ocupada nesse período
    const livre = await sala.available(pickup, returnDate);
    if (!livre) {
      return res.status(409).send('Esta sala já está reservada nesse horário.');
    }

    await Reservations.create({
      orderById: USUARIO_PADRAO_ID,
      classroomId: sala.id,
      purpose: form.purpose,
      maxParticipants: parseInt(form.participants, 10),
      notes: form.notes || null,
      pickup: pickup,
      return: returnDate,
      status: 'PENDING', // aguardando aprovação
    });

    // Volta para a tela já na aba "Minhas reservas"
    res.redirect('/rooms?tab=reservas');

  } catch (err) {
    console.error('Erro ao criar reserva:', err);

    if (err.name === 'SequelizeValidationError') {
      return res.status(400).send(err.errors.map((e) => e.message).join(' '));
    }
    res.status(500).send('Erro interno ao criar reserva.');
  }
});

/* POST /rooms/:id/cancel - cancela uma reserva (status passa para CANCELLED) */
router.post('/:id/cancel', async function (req, res) {
  try {
    const reserva = await Reservations.findByPk(req.params.id);
    if (!reserva) {
      return res.status(404).send('Reserva não encontrada.');
    }

    await reserva.cancel();
    res.redirect('/rooms?tab=reservas');

  } catch (err) {
    console.error('Erro ao cancelar reserva:', err);
    res.status(400).send(err.message);
  }
});

module.exports = router;
