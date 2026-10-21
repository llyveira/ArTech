var express = require('express');
var router = express.Router();

const sequelize = require('../config/database');
let MaterialRequest = require('../models/materialRequest');
let Materials = require('../models/materials');
const requestStatus = require('../models/requestStatus');
const materialStatus = require('../models/materialStatus');

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

// Data de hoje (fuso do servidor) no formato YYYY-MM-DD
function todayIso() {
  return new Date().toLocaleDateString('en-CA');
}

// Reserva atrasada: o material está emprestado e a data de devolução já passou.
// É calculado na hora, não existe como status no banco.
function isOverdue(request) {
  return request.status === requestStatus.EMPRESTADO &&
    !!request.dueDate &&
    request.dueDate < todayIso();
}

// Define quais ações são possíveis para cada status
function nextActions(status) {
  if (status === requestStatus.PENDENTE) return ['approve', 'reject'];
  if (status === requestStatus.APROVADO) return ['borrow'];
  if (status === requestStatus.EMPRESTADO) return ['return'];
  return [];
}

/* POST /requests — cria uma nova solicitação de empréstimo */
router.post('/', async (req, res) => {
  const form = req.body;

  try {
    const material = await Materials.findByPk(form.materialId);

    if (!material) {
      return res.status(404).send('Material não encontrado.');
    }

    // Só permite reservar material com estoque e em condição de uso.
    const bloqueadoPorStatus = [
      materialStatus.INDISPONIVEL,
      materialStatus.DEFEITO,
    ].includes(material.status);

    if (!material.available() || bloqueadoPorStatus) {
      return res.status(409).send('Este material não está disponível para reserva.');
    }

    // A devolução precisa ser uma data válida (YYYY-MM-DD) a partir de hoje.
    const devolucao = form.dataDevolucao || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(devolucao) || devolucao < todayIso()) {
      return res.status(400).send('Informe uma data de devolução válida, a partir de hoje.');
    }

    await MaterialRequest.create({
      materialId: material.id,
      materialName: material.name, // snapshot, não confia no que vier do form
      userId: req.session.userId,
      matricula: form.matricula,
      requesterName: form.nome,
      requesterEmail: form.email,
      requesterPhone: form.telefone,
      dueDate: devolucao,
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
      overdue: isOverdue(r),
    }));

    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar solicitações:', err);
    res.status(500).json({ error: 'Erro ao buscar solicitações.' });
  }
});

/* GET /requests/all — lista as solicitações de TODOS os usuários (JSON) */
router.get('/all', requireLevel(userLevel.PRO), async (req, res) => {
  try {
    const requests = await MaterialRequest.findAll({
      order: [['createdAt', 'DESC']],
    });

    const data = requests.map((r) => ({
      id: r.id,
      materialName: r.materialName,
      requesterName: r.requesterName,
      matricula: r.matricula,
      createdAt: r.createdAt,
      dataDevolucao: toBrDate(r.dueDate),
      status: r.status,
      overdue: isOverdue(r),
      actions: nextActions(r.status),
    }));

    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar todas as solicitações:', err);
    res.status(500).json({ error: 'Erro ao buscar solicitações.' });
  }
});

/* POST /requests/:id/cancel — cancela uma solicitação pendente do próprio usuário */
router.post('/:id/cancel', async (req, res) => {
  try {
    const request = await MaterialRequest.findByPk(req.params.id);

    if (!request) {
      return res.status(404).json({ error: 'Solicitação não encontrada.' });
    }

    // Garante que a pessoa só cancela as próprias solicitações.
    // (String nos dois lados: o id da sessão e o do banco podem ter tipos diferentes)
    if (String(request.userId) !== String(req.session.userId)) {
      return res.status(403).json({ error: 'Você não pode cancelar esta solicitação.' });
    }

    // Só dá para desistir antes da aprovação (nesse ponto o estoque ainda não foi usado).
    if (request.status !== requestStatus.PENDENTE) {
      return res.status(409).json({ error: 'Só é possível cancelar solicitações pendentes.' });
    }

    await request.cancel();
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao cancelar solicitação:', err);
    res.status(500).json({ error: 'Erro ao cancelar solicitação.' });
  }
});

