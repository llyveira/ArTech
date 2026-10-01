var createError = require("http-errors");
var express = require("express");
var path = require("path");
var fs = require("fs");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var hbs = require("hbs");
var session = require("express-session"); // NOVO

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var classesRouter = require("./routes/classes");
var eventsRouter = require("./routes/events");
var materialsRouter = require("./routes/materials");
var roomsRouter = require("./routes/rooms");

var Users = require("./models/users"); // NOVO: usado no middleware de sessão

var app = express();

// View engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

// Registro das partials
hbs.registerPartial(
  "login-modal",
  fs.readFileSync(
    path.join(__dirname, "views", "partials", "login-modal.hbs"),
    "utf8",
  ),
);

hbs.registerPartial(
  "register-modal",
  fs.readFileSync(
    path.join(__dirname, "views", "partials", "register-modal.hbs"),
    "utf8",
  ),
);

// Helper pra traduzir o status do material pro rótulo em português
hbs.registerHelper("statusLabel", function (status) {
  const labels = {
    disponivel: "Disponível",
    indisponivel: "Indisponível",
    emprestado: "Emprestado",
    reservado: "Reservado",
    defeito: "Com defeito",
  };
  return labels[status] || status;
});

// Helper que gera as iniciais do usuário logado, para o avatar (ex: "Maria Isabelly" -> "MI")
hbs.registerHelper("initials", function (name) {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
});

// Middlewares
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// NOVO: configuração da sessão (precisa vir antes das rotas)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "troque-isso-no-env",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 dia
    },
  }),
);

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
  next();
});

// Rotas
app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/classes", classesRouter);
app.use("/events", eventsRouter);
app.use("/materials", materialsRouter);
app.use("/rooms", roomsRouter);

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function (err, req, res, next) {
  // Set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // Render the error page
  res.status(err.status || 500);
  res.render("error");
});

// Conexão com o banco de dados
var db = require("./config/database.js");

db.sync().then(() => {
  console.log("Banco de dados sincronizado!");
});

module.exports = app;
