const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Instância de conexão
const materialCategory = require('./materialCategory'); // Enum de categorias (Passo 1)
const materialStatus = require('./materialStatus'); // Enum de status do material

class Materials extends Model {
  /**
   * Método de Instância: verifica se o material está disponível para empréstimo
   * (quantidade em estoque maior que zero).
   * Equivalente ao método available() do diagrama de classes.
   */
  available() {
    return this.qty > 0;
  }

  /**
   * Método de Instância: exclusão lógica. Oculta o material das listagens
   * sem apagá-lo do banco (o histórico de reservas continua íntegro).
   */
  async softDelete() {
    return await this.update({ isDeleted: true });
  }

  /**
   * Método de Instância: devolve o status que o material deve ter para uma
   * determinada quantidade em estoque. Só alterna entre "disponivel" e
   * "indisponivel"; status como "defeito", "emprestado" e "reservado"
   * são mantidos como estão.
   */
  statusForQty(qty) {
    if (
      this.status === materialStatus.DISPONIVEL ||
      this.status === materialStatus.INDISPONIVEL
    ) {
      return qty > 0 ? materialStatus.DISPONIVEL : materialStatus.INDISPONIVEL;
    }
    return this.status;
  }

  /**
   * Método de Instância: ajusta o estoque (delta positivo ou negativo) e
   * sincroniza o status junto, numa única atualização.
   * Aceita { transaction } para participar de uma transação.
   */
  async adjustQty(delta, options = {}) {
    const newQty = this.qty + delta;
    if (newQty < 0) {
      throw new Error('Estoque insuficiente.');
    }

    return await this.update(
      { qty: newQty, status: this.statusForQty(newQty) },
      options
    );
  }

  /**
   * Método Estático: busca materiais pelo nome (busca parcial, ignorando maiúsculas/minúsculas).
   * Equivalente ao método search() do diagrama de classes.
   * Ex: Material.search('cadeira')
   */
  static async search(name) {
    const { Op } = require('sequelize');
    return await this.findAll({
      where: {
        name: { [Op.like]: `%${name}%` }
      }
    });
  }

  /**
   * Método Estático: filtra materiais por categoria.
   * Equivalente ao método filter() do diagrama de classes.
   * Ex: Material.filter(materialCategory.LIVROS)
   * "category" é um ENUM (ver models/materialCategory.js), não uma FK,
   * então o filtro é feito diretamente pelo valor da string.
   */
  static async filter(category) {
    return await this.findAll({
      where: { category }
    });
  }

  /**
   * Método Estático: lista apenas materiais com estoque disponível (qty > 0).
   * Complementa o available() de instância, cobrindo o caso de listagem. (Pensar em caso de aplicação)
   */
  static async findAvailable() {
    const { Op } = require('sequelize');
    return await this.findAll({
      where: { qty: { [Op.gt]: 0 } }
    });
  }
}

// Inicialização da Classe com o Schema do Banco e Opções
Materials.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'O campo nome não pode ser vazio.' },
        len: { args: [2, 100], msg: 'O nome deve ter entre 2 e 100 caracteres.' }
      }
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'O campo descrição não pode ser vazio.' }
      }
    },
    qty: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: { args: [0], msg: 'A quantidade não pode ser negativa.' }
      }
    },
    notes: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    photo: {
      type: DataTypes.STRING, // guarda o caminho/URL do arquivo de imagem
      allowNull: true,
    },
    category: {
      type: DataTypes.ENUM(...Object.values(materialCategory)),
      allowNull: false,
      // defaultValue é necessário aqui: o SQLite não permite adicionar
      // (via ALTER TABLE) uma coluna NOT NULL sem um valor padrão numa
      // tabela que já existe. Sem isso, o alter:true falha silenciosamente
      // e a coluna nunca é criada de fato.
      defaultValue: materialCategory.FIGURINO,
      validate: {
        isIn: {
          args: [Object.values(materialCategory)],
          msg: 'Categoria inválida.'
        }
      }
    },
    status: {
      type: DataTypes.ENUM(...Object.values(materialStatus)),
      allowNull: false,
      defaultValue: materialStatus.DISPONIVEL,
      validate: {
        isIn: {
          args: [Object.values(materialStatus)],
          msg: 'Status inválido.'
        }
      }
    },
    // Flag de exclusão lógica: material com isDeleted = true fica oculto
    // das listagens, mas continua no banco (mantém o histórico de reservas).
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    }
  },
  {
    sequelize, // Instância da conexão do Sequelize
    modelName: 'Materials',
    tableName: 'materials', // Define explicitamente o nome da tabela no plural (Boa prática)
    timestamps: true,       // Cria automaticamente as colunas createdAt e updatedAt
    // Esconde automaticamente os materiais excluídos em findAll, findByPk, search etc.
    // Para enxergar os ocultos: Materials.unscoped().findAll()
    defaultScope: { where: { isDeleted: false } },
  }
);

module.exports = Materials;