require('dotenv').config();
const sequelize = require('../config/database');

(async () => {
  try {
    await sequelize.query(
      'ALTER TABLE materials ADD COLUMN isDeleted TINYINT(1) NOT NULL DEFAULT 0;'
    );
    console.log('Coluna isDeleted criada.');
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await sequelize.close();
  }
})();