const path = require('path');
const { Sequelize } = require('sequelize');
require('dotenv').config(); // Carrega as variáveis do arquivo .env

// Caminho do arquivo SQLite. Sem DB_STORAGE o Sequelize usaria um banco
// em memória (que some quando a aplicação fecha), então usamos um padrão
// fixo na raiz do projeto. path.resolve() também garante que o caminho
// não dependa da pasta de onde o "npm start" foi executado.
const storage = path.resolve(__dirname, '..', process.env.DB_STORAGE || 'database.sqlite');

const sequelize = new Sequelize({
   dialect: process.env.DB_DIALECT || 'sqlite', // Essa informação precisa ser explícita
   storage: storage
});

// Permite que esse objeto seja utilizado por outros arquivos
module.exports = sequelize;
