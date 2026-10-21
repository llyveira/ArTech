require('dotenv').config();
const sequelize = require('../config/database');
const Materials = require('../models/materials');

(async () => {
  try {
    const materials = await Materials.unscoped().findAll();

    for (const material of materials) {
      const antigo = material.status;
      const novo = await material.computeStatus(material.qty);

      if (novo !== antigo) {
        await material.update({ status: novo });
        console.log(`${material.name}: ${antigo} -> ${novo}`);
      }
    }

    console.log('Status recalculados.');
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await sequelize.close();
  }
})();