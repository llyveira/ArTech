var express = require('express');
var router = express.Router();

// Importação do modelo
let Users = require('../models/users');

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

    // Cria a sessão: a partir daqui, o middleware no app.js vai reconhecer
    // esse usuário como logado em todas as páginas seguintes.
    req.session.userId = user.id;

    // Se o usuário foi barrado numa página restrita (ex.: /rooms), volta pra ela.
    const destino = req.session.returnTo || '/';
    delete req.session.returnTo;

    res.redirect(destino);

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
      // ATUALIZADO: matrícula é opcional. Se vier vazia (""), convertemos
      // para null — senão duas strings vazias seriam tratadas como
      // "matrículas duplicadas" pela constraint unique.
      ifrn_registration: form.registration ? form.registration : null,
      password: form.password
    });

    // Redireciona para a home com um sinalizador na URL, que o auth.js
    // usa para abrir o modal de login automaticamente (em vez de mandar
    // para a página separada /users/login).
    res.redirect('/?login=1');

  } catch (err) {
    console.error('Erro ao cadastrar usuário:', err);

    res.status(400).send(err.message);
  }
});

/* POST logout */
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;