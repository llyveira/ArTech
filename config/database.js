const { Sequelize } = require('sequelize');
require('dotenv').config(); // Carrega as variáveis do arquivo .env

const sequelize = new Sequelize({
   dialect: process.env.DB_DIALECT || 'sqlite', // Essa informação precisa ser explícita
   storage: process.env.DB_STORAGE // Lê do arquivo .env
});

// Permite que esse objeto seja utilizado por outros arquivos
module.exports = sequelize;
