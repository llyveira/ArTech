const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const requestStatus = require('./requestStatus.js');

class MaterialRequest extends Model {
  /**
   * Cancela a solicitação (usuário desistiu antes da aprovação).
   */
  async cancel() {
    return await this.update({ status: requestStatus.CANCELADO });
  }

  /**
   * Marca a solicitação como aprovada (ainda não retirada).
   */
  async approve() {
    return await this.update({ status: requestStatus.APROVADO });
  }

  /**
   * Marca o material como retirado de fato pelo solicitante.
   */
  async markBorrowed() {
    return await this.update({ status: requestStatus.EMPRESTADO });
  }

  /**
   * Marca a devolução do material, registrando a data/hora exata.
   */
  async markReturned() {
    return await this.update({
      status: requestStatus.DEVOLVIDO,
      returnedAt: new Date(),
    });
  }

  /**
   * Busca todas as solicitações de um usuário específico,
   * da mais recente para a mais antiga. Usado em "Minhas Reservas".
   */
  static async forUser(userId) {
    return await this.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });
  }
}

MaterialRequest.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // Referência ao material solicitado.
    materialId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'materials',
        key: 'id',
      },
    },
    // Nome do material no momento da solicitação (cópia/snapshot).
    // Guardado aqui para exibir "Minhas Reservas" sem precisar de um
    // JOIN manual com a tabela materials a cada consulta.
    materialName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // Usuário logado que fez a solicitação (vem da sessão, não do form).
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    matricula: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'A matrícula é obrigatória.' },
      },
    },
    requesterName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'O nome do solicitante é obrigatório.' },
      },
    },
    requesterEmail: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: { msg: 'Informe um e-mail válido.' },
        notEmpty: { msg: 'O e-mail do solicitante é obrigatório.' },
      },
    },
    requesterPhone: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'O telefone do solicitante é obrigatório.' },
      },
    },
    // Data prevista de devolução, escolhida pelo solicitante no formulário.
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    // Preenchido só quando o material é devolvido de fato.
    returnedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(requestStatus)),
      allowNull: false,
      defaultValue: requestStatus.PENDENTE,
      validate: {
        isIn: {
          args: [Object.values(requestStatus)],
          msg: 'Status de solicitação inválido.',
        },
      },
    },
  },
  {
    sequelize,
    modelName: 'MaterialRequest',
    tableName: 'material_requests',
    timestamps: true, // createdAt = data da solicitação
  }
);

module.exports = MaterialRequest;