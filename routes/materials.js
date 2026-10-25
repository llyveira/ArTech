var express = require("express");
var router = express.Router();
// Importação do modelo
let Materials = require("../models/materials");
let MaterialRequest = require("../models/materialRequest");
let materialCategory = require("../models/materialCategory");
const { Op } = require("sequelize");

// Autorização: Materiais exige nível INTERNAL ou superior (ver regra em
// models/userLevel.js). Aplicado a todas as rotas deste router.
// const { requireLevel } = require("../middlewares/authorize");
const userLevel = require("../models/userLevel");
// router.use(requireLevel(userLevel.INTERNAL));

// PRO e COORDINATOR podem gerenciar materiais (cadastrar, editar, excluir).
// INTERNAL só consulta e visualiza.
function canManageMaterials(res) {
  const user = res.locals.currentUser;
  return !!user && user.profile >= userLevel.PRO;
}

/* GET materials listing. */
router.get("/", async function (req, res, next) {
  try {
    const selectedCategory = req.query.category || null;
    const searchTerm = (req.query.search || "").trim();

    // Monta o filtro dinamicamente: categoria e/ou busca por nome podem
    // vir juntos (ex: veio da busca global já filtrado por categoria).
    const where = {};

    if (
      selectedCategory &&
      Object.values(materialCategory).includes(selectedCategory)
    ) {
      where.category = selectedCategory;
    }

    if (searchTerm) {
      where.name = { [Op.like]: `%${searchTerm}%` };
    }

    const materials = await Materials.findAll({ where });

    res.render("materials/index", {
      title: "Materiais do NUARTE",
      subtitle: "Consulte os materiais disponíveis no acervo do NUARTE.",
      dados: materials,
      categorias: materialCategory, // disponibiliza o enum para o template
      selectedCategory: selectedCategory,
      searchTerm: searchTerm,
      canManage: canManageMaterials(res), // controla o que aparece na tela
      restricted: true,
    });
  } catch (err) {
    next(err); // evita derrubar o servidor se a consulta falhar
  }
});

/* POST create material */
router.post("/", async (req, res) => {
  if (!canManageMaterials(res)) {
    return res.status(403).send("Você não tem permissão para cadastrar materiais.");
  }

  let form = req.body;
  try {
    await Materials.create({
      name: form.name,
      description: form.description,
      qty: form.qty,
      notes: form.notes,
      photo: form.photo || null,
      category: form.category,
    });
    res.redirect("materials");
  } catch (err) {
    res.status(400).send(err.message);
  }
});

/* POST update material */
router.post("/update", async (req, res) => {
  if (!canManageMaterials(res)) {
    return res.status(403).send("Você não tem permissão para editar materiais.");
  }

  let form = req.body;
  try {
    // Localiza o material pelo ID enviado pelo campo oculto do modal
    let material = await Materials.findByPk(form.materialId);

    if (!material) {
      return res.status(404).send("Material não encontrado.");
    }

    // Atualiza os dados com os novos valores do formulário.
    // O status é recalculado pelo estoque e pelas reservas ativas
    // (qty > 0 -> disponível; qty 0 -> reservado, emprestado ou indisponível).
    // "defeito" não é alterado automaticamente.
    await material.update({
      name: form.name,
      description: form.description,
      qty: form.qty,
      notes: form.notes,
      photo: form.photo || null,
      category: form.category,
      status: await material.computeStatus(Number(form.qty)),
    });

    res.redirect("../materials");
  } catch (err) {
    res.status(400).send(err.message);
  }
});

/* POST delete material (exclusão lógica: oculta, não apaga do banco) */
router.post("/:id/delete", async (req, res) => {
  if (!canManageMaterials(res)) {
    return res.status(403).json({ error: "Você não tem permissão para excluir materiais." });
  }

  try {
    const material = await Materials.findByPk(req.params.id);

    if (!material) {
      return res.status(404).json({ error: "Material não encontrado." });
    }

    // Não faz sentido excluir material que está em uso ou aguardando retirada.
    if (await MaterialRequest.hasActiveForMaterial(material.id)) {
      return res.status(409).json({
        error:
          "Não é possível excluir: este material tem reservas em andamento (pendentes, aprovadas ou emprestadas).",
      });
    }

    await material.softDelete();
    res.json({ success: true });
  } catch (err) {
    console.error("Erro ao excluir material:", err);
    res.status(500).json({ error: "Erro ao excluir material." });
  }
});

router.get("/:id", async function (req, res, next) {
  try {
    const material = await Materials.findByPk(req.params.id);

    if (!material) {
      return res.status(404).send("Material não encontrado.");
    }

    res.render("materials/materials-view", {
      title: material.name,
      material: material,
      canManage: canManageMaterials(res),
      restricted: true,
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = router;