var createError = require('http-errors');
var express = require('express');
var path = require('path');
var fs = require('fs');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var hbs = require('hbs');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var classesRouter = require('./routes/classes');
var eventsRouter = require('./routes/events');
var materialsRouter = require('./routes/materials');
var roomsRouter = require('./routes/rooms');

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

// Middlewares
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Rotas
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/classes', classesRouter);
app.use('/events', eventsRouter);
app.use('/materials', materialsRouter);
app.use('/rooms', roomsRouter);

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

db.sync().then(() => {
  console.log('Banco de dados sincronizado!');
});

module.exports = app;