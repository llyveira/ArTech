var express = require('express');
var router = express.Router();

let MaterialRequest = require('../models/materialRequest');
let Materials = require('../models/materials');

// Autorização: mesmo nível exigido para ver/usar Materiais.
const { requireLevel } = require('../middlewares/authorize');
const userLevel = require('../models/userLevel');
router.use(requireLevel(userLevel.INTERNAL));

// Converte "YYYY-MM-DD" (formato que o DATEONLY do Sequelize retorna)
// para "DD/MM/YYYY" (formato que a tela já exibia no exemplo estático).
function toBrDate(isoDate) {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

/* POST /requests — cria uma nova solicitação de empréstimo */
router.post('/', async (req, res) => {
  const form = req.body;

  try {
    const material = await Materials.findByPk(form.materialId);

    if (!material) {
      return res.status(404).send('Material não encontrado.');
    }

    await MaterialRequest.create({
      materialId: material.id,
      materialName: material.name, // snapshot, não confia no que vier do form
      userId: req.session.userId,
      matricula: form.matricula,
      requesterName: form.nome,
      requesterEmail: form.email,
      requesterPhone: form.telefone,
      dueDate: form.dataDevolucao,
    });

    res.redirect('/materials');
  } catch (err) {
    console.error('Erro ao criar solicitação:', err);
    res.status(400).send(err.message);
  }
});

/* GET /requests/my-requests — lista as solicitações do usuário logado (JSON) */
router.get('/my-requests', async (req, res) => {
  try {
    const requests = await MaterialRequest.forUser(req.session.userId);

    const data = requests.map((r) => ({
      id: r.id,
      materialName: r.materialName,
      matricula: r.matricula,
      createdAt: r.createdAt,
      dataDevolucao: toBrDate(r.dueDate),
      status: r.status,
    }));

    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar solicitações:', err);
    res.status(500).json({ error: 'Erro ao buscar solicitações.' });
  }
});

/* POST /requests/:id/cancel — cancela uma solicitação do próprio usuário */
router.post('/:id/cancel', async (req, res) => {
  try {
    const request = await MaterialRequest.findByPk(req.params.id);

    if (!request) {
      return res.status(404).json({ error: 'Solicitação não encontrada.' });
    }

    // Garante que a pessoa só cancela as próprias solicitações.
    if (request.userId !== req.session.userId) {
      return res.status(403).json({ error: 'Você não pode cancelar esta solicitação.' });
    }

    await request.cancel();
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao cancelar solicitação:', err);
    res.status(500).json({ error: 'Erro ao cancelar solicitação.' });
  }
});

module.exports = router;