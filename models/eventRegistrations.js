const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Inscrição de um usuário em um evento (o "Inscrito" não é um status do evento).
class EventRegistrations extends Model {}

EventRegistrations.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    eventId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false },
    // Matrícula: só preenchida por usuários internos
    registration: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize,
    modelName: 'EventRegistrations',
    tableName: 'event_registrations',
    timestamps: true,
    // Um usuário só pode se inscrever uma vez em cada evento
    indexes: [{ unique: true, fields: ['eventId', 'userId'] }],
  }
);

module.exports = EventRegistrations;

// Associações
const Event = require('./events');
const Users = require('./users');
Event.hasMany(EventRegistrations, { foreignKey: 'eventId', as: 'registrations' });
EventRegistrations.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });
Users.hasMany(EventRegistrations, { foreignKey: 'userId', as: 'eventRegistrations' });
EventRegistrations.belongsTo(Users, { foreignKey: 'userId', as: 'user' });