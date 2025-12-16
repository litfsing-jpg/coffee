// ============================================
// GOOGLE APPS SCRIPT - Вставить в Google Sheets
// ============================================
// Инструкция:
// 1. Открой свою Google Таблицу
// 2. Расширения → Apps Script
// 3. Удали весь код и вставь этот
// 4. Сохрани (Ctrl+S)
// 5. Развернуть → Новое развертывание
// 6. Тип: Веб-приложение
// 7. Доступ: Все (Anyone)
// 8. Скопируй URL веб-приложения
// ============================================

function doPost(e) {
  try {
    // ID твоей таблицы (возьми из URL таблицы)
    // https://docs.google.com/spreadsheets/d/ТВОЙ_ID_ЗДЕСЬ/edit
    const SPREADSHEET_ID = 'ВСТАВЬ_СЮДА_ID_ТАБЛИЦЫ';
    const SHEET_NAME = 'Детализация продаж'; // Название листа

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({error: 'Лист не найден: ' + SHEET_NAME}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = JSON.parse(e.postData.contents);
    const rows = data.rows || [];

    if (!rows.length) {
      return ContentService
        .createTextOutput(JSON.stringify({status: 'ok', message: 'Нет данных'}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Формируем массив для записи
    // Колонки: Дата | Время | № Чека | Товар | Объём | Кол-во | Цена за ед. | Скидка | Сумма товара | Итого чека | Оплата
    const values = rows.map(r => ([
      r.date,        // A - Дата
      r.time,        // B - Время
      r.checkNumber, // C - № Чека
      r.itemName,    // D - Товар
      r.volume,      // E - Объём
      r.qty,         // F - Кол-во
      r.unitPrice,   // G - Цена за ед.
      r.discount,    // H - Скидка
      r.itemTotal,   // I - Сумма товара
      r.checkTotal,  // J - Итого чека
      r.paymentType  // K - Оплата
    ]));

    // Находим первую свободную строку
    const startRow = sheet.getLastRow() + 1;

    // Записываем данные
    sheet.getRange(startRow, 1, values.length, values[0].length).setValues(values);

    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'ok',
        inserted: values.length,
        message: 'Добавлено ' + values.length + ' строк'
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Тестовая функция для проверки
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({status: 'ok', message: 'Сервер работает!'}))
    .setMimeType(ContentService.MimeType.JSON);
}
