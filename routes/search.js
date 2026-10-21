var express = require('express');
var router = express.Router();
const { Op } = require('sequelize');

let Materials = require('../models/materials');
let Event = require('../models/events');
let Users = require('../models/users');
const { Classrooms } = require('../models/rooms');
const userLevel = require('../models/userLevel');

/* GET /search?q=termo — busca global */
router.get('/', async (req, res) => {
  const q = (req.query.q || '').trim();

  const results = { materials: [], events: [], rooms: [], users: [] };

  if (!q) {
    return res.json(results);
  }

  const currentLevel = res.locals.currentUser
    ? res.locals.currentUser.profile
    : userLevel.EXTERNAL;

  try {
    // Eventos: qualquer status
    const events = await Event.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${q}%` } },
          { location: { [Op.like]: `%${q}%` } },
        ],
      },
      limit: 5,
    });
    results.events = events.map((e) => ({
      id: e.id,
      title: e.name,
      subtitle: e.location,
      url: '/events',
    }));

    // Salas
    const rooms = await Classrooms.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${q}%` } },
          { number: { [Op.like]: `%${q}%` } },
        ],
      },
      limit: 5,
    });
    results.rooms = rooms.map((r) => ({
      id: r.id,
      title: r.name,
      subtitle: `Sala ${r.number}`,
      url: '/rooms',
    }));

    // Materiais: sem restrição de nível
    const materials = await Materials.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${q}%` } },
          { description: { [Op.like]: `%${q}%` } },
        ],
      },
      limit: 5,
    });
    results.materials = materials.map((m) => ({
      id: m.id,
      title: m.name,
      subtitle: m.description,
      url: `/materials?search=${encodeURIComponent(m.name)}`,
    }));

    // Usuários: mantive só COORDINATOR (veja a observação abaixo)
    if (currentLevel >= userLevel.COORDINATOR) {
      const users = await Users.findAll({
        where: {
          [Op.or]: [
            { name: { [Op.like]: `%${q}%` } },
            { email: { [Op.like]: `%${q}%` } },
          ],
        },
        limit: 5,
      });
      results.users = users.map((u) => ({
        id: u.id,
        title: u.name,
        subtitle: u.email,
        url: '#',
      }));
    }

    res.json(results);
  } catch (err) {
    console.error('Erro na busca global:', err);
    res.status(500).json({ error: 'Erro ao buscar.' });
  }
});

module.exports = router;