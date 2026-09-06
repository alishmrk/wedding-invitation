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

  /* ── Имя гостя из ссылки: ?g=Ерлан%20аға ──────────────────── */
  function guestFromUrl() {
    var q = new URLSearchParams(location.search);
    var raw = q.get('g') || q.get('to') || q.get('name') || '';
    return raw.replace(/\s+/g, ' ').trim().slice(0, 60);
  }

  var guest = guestFromUrl();

  /* ── Заполняем страницу из config.js ──────────────────────── */
  put('guest',     guest || 'қонақтар');
  put('bride',     C.bride);
  put('bride-2',   C.bride);
  put('parents',   C.parents);
  put('date-text', C.dateText);
  put('time-text', C.timeText);
  put('venue',     C.venue);
  put('address',   C.address);

  if (C.bride) document.title = C.bride + ' — қыз ұзату тойына шақыру';

  (function maps() {
    var pairs = [['map-2gis', C.map2gis], ['map-google', C.mapGoogle]];
    pairs.forEach(function (p) {
      var el = $(p[0]);
      if (el && p[1]) { el.href = p[1]; el.hidden = false; }
    });
  })();

  (function contacts() {
    var ul = $('contacts');
    if (!ul || !Array.isArray(C.contacts)) return;
    C.contacts.forEach(function (c) {
      if (!c || !c.tel) return;
      var li = document.createElement('li');
      if (c.name) {
        var who = document.createElement('span');
        who.className = 'who';
        who.textContent = c.name + ' — ';
        li.appendChild(who);
      }
      var a = document.createElement('a');
      a.href = 'tel:' + c.tel.replace(/[^\d+]/g, '');
      a.textContent = c.tel;
      li.appendChild(a);
      ul.appendChild(li);
    });
  })();

  /* ── RSVP ─────────────────────────────────────────────────── */
  var form       = $('rsvp-form');
  var doneBox    = $('rsvp-done');
  var errBox     = $('f-err');
  var nameInput  = $('f-name');
  var guestsWrap = $('f-guests-wrap');
  var sendBtn    = $('f-send');
  var choiceBtns = Array.prototype.slice.call(
    document.querySelectorAll('[data-answer]')
  );

  var answer = '';
  var STORE = 'uzatu-rsvp';

  if (nameInput && guest) nameInput.value = guest;

  /* Заметка организатору, а не гостю — поэтому по-русски.
     Показывается, только пока rsvpUrl в config.js пустой. */
  if (!C.rsvpUrl) {
    var warn = document.createElement('p');
    warn.className = 'err';
    warn.style.marginBottom = '18px';
    warn.textContent =
      '⚠️ config.js → rsvpUrl не заполнен. Ответы гостей никуда не сохраняются. ' +
      'Инструкция — в README.md.';
    var rsvpSection = $('rsvp');
    rsvpSection.insertBefore(warn, rsvpSection.querySelector('.choice'));
  }

  choiceBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      answer = btn.dataset.answer;
      choiceBtns.forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      form.hidden = false;
      /* «Қанша адам» имеет смысл только для тех, кто придёт */
      guestsWrap.hidden = (answer !== 'Келемін');
      if (!nameInput.value) nameInput.focus();
    });
  });

  function showDone(ans) {
    form.hidden = true;
    document.querySelector('.choice').hidden = true;
    var h = document.querySelector('#rsvp .hint');
    if (h) h.hidden = true;
    doneBox.hidden = false;
    $('done-title').textContent = ans === 'Келемін' ? 'Рақмет!' : 'Түсіндік';
    $('done-text').textContent = ans === 'Келемін'
      ? 'Жауабыңыз қабылданды. Тойда кездескенше!'
      : 'Жауабыңыз қабылданды. Келе алмағаныңыз өкінішті.';
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

    var who = nameInput.value.trim();
    if (!who) { nameInput.focus(); return; }

    var payload = {
      name:   who,
      answer: answer,
      guests: answer === 'Келемін' ? $('f-guests').value : '',
      note:   $('f-note').value.trim(),
      link:   guest,
      page:   location.href,
    };

    if (!C.rsvpUrl) { showDone(answer); return; }

    sendBtn.disabled = true;
    sendBtn.textContent = 'Жіберілуде…';

    send(payload).then(function () {
      try {
        localStorage.setItem(STORE, JSON.stringify({ answer: answer, name: who }));
      } catch (_) {}
      showDone(answer);
    }).catch(function () {
      errBox.textContent =
        'Жіберу кезінде қате шықты. Қайта көріңіз немесе телефон арқылы хабарласыңыз.';
      errBox.hidden = false;
    }).then(function () {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Жіберу';
    });
  });

  /* Уже отвечал с этого телефона — сразу показываем результат */
  (function restore() {
    var saved;
    try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (_) {}
    if (saved && saved.answer) {
      answer = saved.answer;
      if (saved.name && nameInput) nameInput.value = saved.name;
      showDone(saved.answer);
    }
  })();

  /* Передумал — возвращаем кнопки выбора */
  $('redo').addEventListener('click', function () {
    try { localStorage.removeItem(STORE); } catch (_) {}
    doneBox.hidden = true;
    document.querySelector('.choice').hidden = false;
    var h = document.querySelector('#rsvp .hint');
    if (h) h.hidden = false;
    choiceBtns.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    answer = '';
    document.querySelector('.choice').scrollIntoView({ block: 'center', behavior: 'smooth' });
  });

  /* ── Музыка ───────────────────────────────────────────────── */
  (function music() {
    if (!C.music) return;                 // файла нет — кнопки нет
    var audio = $('bg-music');
    var btn   = $('music-btn');
    audio.src = C.music;
    btn.hidden = false;
    btn.setAttribute('aria-pressed', 'false');

    /* Автозапуска нет намеренно: браузеры его блокируют,
       и звук без спроса раздражает. Только по клику. */
    btn.addEventListener('click', function () {
      if (audio.paused) {
        audio.play().then(function () {
          btn.setAttribute('aria-pressed', 'true');
          btn.setAttribute('aria-label', 'Әуенді өшіру');
        }).catch(function () {});
      } else {
        audio.pause();
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-label', 'Әуенді қосу');
      }
    });
  })();

  /* ── Появление блоков при скролле ─────────────────────────── */
  (function reveal() {
    var items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    items.forEach(function (el) { io.observe(el); });
  })();

})();
