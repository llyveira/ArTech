const { Model, DataTypes, Op } = require('sequelize');
const sequelize = require('../config/database');


class Classrooms extends Model {
  async available(pickup, returnDate) {
    if (typeof this.getReservations !== 'function') return true;


    const conflicts = await this.getReservations({
      where: {
        status: 'APPROVED',
        [Op.or]: [
          { pickup: { [Op.between]: [pickup, returnDate] } },
          { return: { [Op.between]: [pickup, returnDate] } },
          {
            [Op.and]: [
              { pickup: { [Op.lte]: pickup } },
              { return: { [Op.gte]: returnDate } }
            ]
          }
        ]
      }
    });


    return conflicts.length === 0;
  }


  static async findAllRooms() {
    return await this.findAll({ order: [['number', 'ASC']] });
  }
}


Classrooms.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },


    number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'O campo número da sala não pode ser vazio.' }
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'O campo nome não pode ser vazio.' },
        len: { args: [2, 100], msg: 'O nome deve ter entre 2 e 100 caracteres.' }
      }
    },
  },
  {
    sequelize,
    modelName: 'Classrooms',
    tableName: 'classrooms',
    timestamps: true,
  }
);


class Reservations extends Model {
  async request() {
    if (this.status !== 'EDITING') {
      throw new Error('Só é possível solicitar uma reserva que esteja em edição (EDITING).');
    }
    this.status = 'PENDING';
    return await this.save();
  }


  async approve(answeredById) {
    if (this.status !== 'PENDING') {
      throw new Error('Só é possível aprovar uma reserva PENDING.');
    }
    this.status = 'APPROVED';
    this.answeredById = answeredById;
    return await this.save();
  }


  async reject(answeredById) {
    if (this.status !== 'PENDING') {
      throw new Error('Só é possível rejeitar uma reserva PENDING.');
    }
    this.status = 'CANCELLED';
    this.answeredById = answeredById;
    return await this.save();
  }


  async cancel() {
    if (this.status === 'FINISHED') {
      throw new Error('Não é possível cancelar uma reserva já finalizada.');
    }
    this.status = 'CANCELLED';
    return await this.save();
  }


  async updateReservation(fields = {}) {
    if (this.status !== 'EDITING') {
      throw new Error('Só é possível editar uma reserva que esteja em EDITING.');
    }
    const allowed = ['purpose', 'maxParticipants', 'notes', 'pickup', 'return', 'classroomId'];
    for (const key of Object.keys(fields)) {
      if (allowed.includes(key)) this[key] = fields[key];
    }
    return await this.save();
  }
}


Reservations.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },


    orderById: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },


    answeredById: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },


    classroomId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    purpose: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'O campo propósito não pode ser vazio.' }
      }
    },
    maxParticipants: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: { args: [1], msg: 'O número máximo de participantes deve ser pelo menos 1.' }
      }
    },
    status: {
      type: DataTypes.ENUM('EDITING', 'PENDING', 'CANCELLED', 'APPROVED', 'FINISHED'),
      allowNull: false,
      defaultValue: 'EDITING',
    },
    notes: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pickup: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    return: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isAfterPickup(value) {
          if (this.pickup && value <= this.pickup) {
            throw new Error('A data de devolução deve ser posterior à data de retirada.');
          }
        }
      }
    },
  },
  {
    sequelize,
    modelName: 'Reservations',
    tableName: 'reservations',
    timestamps: true,
  }
);


class ReservationParticipants extends Model {


  static async register(reservationId, participantId) {
    return await this.create({ reservationId, participantId });
  }


  async remove() {
    return await this.destroy();
  }
}


ReservationParticipants.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // FK: reserva à qual o participante está vinculado.
    reservationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },


    participantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'ReservationParticipants',
    tableName: 'reservation_participants',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['reservationId', 'participantId'],
        name: 'uk_subscription_reservation_participant',
      },
    ],
  }
);


module.exports = { Classrooms, Reservations, ReservationParticipants };