var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('events/index', {title: 'Eventos do NUARTE', subtitle:'Gerencie os eventos realizados pelo NUARTE.'});
});

/* POST eventos - recebe o formulário do modal "Novo Evento" */
// router.post('/', function(req, res, next) {          
//   const nomeDoEvento = req.body.name;                  
//   const proposito = `Realização de evento ${nomeDoEvento}`; 

//   console.log(proposito);                              //  (só pra você ver funcionando)

//   res.redirect('/events');                             
// });          

// dados temporários, até o banco de verdade
const eventosMock = {
  1: {
    titulo: "Oficina de Teatro",
    imagem: "/OficinaDeTeatro.jpg",
    status: "Publicado",
    statusClass: "publicado",
    data: "20/06/2026",
    horario: "15:00",
    local: "NUARTE",
    responsavel: "João Silva",
    vagas: 20,
    contato: "(84) 99999-9999",
    descricao: "Oficina prática de teatro para iniciantes."
  },
  2: {
    titulo: "Exposição Cultural",
    imagem: "/ExposicaoCultural.jpg",
    status: "Publicado",
    statusClass: "publicado",
    data: "25/06/2026",
    horario: "18:00",
    local: "Auditório IFRN",
    responsavel: "Maria Santos",
    vagas: "Livre",
    contato: "(84) 98888-8888",
    descricao: "Exposição com trabalhos dos alunos do NUARTE."
  },
  3: {
    titulo: "Workshop de Dança",
    imagem: "/WorkshopDeDanca.jpg",
    status: "Rascunho",
    statusClass: "rascunho",
    data: "02/07/2026",
    horario: "14:00",
    local: "NUARTE - Sala 02",
    responsavel: "Carla Mendes",
    vagas: 15,
    contato: "(84) 97777-7777",
    descricao: "Workshop introdutório de dança contemporânea."
  },
  4: {
    titulo: "Sarau Literário",
    imagem: "/SarauLiterario.jpg",
    status: "Publicado",
    statusClass: "publicado",
    data: "10/07/2026",
    horario: "19:00",
    local: "Biblioteca IFRN",
    responsavel: "Pedro Alves",
    vagas: 30,
    contato: "(84) 96666-6666",
    descricao: "Noite de leituras e declamações abertas ao público."
  }
};

/* GET /events/:id - mostra um evento específico */
router.get('/:id', function(req, res, next) {
  const evento = eventosMock[req.params.id];

  if (!evento) {
    return res.status(404).send('Evento não encontrado');
  }

  res.render('events/show', {
    title: evento.titulo,
    evento: evento
  });
});

module.exports = router;