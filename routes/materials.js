var express = require('express');
var router = express.Router();
// Importação do modelo
let Materials = require("../models/materials");

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('materials/index', { title: 'Materiais do NUARTE', subtitle:'Consulte os materiais disponíveis no acervo do NUARTE.' });
});

router.get('/oi', function(req, res, next) {
  res.render('materials/oi', { title: 'Página do Oi' });
});

module.exports = router;