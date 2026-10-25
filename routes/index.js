var express = require('express');
var router = express.Router();

/* GET página inicial: abre direto na página de eventos. */
router.get('/', function(req, res) {
  res.redirect('events');
});

module.exports = router;