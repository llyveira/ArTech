const createError = require('http-errors');
const userLevel = require('../models/userLevel');

// Middleware de autorização: use assim em uma rota ou router inteiro:
//   router.use(requireLevel(userLevel.INTERNAL));
//
// Quem não tiver logado é tratado como EXTERNAL (nível mais baixo).
// Como os níveis são cumulativos (PRO vê tudo que INTERNAL vê, etc.),
// a checagem é simplesmente "o nível do usuário é >= o nível exigido?".
function requireLevel(minLevel) {
  return (req, res, next) => {
    const currentLevel = res.locals.currentUser
      ? res.locals.currentUser.profile
      : userLevel.EXTERNAL;

    if (currentLevel >= minLevel) {
      return next();
    }

    return next(createError(403, 'Você não tem permissão para acessar esta página.'));
  };
}

// Middleware de login: bloqueia quem não está logado e mostra a tela
// "Acesso restrito" (com botões de entrar/cadastrar) no lugar da página.
// Guarda a URL pedida (só GET) para voltar nela depois do login.
function requireLogin(req, res, next) {
  if (req.session && req.session.userId && res.locals.currentUser) {
    return next();
  }

  if (req.method === 'GET') {
    req.session.returnTo = req.originalUrl;
  }

  return res.status(401).render('login-required', {
    title: 'Acesso restrito',
    subtitle: 'Entre na sua conta para continuar.',
  });
}

module.exports = { requireLevel, requireLogin };