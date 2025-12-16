// ============================================
// BOOKMARKLET v2 - Эвотор POPUP
// ============================================
// Работает с модальным окном детализации чека
// ============================================

(function() {
  const WEBAPP_URL = 'ВСТАВЬ_СЮДА_URL';

  function parseCheck() {
    const result = { checkNumber: '', date: '', time: '', paymentType: '', checkTotal: 0, items: [] };
    const allText = document.body.innerText;

    console.log('=== ЭВОТОР ПАРСЕР v2 ===');

    // Номер чека
    const saleMatch = allText.match(/Продажа\s*№?\s*(\d+)/i);
    if (saleMatch) result.checkNumber = saleMatch[1];

    // Дата и время (19:36 16.12.25)
    const dtMatch = allText.match(/(\d{1,2}:\d{2})\s+(\d{1,2}\.\d{1,2}\.\d{2,4})/);
    if (dtMatch) {
      result.time = dtMatch[1];
      let d = dtMatch[2];
      if (d.match(/\.\d{2}$/)) d = d.replace(/(\d{2})$/, '20$1');
      result.date = d;
    }

    // Оплата
    result.paymentType = allText.includes('Электронная') ? 'Электронная' :
                         allText.includes('Наличные') ? 'Наличные' : '?';

    // Итого
    const totalMatch = allText.match(/Итого[:\s]*(\d[\d\s]*[,\.]\d{2})/i);
    if (totalMatch) {
      result.checkTotal = parseFloat(totalMatch[1].replace(/\s/g, '').replace(',', '.'));
    }

    // === ПАРСИНГ ТОВАРОВ ===
    const lines = allText.split('\n').map(l => l.trim()).filter(l => l);

    console.log('Все строки:', lines);

    // Находим заголовок таблицы товаров
    let startIdx = -1;
    let endIdx = lines.length;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Наименование товара')) {
        startIdx = i;
      }
      if (startIdx !== -1 && (lines[i].includes('Промежуточный итог') || lines[i].match(/^Итого:/))) {
        endIdx = i;
        break;
      }
    }

    console.log('Диапазон:', startIdx, '-', endIdx);

    if (startIdx !== -1) {
      let i = startIdx + 1;

      while (i < endIdx) {
        const line = lines[i];

        // Пропускаем заголовки колонок
        if (!line || line.includes('Цена') || line.includes('Кол-во') || line.includes('Скидка на позицию')) {
          i++;
          continue;
        }

        // Если строка содержит буквы и не начинается с цифры - это название товара
        if (/[а-яА-ЯёЁa-zA-Z]/.test(line) && !/^\d/.test(line)) {
          const itemName = line;

          // Следующие строки: цена, кол-во, скидка, стоимость
          const price = lines[i + 1] || '0';
          const qty = lines[i + 2] || '1';
          const discount = lines[i + 3] || '0';
          const itemTotal = lines[i + 4] || price;

          console.log('Товар:', itemName, '| Цена:', price, '| Кол-во:', qty, '| Скидка:', discount, '| Итого:', itemTotal);

          // Проверяем что цена - это число
          if (/\d/.test(price) && !price.includes('Цена') && !price.includes('шт')) {
            result.items.push({
              name: itemName,
              unitPrice: parseFloat(price.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0,
              qty: parseInt(qty.replace(/[^\d]/g, '')) || 1,
              discount: parseFloat(discount.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0,
              itemTotal: parseFloat(itemTotal.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0
            });
            i += 5;
          } else {
            i++;
          }
        } else {
          i++;
        }
      }
    }

    console.log('Найдено товаров:', result.items.length);
    console.log('Товары:', result.items);

    return result;
  }

  async function sendData(data) {
    const rows = data.items.map(item => ({
      date: data.date,
      time: data.time,
      checkNumber: data.checkNumber,
      itemName: item.name,
      volume: '-',
      qty: item.qty,
      unitPrice: item.unitPrice,
      discount: item.discount,
      itemTotal: item.itemTotal,
      checkTotal: data.checkTotal,
      paymentType: data.paymentType
    }));

    if (rows.length === 0) {
      alert(`Товары не найдены!\n\nЧек #${data.checkNumber}\nДата: ${data.date} ${data.time}\nИтого: ${data.checkTotal}₽\n\nОткрой F12 → Console для деталей`);
      return;
    }

    const preview = rows.map(r => `• ${r.itemName}: ${r.itemTotal}₽`).join('\n');

    if (!confirm(`Чек #${data.checkNumber}\n${data.date} ${data.time}\n\n${preview}\n\nИтого: ${data.checkTotal}₽\n\nОтправить?`)) return;

    try {
      await fetch(WEBAPP_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ rows })
      });
      alert('Отправлено!');
    } catch (e) {
      alert('Ошибка: ' + e);
    }
  }

  const data = parseCheck();
  if (!data.checkNumber) {
    alert('Чек не найден! Открой детализацию чека.');
    return;
  }
  sendData(data);
})();
