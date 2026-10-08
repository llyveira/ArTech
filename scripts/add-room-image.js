// Script de uso único: adiciona a coluna "image" (URL da imagem do card) na
// tabela "classrooms". O db.sync() do Sequelize NÃO altera tabelas que já
// existem, então sem este script o banco atual não terá a coluna nova.
//
// É seguro rodar mais de uma vez (só adiciona se a coluna ainda não existir).
//
// Como rodar (na raiz do projeto):
//   node scripts/add-room-image.js
//
// Opcional: já definir a imagem de uma sala (número da sala + URL):
//   node scripts/add-room-image.js 01 https://exemplo.com/cenografia.jpg

const sequelize = require('../config/database');

async function run() {
  const [cols] = await sequelize.query('PRAGMA table_info(classrooms);');

  if (cols.some((c) => c.name === 'image')) {
    console.log('A coluna "image" já existe em classrooms. Nada a fazer.');
  } else {
    await sequelize.query('ALTER TABLE classrooms ADD COLUMN image VARCHAR(2048);');
    console.log('Coluna "image" adicionada em classrooms.');
  }

  const [number, url] = process.argv.slice(2);
  if (number && url) {
    if (!/^https?:\/\/\S+$/i.test(url)) {
      throw new Error('A URL deve começar com http:// ou https://');
    }
    const [, meta] = await sequelize.query(
      'UPDATE classrooms SET image = ?, updatedAt = ? WHERE number = ?',
      { replacements: [url, new Date().toISOString(), number] }
    );
    console.log(`Sala ${number}: ${meta.changes || 0} registro(s) atualizado(s).`);
  }
}

run()
  .catch((err) => { console.error('Erro:', err.message); process.exitCode = 1; })
  .finally(() => sequelize.close());
