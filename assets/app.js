/* ═══════════════════════════════════════════════════════════════
   Логика страницы. Правки данных — в config.js, не здесь.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var C = window.CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };

  /* Текст только через textContent: имя гостя приходит из URL,
     через innerHTML это была бы XSS-дыра. */
  function put(id, value) {
    var el = $(id);
    if (el && value) el.textContent = value;
  }

  var MONTHS = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым',
                'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'];
  var WEEKDAYS = ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сн', 'Жс'];   // с понедельника

  /* ── Имя гостя из ссылки: ?g=Ерлан%20аға ──────────────────── */
  var guest = (function () {
    var q = new URLSearchParams(location.search);
    var raw = q.get('g') || q.get('to') || q.get('name') || '';
    return raw.replace(/\s+/g, ' ').trim().slice(0, 60);
  })();

  /* ── Заполняем страницу ───────────────────────────────────── */
  put('bride',      C.brideLat || C.bride);
  put('occasion',   C.occasionLat);
  put('bride-2',    C.brideGen || (C.bride ? C.bride + 'ның' : ''));
  put('hosts',      C.hosts || C.parents);
  put('cal-date',   C.dateText);
  put('cal-time',   C.timeText);
  put('city',       C.city);
  put('address',    C.address);
  put('venue',      C.venue ? '«' + C.venue + '»' : '');

  /* Персональная ссылка — обращаемся по имени, иначе общий список */
  put('guest-line', guest || C.audience);

  if (C.bride) document.title = C.bride + ' — қыз ұзату тойына шақыру';

  (function photo() {
    var img = $('photo');
    if (C.photo) {
      img.src = C.photo;
      img.alt = (C.bride ? C.bride + ' — ' : '') + 'қыз ұзату тойы';
    }
    else { $('arch').hidden = true; }
  })();

  (function maps() {
    [['map-2gis', C.map2gis], ['map-google', C.mapGoogle]].forEach(function (p) {
      var el = $(p[0]);
      if (el && p[1]) { el.href = p[1]; el.hidden = false; }
    });
  })();

  (function contacts() {
    var ul = $('contacts');
    if (!ul || !Array.isArray(C.contacts) || !C.contacts.length) return;
    C.contacts.forEach(function (c) {
      if (!c || !c.tel) return;
      var li = document.createElement('li');
      if (c.name) {
        var who = document.createElement('span');
        who.className = 'who';
        who.textContent = c.name + ' ';
        li.appendChild(who);
      }
      var a = document.createElement('a');
      a.href = 'tel:' + c.tel.replace(/[^\d+]/g, '');
      a.textContent = c.tel;
      li.appendChild(a);
      ul.appendChild(li);
    });
  })();

  /* ── Календарь ────────────────────────────────────────────── */
  /* Год/месяц/день берём из строки, а не из Date: иначе у гостя
     в другом часовом поясе подсветился бы соседний день. */
  var parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(C.dateISO || '');

  (function calendar() {
    var table = $('cal');
    if (!table || !parts) { if (table) table.hidden = true; return; }

    var year = +parts[1], month = +parts[2] - 1, day = +parts[3];

    var head = document.createElement('tr');
    WEEKDAYS.forEach(function (w) {
      var th = document.createElement('th');
      th.textContent = w;
      th.scope = 'col';
      head.appendChild(th);
    });
    var thead = document.createElement('thead');
    thead.appendChild(head);
    table.appendChild(thead);

    var first = new Date(year, month, 1);
    var lead = (first.getDay() + 6) % 7;            // Date: вс=0, нам нужен пн=0
    var total = new Date(year, month + 1, 0).getDate();

    var tbody = document.createElement('tbody');
    var tr = document.createElement('tr');
    var cell = 0;

    for (var i = 0; i < lead; i++) { tr.appendChild(document.createElement('td')); cell++; }

    for (var d = 1; d <= total; d++) {
      if (cell === 7) { tbody.appendChild(tr); tr = document.createElement('tr'); cell = 0; }
      var td = document.createElement('td');
      td.textContent = d;
      if (d === day) {
        td.className = 'mark';
        td.setAttribute('aria-current', 'date');
      }
      tr.appendChild(td);
      cell++;
    }
    while (cell < 7) { tr.appendChild(document.createElement('td')); cell++; }
    tbody.appendChild(tr);
    table.appendChild(tbody);

    if (!C.dateText) put('cal-date', day + ' ' + MONTHS[month] + ' ' + year);
  })();

  /* ── Кері санақ ───────────────────────────────────────────── */
  (function countdown() {
    var box = $('count');
    var target = C.dateISO ? new Date(C.dateISO) : null;
    if (!box || !target || isNaN(target)) { if (box) box.hidden = true; return; }

    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };

    function tick() {
      var left = target - new Date();
      if (left <= 0) {                     // той начался — обнуляем, а не уходим в минус
        $('c-d').textContent = $('c-h').textContent =
        $('c-m').textContent = $('c-s').textContent = '00';
        clearInterval(timer);
        return;
      }
      var s = Math.floor(left / 1000);
      $('c-d').textContent = pad(Math.floor(s / 86400));
      $('c-h').textContent = pad(Math.floor(s / 3600) % 24);
      $('c-m').textContent = pad(Math.floor(s / 60) % 60);
      $('c-s').textContent = pad(s % 60);
    }
    tick();
    var timer = setInterval(tick, 1000);
  })();

  /* ── Сауалнама ────────────────────────────────────────────── */
  var form      = $('rsvp-form');
  var doneBox   = $('rsvp-done');
  var errBox    = $('f-err');
  var nameInput = $('f-name');
  var sendBtn   = $('f-send');

  var STORE = 'uzatu-rsvp';
  var ANSWERS = Array.isArray(C.answers) && C.answers.length ? C.answers : [
    { text: 'Келемін',       count: 1 },
    { text: 'Келе алмаймын', count: 0 },
  ];

  if (guest) nameInput.value = guest;

  /* Заметка организатору, а не гостю — поэтому по-русски. */
  if (!C.rsvpUrl) {
    var warn = document.createElement('p');
    warn.className = 'err';
    warn.textContent = '⚠️ config.js → rsvpUrl не заполнен. Ответы гостей ' +
                       'никуда не сохраняются. Инструкция — в README.md.';
    form.parentNode.insertBefore(warn, form);
  }

  (function buildAnswers() {
    var box = $('f-answers');
    ANSWERS.forEach(function (a, i) {
      var label = document.createElement('label');
      label.className = 'opt';

      var input = document.createElement('input');
      input.type = 'radio';
      input.name = 'answer';
      input.value = a.text;
      input.required = true;
      /* сколько человек придёт при этом ответе — спрашивать не нужно */
      input.dataset.count = String(a.count != null ? a.count : 1);

      var dot = document.createElement('span');
      dot.className = 'dot';

      var txt = document.createElement('span');
      txt.className = 'txt';
      txt.textContent = a.text;

      label.append(input, dot, txt);
      box.appendChild(label);

    });
  })();

  function chosen() {
    return form.querySelector('input[name="answer"]:checked');
  }

  function showDone(answerText, coming) {
    form.hidden = true;
    doneBox.hidden = false;
    $('done-title').textContent = coming ? 'Рақмет!' : 'Түсіндік';
    $('done-text').textContent = coming
      ? 'ЖАУАБЫҢЫЗ ҚАБЫЛДАНДЫ. ТОЙДА КЕЗДЕСКЕНШЕ!'
      : 'ЖАУАБЫҢЫЗ ҚАБЫЛДАНДЫ. КЕЛЕ АЛМАҒАНЫҢЫЗ ӨКІНІШТІ.';
  }

  /* Apps Script и CORS: Content-Type: text/plain делает запрос
     «простым», без preflight OPTIONS, который Apps Script не умеет
     обрабатывать. Тело всё равно приходит как JSON-строка и
     читается на той стороне через e.postData.contents. */
  function send(payload) {
    return fetch(C.rsvpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).catch(function () {
      /* Фолбэк: запись проходит, ответ прочитать нельзя. */
      return fetch(C.rsvpUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      }).then(function () { return 'no-cors'; });
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errBox.hidden = true;

    var pick = chosen();
    var who = nameInput.value.trim();
    if (!who) { nameInput.focus(); return; }
    if (!pick) { return; }

    var count  = parseInt(pick.dataset.count, 10) || 0;
    var coming = count > 0;
    var payload = {
      name:   who,
      answer: pick.value,
      guests: coming ? String(count) : '',
      note:   $('f-note').value.trim(),
      link:   guest,
      page:   location.href,
    };

    if (!C.rsvpUrl) { showDone(pick.value, coming); return; }

    sendBtn.disabled = true;
    sendBtn.textContent = 'ЖІБЕРІЛУДЕ…';

    send(payload).then(function () {
      try {
        localStorage.setItem(STORE, JSON.stringify(
          { answer: pick.value, coming: coming, name: who }));
      } catch (_) {}
      showDone(pick.value, coming);
    }).catch(function () {
      errBox.textContent = 'ЖІБЕРУ КЕЗІНДЕ ҚАТЕ ШЫҚТЫ. ҚАЙТА КӨРІҢІЗ.';
      errBox.hidden = false;
    }).then(function () {
      sendBtn.disabled = false;
      sendBtn.textContent = 'ЖІБЕРУ';
    });
  });

  /* Уже отвечал с этого телефона — сразу показываем результат */
  (function restore() {
    var saved;
    try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (_) {}
    if (saved && saved.answer) {
      if (saved.name) nameInput.value = saved.name;
      showDone(saved.answer, !!saved.coming);
    }
  })();

  $('redo').addEventListener('click', function () {
    try { localStorage.removeItem(STORE); } catch (_) {}
    doneBox.hidden = true;
    form.hidden = false;
    var pick = chosen();
    if (pick) pick.checked = false;
    form.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });

  /* ── Музыка ───────────────────────────────────────────────── */
  (function music() {
    if (!C.music) return;                 // файла нет — кнопки нет
    var audio = $('bg-music');
    var btn   = $('music-btn');
    audio.src = C.music;
    btn.hidden = false;

    /* Состояние кнопки ведём от событий плеера, а не от промиса
       play(): он резолвится только когда звук реально пошёл, а на
       части устройств может висеть — и подпись бы не переключилась,
       хотя музыка уже играет. */
    function sync() {
      var on = !audio.paused;
      btn.setAttribute('aria-pressed', String(on));
      btn.textContent = on ? 'ӘУЕНДІ ӨШІРУ' : 'ӘУЕНДІ ҚОСУ';
    }
    ['play', 'pause', 'ended'].forEach(function (ev) {
      audio.addEventListener(ev, sync);
    });

    /* Автозапуска нет намеренно: браузеры его блокируют,
       и звук без спроса раздражает. Только по клику. */
    btn.addEventListener('click', function () {
      if (audio.paused) audio.play().catch(sync);   // отказ — вернуть подпись
      else audio.pause();
    });
  })();

  $('totop').addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

})();
