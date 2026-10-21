const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Instância de conexão
const materialCategory = require('./materialCategory'); // Enum de categorias (Passo 1)
const materialStatus = require('./materialStatus'); // Enum de status do material
const requestStatus = require('./requestStatus'); // Enum de status das reservas
const MaterialRequest = require('./materialRequest'); // Para contar reservas ativas

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
   * Método de Instância: calcula o status que o material deve ter a partir
   * do estoque e das reservas ativas. "defeito" é manual e nunca é alterado.
   *  - qty > 0 ........................ disponivel
   *  - qty = 0 + reserva aprovada ..... reservado (aguardando retirada)
   *  - qty = 0 + material emprestado .. emprestado
   *  - qty = 0 sem reservas ativas .... indisponivel (estoque zerado)
   * Chame DEPOIS de atualizar o status da reserva, para que ela já seja contada.
   * Aceita { transaction } para enxergar as mudanças feitas dentro da transação.
   */
  async computeStatus(qty, options = {}) {
    if (this.status === materialStatus.DEFEITO) return this.status;
    if (qty > 0) return materialStatus.DISPONIVEL;

    const countBy = (status) =>
      MaterialRequest.count({
        where: { materialId: this.id, status },
        transaction: options.transaction,
      });

    if ((await countBy(requestStatus.APROVADO)) > 0) return materialStatus.RESERVADO;
    if ((await countBy(requestStatus.EMPRESTADO)) > 0) return materialStatus.EMPRESTADO;
    return materialStatus.INDISPONIVEL;
  }

  /**
   * Método de Instância: ajusta o estoque (delta positivo ou negativo) e
   * recalcula o status, numa única atualização. Aceita { transaction }.
   */
  async adjustQty(delta, options = {}) {
    const newQty = this.qty + delta;
    if (newQty < 0) {
      throw new Error('Estoque insuficiente.');
    }

    return await this.update(
      { qty: newQty, status: await this.computeStatus(newQty, options) },
      options
    );
  }

  /**
   * Método de Instância: recalcula só o status, sem mexer no estoque
   * (usado na retirada, quando o estoque não muda). Aceita { transaction }.
   */
  async refreshStatus(options = {}) {
    return await this.update(
      { status: await this.computeStatus(this.qty, options) },
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