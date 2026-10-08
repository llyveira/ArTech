// Busca global: filtra enquanto a pessoa digita (com atraso de 250 ms).
//
// Contrato com routes/search.js:
//   GET /search?q=texto  ->  { events: [], rooms: [], materials: [], users: [] }
//   cada item: { title, subtitle?, url? }

(function () {
  var INPUT_ID = 'globalSearchInput';
  var RESULTS_ID = 'globalSearchResults';
  var ENDPOINT = '/search';
  var MIN_CHARS = 2;
  var DELAY_MS = 250;

  // Ordem dos grupos + link padrão quando o item não traz url
  var GROUPS = {
    events: { label: 'Eventos', path: '/events' },
    rooms: { label: 'Salas', path: '/rooms' },
    materials: { label: 'Materiais', path: '/materials' },
    users: { label: 'Usuários', path: '/users' }
  };

  var input = document.getElementById(INPUT_ID);
  var box = document.getElementById(RESULTS_ID);
  if (!input || !box) return;

  var timer = null;
  var controller = null;

  function showBox() {
    box.classList.remove('hidden');
  }

  function hideBox() {
    box.classList.add('hidden');
  }

  function clearBox() {
    box.replaceChildren();
    hideBox();
  }

  function showMessage(text) {
    var p = document.createElement('p');
    p.className = 'search-message';
    p.textContent = text;
    box.replaceChildren(p);
    showBox();
  }

  // Só aceita links internos ("/..." ou "#"), nunca endereços externos
  function safeUrl(url, fallback) {
    return typeof url === 'string' && /^(\/(?!\/)|#)/.test(url) ? url : fallback;
  }

  function renderResults(data) {
    box.replaceChildren();
    var total = 0;

    Object.keys(GROUPS).forEach(function (key) {
      var items = data[key];
      if (!items || !items.length) return;
      total += items.length;

      var title = document.createElement('p');
      title.className = 'search-group-title';
      title.textContent = GROUPS[key].label;
      box.appendChild(title);

      items.forEach(function (item) {
        var link = document.createElement('a');
        link.className = 'search-result';
        link.href = safeUrl(item.url, GROUPS[key].path);

        var name = document.createElement('span');
        name.className = 'search-result-name';
        name.textContent = item.title || item.name || '';
        link.appendChild(name);

        if (item.subtitle) {
          var sub = document.createElement('span');
          sub.className = 'search-result-sub';
          sub.textContent = item.subtitle;
          link.appendChild(sub);
        }

        box.appendChild(link);
      });
    });

    if (total === 0) {
      showMessage('Nenhum resultado encontrado.');
    } else {
      showBox();
    }
  }

  async function search(term) {
    if (controller) controller.abort(); // cancela a busca anterior
    controller = new AbortController();

    try {
      var response = await fetch(ENDPOINT + '?q=' + encodeURIComponent(term), {
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      renderResults(await response.json());
    } catch (err) {
      if (err.name === 'AbortError') return; // substituída por uma busca mais nova
      showMessage('Não foi possível buscar agora.');
    }
  }

  input.addEventListener('input', function () {
    var term = input.value.trim();
    clearTimeout(timer);

    if (term.length < MIN_CHARS) {
      if (controller) controller.abort();
      clearBox();
      return;
    }

    timer = setTimeout(function () {
      search(term);
    }, DELAY_MS);
  });

  // Reabre os resultados anteriores ao voltar para o campo
  input.addEventListener('focus', function () {
    if (box.childElementCount > 0) showBox();
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hideBox();
  });

  // Fecha ao clicar fora
  document.addEventListener('click', function (e) {
    if (e.target !== input && !box.contains(e.target)) hideBox();
  });
})();