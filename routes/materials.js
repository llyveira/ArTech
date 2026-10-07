var express = require('express');
var router = express.Router();
// Importação do modelo
let Materials = require("../models/materials");

// Autorização: Materiais exige nível INTERNAL ou superior (ver regra em
// models/userLevel.js). Aplicado a todas as rotas deste router.
const { requireLevel } = require('../middlewares/authorize');
const userLevel = require('../models/userLevel');
router.use(requireLevel(userLevel.INTERNAL));

/* GET materials listing. */
router.get('/', async function(req, res, next) {
  let materials = await Materials.findAll();
  res.render('materials/index', {
    title: 'Materiais do NUARTE',
    subtitle: 'Consulte os materiais disponíveis no acervo do NUARTE.',
    dados: materials
  });
});

/* POST create material */
router.post('/', async (req, res) => {
  let form = req.body;
  try {
    await Materials.create({
      name: form.name,
      description: form.description,
      qty: form.qty,
      notes: form.notes,
      photo: form.photo || null,
      category: form.category
      // ATUALIZADO (Passo 3): form.category agora é salvo, pois o model
      // Materials já tem a coluna "category" (ENUM) desde o Passo 2.
    });
    res.redirect('/materials');
  } catch (err) {
    res.status(400).send(err.message);
  }
});

module.exports = router;