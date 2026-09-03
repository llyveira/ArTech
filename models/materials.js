const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Instância de conexão

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
   * Ex: Material.filter(categoryId)
   * NOTA: depende da associação Material.belongsTo(MaterialCategory) e da
   * coluna de chave estrangeira correspondente para funcionar de fato.
   *
   * PENDÊNCIA: a coluna "categoryId" usada abaixo ainda não existe no
   * schema deste model. Ela só passa a existir de verdade quando a
   * associação Material.belongsTo(MaterialCategory) for declarada
   * (geralmente em um models/index.js, após o model MaterialCategory
   * também ser criado). Até lá, este método roda sem erro, mas o filtro
   * não retorna resultados corretos, pois a coluna não é persistida no banco.
   */
  static async filter(categoryId) {
    return await this.findAll({
      where: { categoryId }
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
    // NOTA: campo "photo" não existe no diagrama de classes atual.
    // Adicionado aqui porque o front-end (materiais.html) já exibe foto
    // por card, seguindo o mesmo padrão do atributo "image" da classe Event.
    // Vale atualizar o diagrama de classes para refletir essa adição.
    photo: {
      type: DataTypes.STRING, // guarda o caminho/URL do arquivo de imagem
      allowNull: true,
    }
  },
  {
    sequelize, // Instância da conexão do Sequelize
    modelName: 'Materials',
    tableName: 'materials', // Define explicitamente o nome da tabela no plural (Boa prática)
    timestamps: true,       // Cria automaticamente as colunas createdAt e updatedAt
  }
);

module.exports = Materials;