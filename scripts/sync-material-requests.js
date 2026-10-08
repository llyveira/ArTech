// Script para criar/sincronizar a tabela "material_requests" no banco SQLite
// Como rodar:
//   node scripts/sync-material-requests.js

const sequelize = require('../config/database');
const MaterialRequest = require('../models/materialRequest');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Conexão com o banco estabelecida com sucesso.');

    // Sincroniza o model criando a tabela caso não exista (ou atualizando colunas se necessário)
    await MaterialRequest.sync({ alter: true });
    console.log('Tabela "material_requests" criada/atualizada com sucesso!');

  } catch (err) {
    console.error('Erro ao sincronizar a tabela material_requests:', err.message);
  } finally {
    await sequelize.close();
  }
}

run();