/* POST /requests/:id/approve — aprova uma solicitação pendente e reserva 1 unidade do estoque */
router.post('/:id/approve', requireLevel(userLevel.PRO), async (req, res) => {
  try {
    const request = await MaterialRequest.findByPk(req.params.id);

    if (!request) {
      return res.status(404).json({ error: 'Solicitação não encontrada.' });
    }

    if (request.status !== requestStatus.PENDENTE) {
      return res.status(409).json({ error: 'Só é possível aprovar solicitações pendentes.' });
    }

    // Reserva, estoque e status do material mudam juntos: se um falhar, nenhum vale.
    const approved = await sequelize.transaction(async (t) => {
      const material = await Materials.unscoped().findByPk(request.materialId, { transaction: t });

      if (!material || !material.available() || material.status === materialStatus.DEFEITO) {
        return false;
      }

      // A reserva é atualizada ANTES, para o status do material já contá-la como aprovada.
      await request.approve({ transaction: t });
      await material.adjustQty(-1, { transaction: t });
      return true;
    });

    if (!approved) {
      return res.status(409).json({
        error: 'Este material não pode ser reservado agora (sem estoque ou com defeito).',
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao aprovar solicitação:', err);
    res.status(500).json({ error: 'Erro ao aprovar solicitação.' });
  }
});

/* POST /requests/:id/reject — recusa uma solicitação pendente (não mexe no estoque) */
router.post('/:id/reject', requireLevel(userLevel.PRO), async (req, res) => {
  try {
    const request = await MaterialRequest.findByPk(req.params.id);

    if (!request) {
      return res.status(404).json({ error: 'Solicitação não encontrada.' });
    }

    if (request.status !== requestStatus.PENDENTE) {
      return res.status(409).json({ error: 'Só é possível recusar solicitações pendentes.' });
    }

    await request.reject();
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao recusar solicitação:', err);
    res.status(500).json({ error: 'Erro ao recusar solicitação.' });
  }
});

/* POST /requests/:id/borrow — marca a retirada (o estoque já saiu na aprovação) */
router.post('/:id/borrow', requireLevel(userLevel.PRO), async (req, res) => {
  try {
    const request = await MaterialRequest.findByPk(req.params.id);

    if (!request) {
      return res.status(404).json({ error: 'Solicitação não encontrada.' });
    }

    if (request.status !== requestStatus.APROVADO) {
      return res.status(409).json({ error: 'Só é possível registrar a retirada de reservas aprovadas.' });
    }

    await sequelize.transaction(async (t) => {
      await request.markBorrowed({ transaction: t });

      // Estoque não muda, mas o status do material pode (reservado -> emprestado).
      const material = await Materials.unscoped().findByPk(request.materialId, { transaction: t });
      if (material) {
        await material.refreshStatus({ transaction: t });
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao registrar retirada:', err);
    res.status(500).json({ error: 'Erro ao registrar retirada.' });
  }
});

/* POST /requests/:id/return — marca a devolução e devolve 1 unidade ao estoque */
router.post('/:id/return', requireLevel(userLevel.PRO), async (req, res) => {
  try {
    const request = await MaterialRequest.findByPk(req.params.id);

    if (!request) {
      return res.status(404).json({ error: 'Solicitação não encontrada.' });
    }

    if (request.status !== requestStatus.EMPRESTADO) {
      return res.status(409).json({ error: 'Só é possível registrar a devolução de materiais emprestados.' });
    }

    await sequelize.transaction(async (t) => {
      await request.markReturned({ transaction: t });

      // unscoped: o estoque volta mesmo se o material estiver oculto por algum motivo
      const material = await Materials.unscoped().findByPk(request.materialId, { transaction: t });
      if (material) {
        await material.adjustQty(1, { transaction: t });
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao registrar devolução:', err);
    res.status(500).json({ error: 'Erro ao registrar devolução.' });
  }
});

module.exports = router;