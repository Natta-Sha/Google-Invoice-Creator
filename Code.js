const FOLDER_ID = "1eHbDCawBYyRse6UNuTS3Z3coxeb80Zqr";
const SPREADSHEET_ID = "1yKl8WDZQORJoVhfZ-zyyHXq2A1XCnC09wt9Q3b2bcq8";

function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index");
}

function formatDate(dateStr) {
  if (!dateStr || dateStr.indexOf("-") === -1) return dateStr;
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

  const bankMap = {};
  let selectedTemplateName = "";
  let selectedTemplateId = "";

  // 1. Сначала находим строку с нужным проектом
  let projectRow = null;
  for (let i = 1; i < values.length; i++) {
    const name = (values[i][0] || "").toString().trim();
    if (name.toLowerCase() === projectName.toString().trim().toLowerCase()) {
      projectRow = values[i];
      break;
    }
  }

  if (!projectRow) {
    throw new Error(`❗ Project "${projectName}" not found in column A.`);
  }

  // 2. Получаем название шаблона из столбца N (index 13)
  selectedTemplateName = (projectRow[13] || "").toString().trim();
  if (!selectedTemplateName) {
    throw new Error(
      `🚫 No invoice template name specified for project "${projectName}". Please fill in column N.`
    );
  }

  // 3. Находим шаблон в справочнике шаблонов (T: 19, U: 20)
  for (let i = 1; i < values.length; i++) {
    const templateName = (values[i][19] || "").toString().trim();
    const templateId = (values[i][20] || "").toString().trim();
    if (
      templateName.toLowerCase() === selectedTemplateName.toLowerCase() &&
      templateId
    ) {
      selectedTemplateId = templateId;
      break;
    }
  }

  if (!selectedTemplateId) {
    throw new Error(
      `🚫 No invoice template found for "${selectedTemplateName}". Please check columns T and U in 'Lists'.`
    );
  }

  // 4. Сопоставление банков по Q (16) → R (17)
  for (let i = 1; i < values.length; i++) {
    const short = (values[i][16] || "").toString().trim();
    const full = (values[i][17] || "").toString().trim();
    if (short && full) {
      bankMap[short] = full;
    }
  }

  const tax =
    typeof projectRow[5] === "number"
      ? projectRow[5] * 100
      : parseFloat(projectRow[5]);
  const currencyMap = { USD: "$", EUR: "€", UAH: "₴" };

  const shortBank1 = (projectRow[6] || "").toString().trim();
  const shortBank2 = (projectRow[7] || "").toString().trim();

  return {
    clientName: projectRow[1] || "",
    clientNumber: `${projectRow[2] || ""} ${projectRow[3] || ""}`.trim(),
    clientAddress: projectRow[4] || "",
    tax: isNaN(tax) ? 0 : tax.toFixed(0),
    currency: currencyMap[projectRow[8]] || projectRow[8],
    paymentDelay: parseInt(projectRow[10]) || 0,
    dayType: (projectRow[9] || "").toString().trim().toUpperCase(),
    bankDetails1: bankMap[shortBank1] || "",
    bankDetails2: bankMap[shortBank2] || "",
    ourCompany: projectRow[14] || "",
    templateId: selectedTemplateId,
  };
}

