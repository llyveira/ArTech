var express = require('express');
var router = express.Router();

const Event = require('../models/events');
const { Reservations, Classrooms } = require('../models/rooms');
const { formatEvent } = require('./events'); // reaproveita a formatação dos eventos

/* GET home page: mostra somente os eventos aprovados. */
router.get('/', async function(req, res, next) {
  try {
    const eventos = await Event.findAll({
      where: { status: 'Aprovado' },
      include: [{
        model: Reservations,
        as: 'reservation',
        include: [{ model: Classrooms, as: 'classroom' }]
      }],
      order: [['date', 'ASC'], ['time', 'ASC']]
    });

    res.render('index', {
      title: 'Início',
      subtitle: 'Confira os próximos eventos do NUARTE.',
      eventos: eventos.map((e) => formatEvent(e, res.locals.currentUser)),
      quantidadeEventos: eventos.length
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
