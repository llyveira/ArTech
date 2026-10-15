const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Instância de conexão

class Event extends Model {
  /**
   * Métodos de Instância: verificam o status atual do evento.
   * Fluxo: Rascunho -> Solicitado -> Aprovado
   */
  isDraft() {
    return this.status === 'Rascunho';
  }

  isRequested() {
    return this.status === 'Solicitado';
  }

  isApproved() {
    return this.status === 'Aprovado';
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
   * Método Estático: lista apenas eventos aprovados.
   */
  static async findApproved() {
    return await this.findAll({
      where: { status: 'Aprovado' }
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Rascunho',
      validate: {
        isIn: {
          args: [['Rascunho', 'Solicitado', 'Aprovado']],
          msg: 'O status deve ser Rascunho, Solicitado ou Aprovado.'
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
      type: DataTypes.STRING, // Responsável (não é mais pedido no formulário)
      allowNull: true,
    },
    vacancies: {
      type: DataTypes.STRING, // Suporta tanto números quanto o texto "Livre"
      allowNull: false,
      defaultValue: 'Livre',
    },
    category: {
      type: DataTypes.STRING, // Categoria do evento (valor do select, ex: "ensaios")
      allowNull: true,
    },
    reservationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    createdById: {
      type: DataTypes.INTEGER, // Usuário logado que criou o evento
      allowNull: true,
    },
    contact: {
      type: DataTypes.STRING, // Contato (não é mais pedido no formulário)
      allowNull: true,
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

// Associação com Reservations
const { Reservations } = require('./rooms');
Event.belongsTo(Reservations,{foreignKey:'reservationId',as:'reservation'});
Reservations.hasOne(Event,{foreignKey:'reservationId',as:'event'});

// Associação com o usuário que criou o evento
const Users = require('./users');
Event.belongsTo(Users, { foreignKey: 'createdById', as: 'creator' });
Users.hasMany(Event, { foreignKey: 'createdById', as: 'events' });
