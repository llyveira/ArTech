var createError = require('http-errors');
var express = require('express');
var path = require('path');
var fs = require('fs');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var hbs = require('hbs');
var session = require('express-session'); // NOVO

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var classesRouter = require('./routes/classes');
var eventsRouter = require('./routes/events');
var materialsRouter = require('./routes/materials');
var roomsRouter = require('./routes/rooms');
var requestsRouter = require('./routes/requests'); // NOVO: solicitações/empréstimos de material
var searchRouter = require('./routes/search'); // NOVO: busca global

var Users = require('./models/users'); // NOVO: usado no middleware de sessão
var userLevel = require('./models/userLevel'); // NOVO: usado para calcular permissões do menu

var app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// Registro das partials
hbs.registerPartial(
  'login-modal',
  fs.readFileSync(
    path.join(__dirname, 'views', 'partials', 'login-modal.hbs'),
    'utf8'
  )
);

hbs.registerPartial(
  'register-modal',
  fs.readFileSync(
    path.join(__dirname, 'views', 'partials', 'register-modal.hbs'),
    'utf8'
  )
);

hbs.registerPartial(
  'event-modal',
  fs.readFileSync(
    path.join(__dirname, 'views', 'partials', 'event-modal.hbs'),
    'utf8'
  )
);

// Helper pra traduzir o status do material pro rótulo em português
hbs.registerHelper('statusLabel', function (status) {
  const labels = {
    disponivel: 'Disponível',
    indisponivel: 'Indisponível',
    emprestado: 'Emprestado',
    reservado: 'Reservado',
    defeito: 'Com defeito',
  };
  return labels[status] || status;
});

// Helper pra traduzir a categoria do material pro rótulo exibido na tela
hbs.registerHelper('categoryLabel', function (category) {
  const labels = {
    figurino: 'Figurino',
    'adereços': 'Adereços',
    tecidos: 'Tecidos',
    material_cenografico: 'Material Cenográfico',
    livros: 'Livros',
    sala_de_instrumentos: 'Sala de Instrumentos',
    laboratorio_de_musica: 'Laboratório de Música',
  };
  return labels[category] || category;
});

// Helper que gera as iniciais do usuário logado, para o avatar (ex: "Maria Isabelly" -> "MI")
hbs.registerHelper('initials', function (name) {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
});

// Helper que retorna só os dois primeiros nomes (ex: "Maria Isabelly Silva dos Santos" -> "Maria Isabelly")
hbs.registerHelper('shortName', function (name) {
  if (!name) return '';
  return name.trim().split(/\s+/).slice(0, 2).join(' ');
});

// Helper que traduz o nível numérico do perfil para o nome correspondente
hbs.registerHelper('roleName', function (profile) {
  const roles = {
    0: 'EXTERNO',
    1: 'INTERNO',
    2: 'PRO',
    3: 'COORDENADOR'
  };
  return roles[profile] ?? 'Utilizador';
});

// Middlewares
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// NOVO: configuração da sessão (precisa vir antes das rotas)
app.use(session({
  secret: process.env.SESSION_SECRET || 'troque-isso-no-env',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 1 dia
  }
}));

// NOVO: disponibiliza o usuário logado (ou null) para todas as views,
// como "currentUser". Assim o layout.hbs pode decidir o que mostrar
// (card do usuário vs botões de login/cadastro) sem depender só de JS.
app.use(async (req, res, next) => {
  if (req.session.userId) {
    try {
      const user = await Users.findByPk(req.session.userId);
      res.locals.currentUser = user ? user.toJSON() : null;
    } catch (err) {
      res.locals.currentUser = null;
    }
  } else {
    res.locals.currentUser = null;
  }

  // NOVO: nível do usuário (quem não está logado conta como EXTERNAL),
  // e flags prontas para o menu decidir o que mostrar, sem precisar
  // comparar números dentro do template.
  const currentLevel = res.locals.currentUser
    ? res.locals.currentUser.profile
    : userLevel.EXTERNAL;

  res.locals.canViewMaterials = currentLevel >= userLevel.INTERNAL;
  res.locals.canViewCategories = currentLevel >= userLevel.PRO;
  res.locals.isCoordinator = currentLevel >= userLevel.COORDINATOR;

  next();
});

// Rotas
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/classes', classesRouter);
app.use('/events', eventsRouter);
app.use('/materials', materialsRouter);
app.use('/rooms', roomsRouter);
app.use('/requests', requestsRouter); // NOVO: solicitações/empréstimos de material
app.use('/search', searchRouter); // NOVO: busca global

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function (err, req, res, next) {
  // Set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development'
    ? err
    : {};

  // Render the error page
  res.status(err.status || 500);
  res.render('error');
});

// Conexão com o banco de dados
var db = require('./config/database.js');

db.sync()
  .then(async () => {
    const { DataTypes } = require('sequelize');
    const queryInterface = db.getQueryInterface();
    const { Reservations } = require('./models/rooms');
    const Event = require('./models/events');

    // Garante a coluna "image" na tabela de salas (só cria se não existir).
    const colunasSalas = await queryInterface.describeTable('classrooms');
    if (!colunasSalas.image) {
      await queryInterface.addColumn('classrooms', 'image', {
        type: DataTypes.STRING(2048),
        allowNull: true
      });
    }

    // Garante a coluna "isDeleted" (flag de exclusão lógica) em reservations.
    const colunasReservasFlag = await queryInterface.describeTable('reservations');
    if (!colunasReservasFlag.isDeleted) {
      await queryInterface.addColumn('reservations', 'isDeleted', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    // Só altera as tabelas quando elas ainda estão no formato antigo.
    // Assim a migração roda uma vez e não apaga a ligação evento <-> reserva
    // a cada reinício do servidor.
    const colunasReservas = await queryInterface.describeTable('reservations');
    const precisaAlterarReservas =
      colunasReservas.orderById.allowNull === false ||
      colunasReservas.classroomId.allowNull === false ||
      colunasReservas.maxParticipants.allowNull === false;

    const colunasEventos = await queryInterface.describeTable('events');
    const precisaAlterarEventos =
      !colunasEventos.description ||
      !colunasEventos.category ||
      !colunasEventos.reservationId ||
      !colunasEventos.createdById ||
      colunasEventos.responsible.allowNull === false ||
      colunasEventos.contact.allowNull === false;

    if (precisaAlterarReservas || precisaAlterarEventos) {
      // Desliga as chaves estrangeiras durante a migração para o SQLite
      // não zerar o reservationId dos eventos ao recriar a tabela.
      await db.query('PRAGMA foreign_keys = OFF');
      try {
        if (precisaAlterarReservas) await Reservations.sync({ alter: true });
        if (precisaAlterarEventos) await Event.sync({ alter: true });
      } finally {
        await db.query('PRAGMA foreign_keys = ON');
      }
    }

    console.log('Banco de dados sincronizado!');

    // Eventos antigos com status "Publicado" passam a ser "Aprovado"
    await Event.update({ status: 'Aprovado' }, { where: { status: 'Publicado' } });
  })
  .catch((err) => {
    console.error('Erro ao sincronizar o banco de dados:', err);
  });
  
module.exports = app;