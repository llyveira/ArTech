var express = require('express');
var express = require('express');
var router = express.Router();
// Importação do modelo
let Users = require("../models/users");

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

module.exports = router;