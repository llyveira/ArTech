var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('events/index', {title: 'Eventos do NUARTE', subtitle:'Gerencie os eventos realizados pelo NUARTE.'});
});

module.exports = router;
