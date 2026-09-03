const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const crypto = require('crypto');

// Hash de senha com scrypt (nativo do Node, sem depender de bcrypt)
function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plainPassword, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(plainPassword, storedHash) {
  const [salt, hash] = storedHash.split(':');
  const hashToVerify = crypto.scryptSync(plainPassword, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(hashToVerify, 'hex'));
}

class Users extends Model {
  async updateProfile(data) {
    return await this.update(data);
  }

  async passwordChange(newPassword) {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('A senha deve conter no mínimo 6 caracteres.');
    }
    return await this.update({ password: hashPassword(newPassword) });
  }

  // PENDÊNCIA: envio por e-mail ainda não implementado, retorna a senha direto
  async passwordReset() {
    const tempPassword = crypto.randomBytes(6).toString('hex');
    await this.update({ password: hashPassword(tempPassword) });
    return tempPassword;
  }

  async deactive() {
    return await this.update({ actived: false });
  }

  // PENDÊNCIA: sem validação de perfil até "profile" virar Enum
  async changeRole(newProfile) {
    return await this.update({ profile: newProfile });
  }

  toJSON() {
    const values = { ...this.get() };
    delete values.password;
    return values;
  }

  static async register(data) {
    if (!data.password || data.password.length < 6) {
      throw new Error('A senha deve conter no mínimo 6 caracteres.');
    }
    return await this.create({
      ...data,
      password: hashPassword(data.password),
      profile: data.profile ?? 0,
      actived: true,
    });
  }

  static async login(email, password) {
    const user = await this.findOne({ where: { email } });
    if (!user) return null;
    const senhaValida = verifyPassword(password, user.password);
    return senhaValida ? user : null;
  }
}

Users.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // PENDÊNCIA: deveria ser Enum (UserProfile), hoje é INTEGER solto
    profile: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'O campo nome não pode ser vazio.' },
        len: { args: [2, 100], msg: 'O nome deve ter entre 2 e 100 caracteres.' }
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: { msg: 'Informe um endereço de e-mail válido.' },
        notEmpty: { msg: 'O e-mail é obrigatório.' }
      }
    },
    cpf: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'O CPF é obrigatório.' }
      }
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'O telefone é obrigatório.' }
      }
    },
    ifrn_registration: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'A matrícula é obrigatória.' }
      }
    },
    // Valores placeholder — confirmar com a equipe
    ifrn_role: {
      type: DataTypes.ENUM('student', 'staff', 'external'),
      allowNull: false,
    },
    actived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    }
  },
  {
    sequelize,
    modelName: 'Users',
    tableName: 'users',
    timestamps: true,
  }
);

module.exports = Users;