// Script de uso único: muda o nível de acesso (profile) de um usuário,
// buscando por e-mail.
//
// Como rodar (na raiz do projeto):
//   node scripts/set-user-level.js seu.email@exemplo.com 2
//
// O segundo argumento é o nível (ver models/userLevel.js):
//   0 = EXTERNAL, 1 = INTERNAL, 2 = PRO, 3 = COORDINATOR

const sequelize = require('../config/database');
const Users = require('../models/users');
const userLevel = require('../models/userLevel');

async function run() {
  const email = process.argv[2];
  const level = Number(process.argv[3]);

  if (!email || Number.isNaN(level)) {
    console.error('Uso: node scripts/set-user-level.js <email> <nivel 0-3>');
    process.exit(1);
  }

  if (!Object.values(userLevel).includes(level)) {
    console.error('Nível inválido. Use 0 (EXTERNAL), 1 (INTERNAL), 2 (PRO) ou 3 (COORDINATOR).');
    process.exit(1);
  }

  try {
    const user = await Users.findOne({ where: { email } });

    if (!user) {
      console.error(`Nenhum usuário encontrado com o e-mail "${email}".`);
      return;
    }

    await user.changeRole(level);
    console.log(`Usuário "${user.name}" (${email}) agora tem nível ${level}.`);
  } catch (err) {
    console.error('Erro ao mudar o nível do usuário:', err.message);
  } finally {
    await sequelize.close();
  }
}

run();