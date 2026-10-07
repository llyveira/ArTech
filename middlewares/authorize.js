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

module.exports = { requireLevel };