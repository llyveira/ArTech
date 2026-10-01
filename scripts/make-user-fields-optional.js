// Script de uso único: torna as colunas cpf, phone, ifrn_registration e
// ifrn_role OPCIONAIS na tabela "users" (removendo o NOT NULL delas).
//
// O SQLite não permite "ALTER COLUMN" para mudar NOT NULL diretamente,
// então a técnica padrão é: criar uma tabela nova com o schema certo,
// copiar os dados da tabela antiga, apagar a antiga, renomear a nova.
// Tudo dentro de uma transação, para não correr risco de perder dados
// no meio do caminho.
//
// Como rodar (na raiz do projeto):
//   node scripts/make-user-fields-optional.js

const sequelize = require('../config/database');

async function run() {
  const t = await sequelize.transaction();

  try {
    // 1. Cria a tabela nova, com o schema atualizado (cpf, phone,
    //    ifrn_registration e ifrn_role sem NOT NULL).
    await sequelize.query(
      `CREATE TABLE users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile INTEGER NOT NULL DEFAULT 0,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        cpf VARCHAR(255) UNIQUE,
        phone VARCHAR(255),
        ifrn_registration VARCHAR(255) UNIQUE,
        ifrn_role TEXT CHECK (ifrn_role IN ('student', 'staff', 'external')),
        actived TINYINT(1) NOT NULL DEFAULT 1,
        password VARCHAR(255) NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
      );`,
      { transaction: t }
    );

    // 2. Copia todos os dados da tabela antiga para a nova.
    await sequelize.query(
      `INSERT INTO users_new
        (id, profile, name, email, cpf, phone, ifrn_registration, ifrn_role, actived, password, createdAt, updatedAt)
       SELECT
        id, profile, name, email, cpf, phone, ifrn_registration, ifrn_role, actived, password, createdAt, updatedAt
       FROM users;`,
      { transaction: t }
    );

    // 3. Remove a tabela antiga.
    await sequelize.query(`DROP TABLE users;`, { transaction: t });

    // 4. Renomeia a nova para o nome definitivo.
    await sequelize.query(`ALTER TABLE users_new RENAME TO users;`, { transaction: t });

    await t.commit();
    console.log('Tabela "users" atualizada: cpf, phone, ifrn_registration e ifrn_role agora são opcionais!');
  } catch (err) {
    await t.rollback();
    console.error('Erro ao atualizar a tabela users:', err.message);
  } finally {
    await sequelize.close();
  }
}

run();