function processForm(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];

  if (sheet.getLastRow() === 0) {
    const baseHeaders = [
      "Project Name",
      "Invoice Number",
      "Client Name",
      "Client Address",
      "Client Number",
      "Invoice Date",
      "Due Date",
      "Tax Rate (%)",
      "Subtotal",
      "Tax Amount",
      "Total",
      "Exchange Rate",
      "Currency",
      "Amount in EUR",
      "Bank Details 1",
      "Bank Details 2",
      "Our Company",
      "Comment",
      "Google Doc Link",
      "PDF Link",
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
  const formattedDueDate = formatDate(data.dueDate);

  const subtotalNum = parseFloat(data.subtotal) || 0;
  const taxRate = parseFloat(data.tax) || 0;
  const taxAmount = (subtotalNum * taxRate) / 100;
  const totalAmount = subtotalNum + taxAmount;

  const itemCells = [];
  data.items.forEach((row, i) => {
    const newRow = [...row]; // копия массива
    newRow[0] = (i + 1).toString();
    itemCells.push(...newRow);
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
    data.currency === "$" ? parseFloat(data.exchangeRate).toFixed(4) : "",
    data.currency,
    data.currency === "$" ? parseFloat(data.amountInEUR).toFixed(2) : "",
    data.bankDetails1,
    data.bankDetails2,
    data.ourCompany || "",
    data.comment || "",
    "",
    "", // ссылки позже
    ...itemCells,
  ];

  const newRowIndex = sheet.getLastRow() + 1;
  sheet.appendRow(row);

  const doc = createInvoiceDoc(
    data,
    formattedDate,
    formattedDueDate,
    subtotalNum,
    taxRate,
    taxAmount,
    totalAmount,
    data.templateId
  );

  Utilities.sleep(500);
  const pdf = doc.getAs("application/pdf");
  const folder = DriveApp.getFolderById(FOLDER_ID);

  const cleanCompany = (data.ourCompany || "")
    .replace(/[\\/:*?"<>|]/g, "")
    .trim();
  const cleanClient = (data.clientName || "")
    .replace(/[\\/:*?"<>|]/g, "")
    .trim();
  const filename = `${data.invoiceDate}_Invoice${data.invoiceNumber}_${cleanCompany}-${cleanClient}`;

  const pdfFile = folder.createFile(pdf).setName(`${filename}.pdf`);

  sheet.getRange(newRowIndex, 19).setValue(doc.getUrl());
  sheet.getRange(newRowIndex, 20).setValue(pdfFile.getUrl());

  return {
    docUrl: doc.getUrl(),
    pdfUrl: pdfFile.getUrl(),
  };
}

function createInvoiceDoc(
  data,
  formattedDate,
  formattedDueDate,
  subtotal,
  taxRate,
  taxAmount,
  totalAmount,
  templateId
) {
  if (!templateId) {
    throw new Error(
      "🚫 No invoice template found for the selected project. Please check Clients details and ensure the template of invoice is chosen."
    );
  }
  const template = DriveApp.getFileById(templateId);
  const folder = DriveApp.getFolderById(FOLDER_ID);

  const invoiceDateForName = data.invoiceDate.replace(/-/g, "_");
  const cleanCompany = (data.ourCompany || "")
    .replace(/[\\/:*?"<>|]/g, "")
    .trim();
  const cleanClient = (data.clientName || "")
    .replace(/[\\/:*?"<>|]/g, "")
    .trim();
  const filename = `${data.invoiceDate}_Invoice${data.invoiceNumber}_${cleanCompany}-${cleanClient}`;

  const copy = template.makeCopy(filename, folder);
  const doc = DocumentApp.openById(copy.getId());
  const body = doc.getBody();

  if (data.currency !== "$") {
    const paragraphs = body.getParagraphs();
    for (let i = 0; i < paragraphs.length; i++) {
      const text = paragraphs[i].getText();
      if (text.includes("Exchange Rate Notice")) {
        paragraphs[i].removeFromParent();
        if (i + 1 < paragraphs.length) paragraphs[i + 1].removeFromParent();
        break;
      }
    }
  } else {
    body.replaceText(
      "\\{Exchange Rate\\}",
      parseFloat(data.exchangeRate).toFixed(4)
    );
    body.replaceText(
      "\\{Amount in EUR\\}",
      `€${parseFloat(data.amountInEUR).toFixed(2)}`
    );
  }

  const tables = body.getTables();
  let targetTable = null;

  for (const table of tables) {
    const headers = [];
    for (let i = 0; i < table.getRow(0).getNumCells(); i++) {
      headers.push(table.getRow(0).getCell(i).getText().trim());
    }
    if (
      headers.length >= 6 &&
      headers[0] === "#" &&
      headers[1] === "Services" &&
      headers[2] === "Period" &&
      headers[3] === "Quantity" &&
      headers[4] === "Rate/hour" &&
      headers[5] === "Amount"
    ) {
      targetTable = table;
      break;
    }
  }

  if (!targetTable) {
    throw new Error(
      "❗ Не найдена таблица с нужной шапкой (#, Services, Period, ...)"
    );
  }

  const numRows = targetTable.getNumRows();
  for (let i = numRows - 1; i > 0; i--) {
    targetTable.removeRow(i);
  }

  data.items.forEach((row) => {
    const newRow = targetTable.appendTableRow();
    row.forEach((cell, index) => {
      const tableCell = newRow.appendTableCell();
      if (index === 4 || index === 5) {
        tableCell.setText(
          cell ? `${data.currency}${parseFloat(cell).toFixed(2)}` : ""
        );
      } else {
        tableCell.setText(cell || "");
      }
      // Сбросить стиль: делаем обычный текст
      const text = tableCell.getChild(0).asText();
      text.setBold(false);
      text.setItalic(false);
      text.setUnderline(false);
      text.setFontSize(null);
      text.setFontFamily(null);
    });
  });

  body.replaceText("\\{Project Name\\}", data.projectName);
  body.replaceText("\\{Название клиента\\}", data.clientName);
  body.replaceText("\\{Адрес клиента\\}", data.clientAddress);
  body.replaceText("\\{Номер клиента\\}", data.clientNumber);
  body.replaceText("\\{Номер счета\\}", data.invoiceNumber);
  body.replaceText("\\{Дата счета\\}", formattedDate);
  body.replaceText("\\{Due date\\}", formattedDueDate);
  body.replaceText("\\{VAT%\\}", taxRate.toFixed(0));
  body.replaceText(
    "\\{Сумма НДС\\}",
    `${data.currency}${taxAmount.toFixed(2)}`
  );
  body.replaceText(
    "\\{Сумма общая\\}",
    `${data.currency}${totalAmount.toFixed(2)}`
  );
  body.replaceText("\\{Банковские реквизиты1\\}", data.bankDetails1);
  body.replaceText("\\{Банковские реквизиты2\\}", data.bankDetails2);
  body.replaceText("\\{Комментарий\\}", data.comment || "");

  for (let i = 0; i < 20; i++) {
    const item = data.items[i];
    if (item) {
      body.replaceText(`\\{Вид работ-${i + 1}\\}`, item[1] || "");
      body.replaceText(`\\{Период работы-${i + 1}\\}`, item[2] || "");
      body.replaceText(`\\{Часы-${i + 1}\\}`, item[3] || "");
      if (item[4])
        body.replaceText(
          `\\{Рейт-${i + 1}\\}`,
          `${data.currency}${parseFloat(item[4]).toFixed(2)}`
        );
      if (item[5])
        body.replaceText(
          `\\{Сумма-${i + 1}\\}`,
          `${data.currency}${parseFloat(item[5]).toFixed(2)}`
        );
    }
  }

  doc.saveAndClose();
  return doc;
}
