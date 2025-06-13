const TEMPLATE_ID = '1hqHM3O7pZNZ56zgb-nZJubYTs1zB2z1O42KCDRAXx2M';
const FOLDER_ID = '1eHbDCawBYyRse6UNuTS3Z3coxeb80Zqr';
const SPREADSHEET_ID = '1yKl8WDZQORJoVhfZ-zyyHXq2A1XCnC09wt9Q3b2bcq8';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index');
}

function formatDate(dateStr) {
  if (!dateStr || dateStr.indexOf('-') === -1) return dateStr;
  const [yyyy, mm, dd] = dateStr.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

function getProjectNames() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Lists");
  const values = sheet.getRange("A:A").getValues().flat().filter(String);
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function getProjectDetails(projectName) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Lists");
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === projectName) {
      const tax = typeof values[i][5] === 'number' ? values[i][5] * 100 : parseFloat(values[i][5]);
      const currencyMap = { 'USD': '$', 'EUR': '€', 'UAH': '₴' };
      return {
        clientName: values[i][1] || '',
        clientNumber: `${values[i][2] || ''} ${values[i][3] || ''}`.trim(),
        clientAddress: values[i][4] || '',
        tax: isNaN(tax) ? 0 : tax.toFixed(0),
        currency: currencyMap[values[i][8]] || values[i][8],
        paymentDelay: parseInt(values[i][10]) || 0,
        dayType: (values[i][9] || '').toString().trim().toUpperCase()
      };
    }
  }
  return null;
}

function processForm(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];

  if (sheet.getLastRow() === 0) {
    const baseHeaders = [
      'Project Name', 'Invoice Number', 'Client Name', 'Client Address', 'Client Number',
      'Invoice Date', 'Due Date', 'Tax Rate (%)', 'Subtotal', 'Tax Amount',
      'Total', 'Exchange Rate', 'Currency', 'Amount in EUR',
      'Bank Details 1', 'Bank Details 2',
      'Google Doc Link', 'PDF Link'
    ];

    const itemHeaders = [];
    for (let i = 1; i <= 20; i++) {
      itemHeaders.push(`Row ${i} #`);
      itemHeaders.push(`Row ${i} Service`);
      itemHeaders.push(`Row ${i} Period`);
      itemHeaders.push(`Row ${i} Quantity`);
      itemHeaders.push(`Row ${i} Rate/hour`);
      itemHeaders.push(`Row ${i} Amount`);
    }

    sheet.appendRow([...baseHeaders, ...itemHeaders]);
  }

  const formattedDate = formatDate(data.invoiceDate);
  const formattedDueDate = data.dueDate;

  const subtotalNum = parseFloat(data.subtotal) || 0;
  const taxRate = parseFloat(data.tax) || 0;
  const taxAmount = subtotalNum * taxRate / 100;
  const totalAmount = subtotalNum + taxAmount;

  const itemCells = [];
  data.items.forEach((row, i) => {
    row[0] = (i + 1).toString();
    itemCells.push(...row);
  });

  const row = [
    data.projectName,
    data.invoiceNumber,
    data.clientName,
    data.clientAddress,
    data.clientNumber,
    formattedDate,
    formattedDueDate,
    taxRate.toFixed(0),
    subtotalNum.toFixed(2),
    taxAmount.toFixed(2),
    totalAmount.toFixed(2),
    parseFloat(data.exchangeRate).toFixed(4),
    data.currency,
    parseFloat(data.amountInEUR).toFixed(2),
    data.bankDetails1,
    data.bankDetails2,
    '',
    '',
    ...itemCells
  ];

  const newRowIndex = sheet.getLastRow() + 1;
  sheet.appendRow(row);

  const doc = createInvoiceDoc(data, formattedDate, formattedDueDate, subtotalNum, taxRate, taxAmount, totalAmount);

  Utilities.sleep(500);
  const pdf = doc.getAs('application/pdf');
  Utilities.sleep(500);
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const pdfFile = folder.createFile(pdf).setName(`${data.invoiceNumber}.pdf`);

  sheet.getRange(newRowIndex, 17).setValue(doc.getUrl());
  sheet.getRange(newRowIndex, 18).setValue(pdfFile.getUrl());

  return {
    docUrl: doc.getUrl(),
    pdfUrl: pdfFile.getUrl()
  };
}

