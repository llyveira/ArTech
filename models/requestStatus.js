const requestStatus = Object.freeze({
  PENDENTE: 'pendente',     // acabou de ser solicitado, aguardando aprovação
  APROVADO: 'aprovado',     // aprovado, aguardando retirada
  EMPRESTADO: 'emprestado', // material já está com o solicitante
  DEVOLVIDO: 'devolvido',   // ciclo completo, material de volta
  CANCELADO: 'cancelado',   // solicitante cancelou antes da aprovação
});

module.exports = requestStatus;