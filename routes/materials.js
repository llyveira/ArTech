var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('materials/index', { title: 'Página Materiais' });
});

router.get('/oi', function(req, res, next) {
  res.render('materials/oi', { title: 'Página do Oi' });
});

module.exports = router;
