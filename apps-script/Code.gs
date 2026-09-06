/* ═══════════════════════════════════════════════════════════════
   Приём ответов гостей в Google Таблицу.
   Целиком скопировать в script.google.com. Пошагово — в README.md.
   ═══════════════════════════════════════════════════════════════ */

// ID таблицы: берётся из её адреса
// https://docs.google.com/spreadsheets/d/ВОТ_ЭТА_ЧАСТЬ/edit
var SHEET_ID   = 'ВСТАВЬТЕ_ID_ТАБЛИЦЫ';
var SHEET_NAME = 'RSVP';

var HEADER = ['Уақыты', 'Аты-жөні', 'Жауабы', 'Адам саны', 'Тілегі', 'Сілтемедегі аты'];


/** Один раз нажать «Запустить» на этой функции — создаст лист и шапку. */
function setup() {
  var sh = sheet_();
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADER);
    sh.getRange(1, 1, 1, HEADER.length)
      .setFontWeight('bold')
      .setBackground('#F3EADA');
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 150);
    sh.setColumnWidth(2, 200);
    sh.setColumnWidth(3, 130);
    sh.setColumnWidth(5, 320);
  }
  Logger.log('Готово. Лист «' + SHEET_NAME + '» на месте.');
}


function doPost(e) {
  // Гости могут нажать «Жіберу» одновременно — без блокировки
  // два ответа могут записаться в одну строку.
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
  } catch (err) {
    return json_({ ok: false, error: 'busy' });
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json_({ ok: false, error: 'empty body' });
    }

    var d = JSON.parse(e.postData.contents);

    sheet_().appendRow([
      new Date(),
      String(d.name   || '').slice(0, 200),
      String(d.answer || '').slice(0, 60),
      String(d.guests || '').slice(0, 10),
      String(d.note   || '').slice(0, 1000),
      String(d.link   || '').slice(0, 200)
    ]);

    return json_({ ok: true });

  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}


/** Открыть /exec в браузере — быстрая проверка, что деплой живой. */
function doGet() {
  return json_({ ok: true, ping: true });
}


function sheet_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
