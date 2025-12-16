// ============================================
// BOOKMARKLET - Парсинг чека Эвотор
// ============================================
// Инструкция:
// 1. Создай новую закладку в браузере
// 2. Название: "Эвотор → Таблица"
// 3. В поле URL вставь код из файла bookmarklet-minified.txt
// 4. Открой детализацию чека в Эвоторе
// 5. Нажми на закладку
// ============================================

(function() {
  // ВАЖНО: Вставь сюда URL твоего Google Apps Script
  const WEBAPP_URL = 'ВСТАВЬ_СЮДА_URL_GOOGLE_APPS_SCRIPT';

  // Функция парсинга чека
  function parseCheck() {
    const result = {
      checkNumber: '',
      date: '',
      time: '',
      paymentType: '',
      checkTotal: 0,
      items: []
    };

    // Ищем номер чека (обычно в заголовке или рядом с "Продажа №")
    const allText = document.body.innerText;

    // Продажа №
    const saleMatch = allText.match(/Продажа\s*№?\s*(\d+)/i);
    if (saleMatch) {
      result.checkNumber = saleMatch[1];
    }

    // Дата и время (формат: 19:52 15.12.25 или 15.12.2025 19:52)
    const dateTimeMatch = allText.match(/(\d{1,2}:\d{2})\s+(\d{1,2}\.\d{1,2}\.\d{2,4})/);
    if (dateTimeMatch) {
      result.time = dateTimeMatch[1];
      let dateStr = dateTimeMatch[2];
      // Преобразуем 15.12.25 в 15.12.2025
      if (dateStr.match(/\d{2}\.\d{2}\.\d{2}$/)) {
        dateStr = dateStr.replace(/(\d{2})$/, '20$1');
      }
      result.date = dateStr;
    }

    // Вид оплаты
    if (allText.includes('Электронная')) {
      result.paymentType = 'Электронная';
    } else if (allText.includes('Наличные')) {
      result.paymentType = 'Наличные';
    } else {
      result.paymentType = 'Неизвестно';
    }

    // Итого чека
    const totalMatch = allText.match(/Итого[:\s]*(\d[\d\s]*[,\.]\d{2})/i);
    if (totalMatch) {
      result.checkTotal = parseFloat(totalMatch[1].replace(/\s/g, '').replace(',', '.'));
    }

    // Парсим таблицу товаров
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
      const rows = table.querySelectorAll('tr');
      rows.forEach((row, index) => {
        if (index === 0) return; // Пропускаем заголовок

        const cells = row.querySelectorAll('td');
        if (cells.length >= 4) {
          const itemName = cells[0]?.innerText?.trim() || '';
          const priceText = cells[1]?.innerText?.trim() || '0';
          const qtyText = cells[2]?.innerText?.trim() || '1';
          const discountText = cells[3]?.innerText?.trim() || '0';
          const totalText = cells[4]?.innerText?.trim() || priceText;

          if (itemName && !itemName.includes('Наименование')) {
            result.items.push({
              name: itemName,
              unitPrice: parseFloat(priceText.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0,
              qty: parseInt(qtyText.replace(/[^\d]/g, '')) || 1,
              discount: parseFloat(discountText.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0,
              itemTotal: parseFloat(totalText.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0
            });
          }
        }
      });
    });

    // Если таблицу не нашли, пробуем искать div'ы с товарами
    if (result.items.length === 0) {
      // Ищем строки с ценами
      const allElements = document.querySelectorAll('div, span, p');
      let currentItem = null;

      allElements.forEach(el => {
        const text = el.innerText?.trim();
        if (!text) return;

        // Ищем паттерн цены: 280,00
        const pricePattern = /^(\d+[,\.]\d{2})$/;
        const qtyPattern = /^(\d+)\s*шт/;

        // Это очень упрощённый парсинг, может потребовать доработки
      });
    }

    return result;
  }

  // Функция отправки данных
  async function sendData(checkData) {
    const rows = checkData.items.map(item => ({
      date: checkData.date,
      time: checkData.time,
      checkNumber: checkData.checkNumber,
      itemName: item.name,
      volume: '-', // Объём обычно в названии товара
      qty: item.qty,
      unitPrice: item.unitPrice,
      discount: item.discount,
      itemTotal: item.itemTotal,
      checkTotal: checkData.checkTotal,
      paymentType: checkData.paymentType
    }));

    if (rows.length === 0) {
      alert('Не найдено товаров в чеке!\n\nПопробуй открыть детализацию чека и нажать снова.');
      return;
    }

    // Показываем что нашли
    const preview = rows.map(r =>
      `${r.itemName}: ${r.unitPrice}₽ x ${r.qty} = ${r.itemTotal}₽`
    ).join('\n');

    const confirm = window.confirm(
      `Найдено ${rows.length} позиций:\n\n${preview}\n\nОтправить в таблицу?`
    );

    if (!confirm) return;

    try {
      const response = await fetch(WEBAPP_URL, {
        method: 'POST',
        mode: 'no-cors', // Для обхода CORS
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rows })
      });

      alert('Данные отправлены! Проверь таблицу.');
    } catch (error) {
      alert('Ошибка отправки: ' + error.message);
    }
  }

  // Запускаем
  const checkData = parseCheck();

  if (!checkData.checkNumber) {
    alert('Не удалось найти номер чека.\n\nУбедись что открыта страница детализации чека.');
    return;
  }

  console.log('Parsed check data:', checkData);
  sendData(checkData);

})();