function createInvoiceDoc(data, formattedDate, formattedDueDate, subtotal, taxRate, taxAmount, totalAmount) {
  const template = DriveApp.getFileById(TEMPLATE_ID);
  const folder = DriveApp.getFolderById(FOLDER_ID);

  Utilities.sleep(500);
  const copy = template.makeCopy(`Invoice ${data.invoiceNumber}`, folder);
  const doc = DocumentApp.openById(copy.getId());
  const body = doc.getBody();

  const tables = body.getTables();
  let targetTable = null;

  for (const table of tables) {
    if (table.getNumRows() > 0) {
      const headerRow = table.getRow(0);
      const headerTexts = [];
      for (let i = 0; i < headerRow.getNumCells(); i++) {
        headerTexts.push(headerRow.getCell(i).getText().trim());
      }
      const expectedHeaders = ['#', 'Services', 'Period', 'Quantity', 'Rate/hour', 'Amount'];
      if (expectedHeaders.every((header, index) => headerTexts[index] === header)) {
        targetTable = table;
        break;
      }
    }
  }

  if (!targetTable) {
    throw new Error('❗️Не найдена таблица с нужной шапкой (#, Services, Period, Quantity, Rate/hour, Amount). Проверьте шаблон!');
  }

  const existingRows = targetTable.getNumRows();
  for (let i = existingRows - 1; i > 0; i--) {
    targetTable.removeRow(i);
  }

  data.items.forEach(row => {
    const newRow = targetTable.appendTableRow();
    row.forEach((cell, index) => {
      if (index === 4 || index === 5) {
        newRow.appendTableCell(cell ? `${data.currency}${parseFloat(cell).toFixed(2)}` : '');
      } else {
        newRow.appendTableCell(cell || '');
      }
    });
  });

  body.replaceText('\\{Project Name\\}', data.projectName);
  body.replaceText('\\{Название клиента\\}', data.clientName);
  body.replaceText('\\{Адрес клиента\\}', data.clientAddress);
  body.replaceText('\\{Номер клиента\\}', data.clientNumber);
  body.replaceText('\\{Номер счета\\}', data.invoiceNumber);
  body.replaceText('\\{Дата счета\\}', formattedDate);
  body.replaceText('\\{Due date\\}', formattedDueDate);
  body.replaceText('\\{VAT%\\}', taxRate.toFixed(0));
  body.replaceText('\\{Сумма НДС\\}', `${data.currency}${taxAmount.toFixed(2)}`);
  body.replaceText('\\{Сумма общая\\}', `${data.currency}${totalAmount.toFixed(2)}`);
  body.replaceText('\\{Exchange Rate\\}', parseFloat(data.exchangeRate).toFixed(4));
  body.replaceText('\\{Amount in EUR\\}', `€${parseFloat(data.amountInEUR).toFixed(2)}`);
  body.replaceText('\\{Банковские реквизиты1\\}', data.bankDetails1);
  body.replaceText('\\{Банковские реквизиты2\\}', data.bankDetails2);

  for (let i = 0; i < 20; i++) {
    const item = data.items[i];
    if (item) {
      const service = item[1] || '';
      const period = item[2] || '';
      const qty = item[3] || '';
      const rate = item[4] ? `${data.currency}${parseFloat(item[4]).toFixed(2)}` : null;
      const amount = item[5] ? `${data.currency}${parseFloat(item[5]).toFixed(2)}` : null;

      body.replaceText(`\\{Вид работ-${i + 1}\\}`, service);
      body.replaceText(`\\{Период работы-${i + 1}\\}`, period);
      body.replaceText(`\\{Часы-${i + 1}\\}`, qty);
      if (rate) body.replaceText(`\\{Рейт-${i + 1}\\}`, rate);
      if (amount) body.replaceText(`\\{Сумма-${i + 1}\\}`, amount);
    }
  }

  doc.saveAndClose();
  return doc;
}
