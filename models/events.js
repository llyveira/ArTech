const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Instância de conexão

class Event extends Model {
  /**
   * Método de Instância: verifica se o evento está com status publicado.
   */
  isPublished() {
    return this.status === 'Publicado';
  }

  /**
   * Método Estático: busca eventos pelo nome/título (busca parcial, ignorando maiúsculas/minúsculas).
   * Equivalente ao método search() do diagrama de classes.
   * Ex: Event.search('Oficina')
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
   * Método Estático: filtra eventos por categoria.
   * Equivalente ao método filter() do diagrama de classes.
   * Ex: Event.filter(categoryId)
   * NOTA: depende da associação Event.belongsTo(EventCategory) e da
   * coluna de chave estrangeira correspondente para funcionar de fato.
   */
  static async filter(categoryId) {
    return await this.findAll({
      where: { categoryId }
    });
  }

  /**
   * Método Estático: lista apenas eventos publicados.
   */
  static async findPublished() {
    return await this.findAll({
      where: { status: 'Publicado' }
    });
  }
}

// Inicialização da Classe com o Schema do Banco e Opções
Event.init(
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
        notEmpty: { msg: 'O campo nome/título não pode ser vazio.' },
        len: { args: [2, 150], msg: 'O nome deve ter entre 2 e 150 caracteres.' }
      }
    },
    image: {
      type: DataTypes.STRING, // Guarda o caminho/URL do arquivo de imagem do card
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Rascunho',
      validate: {
        isIn: {
          args: [['Publicado', 'Rascunho']],
          msg: 'O status deve ser Publicado ou Rascunho.'
        }
      }
    },
    date: {
      type: DataTypes.DATEONLY, // Armazena apenas a data (YYYY-MM-DD)
      allowNull: false,
      validate: {
        isDate: { msg: 'Informe uma data válida.' }
      }
    },
    time: {
      type: DataTypes.STRING, // Horário do evento (ex: "15:00")
      allowNull: false,
      validate: {
        notEmpty: { msg: 'O campo horário não pode ser vazio.' }
      }
    },
    location: {
      type: DataTypes.STRING, // Local (ex: "NUARTE", "Auditório IFRN")
      allowNull: false,
      validate: {
        notEmpty: { msg: 'O campo local não pode ser vazio.' }
      }
    },
    responsible: {
      type: DataTypes.STRING, // Responsável (ex: "João Silva")
      allowNull: false,
      validate: {
        notEmpty: { msg: 'O campo responsável não pode ser vazio.' }
      }
    },
    vacancies: {
      type: DataTypes.STRING, // Suporta tanto números quanto o texto "Livre"
      allowNull: false,
      defaultValue: 'Livre',
    },
    contact: {
      type: DataTypes.STRING, // Contato telefônico (ex: "(84) 99999-9999")
      allowNull: false,
      validate: {
        notEmpty: { msg: 'O campo contato não pode ser vazio.' }
      }
    }
  },
  {
    sequelize, // Instância da conexão do Sequelize
    modelName: 'Event',
    tableName: 'events', // Define explicitamente o nome da tabela no plural
    timestamps: true,    // Cria automaticamente as colunas createdAt e updatedAt
  }
);

module.exports = Event;