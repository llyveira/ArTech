var express = require('express');
var router = express.Router();

let { Classrooms, Reservations, ReservationParticipants } = require("../models/rooms");

/* GET rooms apenas visual, ainda sem funcionalidade e integração com banco de dados s */
router.get('/', function(req, res, next) {
  res.render('rooms/index', { title: 'Reserva de Salas' });
});

module.exports = router;