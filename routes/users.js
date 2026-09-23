var express = require('express');
var router = express.Router();

// Importação do modelo
let Users = require('../models/Users');

/* GET listagem de usuários (uso administrativo). */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});

/* GET tela de login */
router.get('/login', function (req, res, next) {
  res.render('users/login', {
    title: 'Login'
  });
});

/* POST autenticação (login) */
router.post('/login', async (req, res) => {
  const form = req.body;

  try {
    const user = await Users.login(
      form.login,
      form.password
    );

    if (!user) {
      return res.status(401).send('E-mail ou senha inválidos.');
    }

    // PENDÊNCIA: criação da sessão/token de autenticação

    res.redirect('/');

  } catch (err) {
    console.error('Erro ao realizar login:', err);

    res.status(500).send('Erro interno ao realizar login.');
  }
});

/* GET tela de cadastro interno */
router.get('/register', function (req, res, next) {
  res.render('users/register', {
    title: 'Criar conta'
  });
});

/* POST cadastro interno */
router.post('/register', async (req, res) => {
  const form = req.body;

  // Verifica se as senhas são iguais
  if (form.password !== form.confirmPassword) {
    return res.status(400).send('As senhas não coincidem.');
  }

  try {
    await Users.register({
      name: form.name,
      email: form.email,
      ifrn_registration: form.registration,
      password: form.password
    });

    res.redirect('/users/login');

  } catch (err) {
    console.error('Erro ao cadastrar usuário:', err);

    res.status(400).send(err.message);
  }
});

module.exports = router;