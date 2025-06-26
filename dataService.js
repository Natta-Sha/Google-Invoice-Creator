// Data access layer for spreadsheet operations

/**
 * Get project names from the Lists sheet
 * @returns {Array} Array of unique project names
 */
function getProjectNamesFromData() {
  try {
    const spreadsheet = getSpreadsheet(CONFIG.SPREADSHEET_ID);
    const sheet = getSheet(spreadsheet, CONFIG.SHEETS.LISTS);
    const values = sheet.getRange("A:A").getValues().flat().filter(String);
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  } catch (error) {
    console.error("Error getting project names:", error);
    return [];
  }
}

/**
 * Get project details from the Lists sheet
 * @param {string} projectName - Name of the project
 * @returns {Object} Project details object
 */
function getProjectDetailsFromData(projectName) {
  try {
    const spreadsheet = getSpreadsheet(CONFIG.SPREADSHEET_ID);
    const sheet = getSheet(spreadsheet, CONFIG.SHEETS.LISTS);
    const values = sheet.getDataRange().getValues();

    const templateMap = new Map();
    const bankMap = new Map();
    let projectRow = null;

    // Process all rows to build maps and find project
    for (let i = 1; i < values.length; i++) {
      const row = values[i];

      // Find project row
      const name = (row[CONFIG.COLUMNS.PROJECT_NAME] || "").toString().trim();
      if (
        !projectRow &&
        name.toLowerCase() === projectName.toString().trim().toLowerCase()
      ) {
        projectRow = row;
      }

      // Build template map (columns T/U → 19/20)
      const templateName = (row[CONFIG.COLUMNS.TEMPLATE_NAME_COL] || "")
        .toString()
        .trim();
      const templateId = (row[CONFIG.COLUMNS.TEMPLATE_ID_COL] || "")
        .toString()
        .trim();
      if (templateName && templateId) {
        templateMap.set(templateName.toLowerCase(), templateId);
      }

      // Build bank map (columns Q/R → 16/17)
      const short = (row[CONFIG.COLUMNS.BANK_SHORT_COL] || "")
        .toString()
        .trim();
      const full = (row[CONFIG.COLUMNS.BANK_FULL_COL] || "").toString().trim();
      if (short && full) {
        bankMap.set(short, full);
      }
    }

    if (!projectRow) {
      throw new Error(ERROR_MESSAGES.PROJECT_NOT_FOUND(projectName));
    }

    const selectedTemplateName = (
      projectRow[CONFIG.COLUMNS.TEMPLATE_NAME] || ""
    )
      .toString()
      .trim();
    if (!selectedTemplateName) {
      throw new Error(ERROR_MESSAGES.NO_TEMPLATE_NAME(projectName));
    }

    const selectedTemplateId = templateMap.get(
      selectedTemplateName.toLowerCase()
    );
    if (!selectedTemplateId) {
      throw new Error(ERROR_MESSAGES.NO_TEMPLATE_FOUND(selectedTemplateName));
    }

    // Process tax rate
    const tax =
      typeof projectRow[CONFIG.COLUMNS.TAX_RATE] === "number"
        ? projectRow[CONFIG.COLUMNS.TAX_RATE] * 100
        : parseFloat(projectRow[CONFIG.COLUMNS.TAX_RATE]);

    // Get bank details
    const shortBank1 = (projectRow[CONFIG.COLUMNS.BANK_SHORT_1] || "")
      .toString()
      .trim();
    const shortBank2 = (projectRow[CONFIG.COLUMNS.BANK_SHORT_2] || "")
      .toString()
      .trim();

    return {
      clientName: projectRow[CONFIG.COLUMNS.CLIENT_NAME] || "",
      clientNumber: `${projectRow[CONFIG.COLUMNS.CLIENT_NUMBER_PART1] || ""} ${
        projectRow[CONFIG.COLUMNS.CLIENT_NUMBER_PART2] || ""
      }`.trim(),
      clientAddress: projectRow[CONFIG.COLUMNS.CLIENT_ADDRESS] || "",
      tax: isNaN(tax) ? 0 : tax.toFixed(0),
      currency:
        CONFIG.CURRENCY_SYMBOLS[projectRow[CONFIG.COLUMNS.CURRENCY]] ||
        projectRow[CONFIG.COLUMNS.CURRENCY],
      paymentDelay: parseInt(projectRow[CONFIG.COLUMNS.PAYMENT_DELAY]) || 0,
      dayType: (projectRow[CONFIG.COLUMNS.DAY_TYPE] || "")
        .toString()
        .trim()
        .toUpperCase(),
      bankDetails1: bankMap.get(shortBank1) || "",
      bankDetails2: bankMap.get(shortBank2) || "",
      ourCompany: projectRow[CONFIG.COLUMNS.OUR_COMPANY] || "",
      templateId: selectedTemplateId,
    };
  } catch (error) {
    console.error("Error getting project details:", error);
    throw error;
  }
}

/**
 * Get invoice list from the Invoices sheet
 * @returns {Array} Array of invoice objects
 */
function getInvoiceListFromData() {
  try {
    var cache = CacheService.getScriptCache();
    var cached = cache.get("invoiceList");
    if (cached) {
      return JSON.parse(cached);
    }

    const spreadsheet = getSpreadsheet(CONFIG.SPREADSHEET_ID);
    const sheet = getSheet(spreadsheet, CONFIG.SHEETS.INVOICES);
    const data = sheet.getDataRange().getValues();

    if (data.length < 2) return [];

    const headers = data[0].map((h) => (h || "").toString().trim());

    const colIndex = {
      id: headers.indexOf("ID"),
      projectName: headers.indexOf("Project Name"),
      invoiceNumber: headers.indexOf("Invoice Number"),
      invoiceDate: headers.indexOf("Invoice Date"),
      dueDate: headers.indexOf("Due Date"),
      total: headers.indexOf("Total"),
      currency: headers.indexOf("Currency"),
    };

    // Validate required columns
    for (let key in colIndex) {
      if (colIndex[key] === -1) {
        throw new Error(ERROR_MESSAGES.MISSING_COLUMN(key));
      }
    }

    const result = data.slice(1).map((row) => ({
      id: row[colIndex.id] || "",
      projectName: row[colIndex.projectName] || "",
      invoiceNumber: row[colIndex.invoiceNumber] || "",
      invoiceDate: formatDate(row[colIndex.invoiceDate]),
      dueDate: formatDate(row[colIndex.dueDate]),
      total:
        row[colIndex.total] !== undefined && row[colIndex.total] !== ""
          ? parseFloat(row[colIndex.total]).toFixed(2)
          : "",
      currency: row[colIndex.currency] || "",
    }));

    cache.put("invoiceList", JSON.stringify(result), 300); // cache for 5 minutes
    return result;
  } catch (error) {
    console.error("Error getting invoice list:", error);
    return [];
  }
}

/**
 * Get invoice data by ID
 * @param {string} id - Invoice ID
 * @returns {Object} Invoice data object
 */
function getInvoiceDataByIdFromData(id) {
  try {
    const spreadsheet = getSpreadsheet(CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheets()[0]; // First sheet (Invoices)
    const data = sheet.getDataRange().getValues();

    const headers = data[0];
    const indexMap = headers.reduce((acc, h, i) => {
      acc[h] = i;
      return acc;
    }, {});

    const row = data.find((r, i) => i > 0 && r[indexMap["ID"]] === id);
    if (!row) {
      throw new Error(ERROR_MESSAGES.INVOICE_NOT_FOUND);
    }

    // Extract items from the row
    const items = [];
    for (let i = 0; i < CONFIG.INVOICE_TABLE.MAX_ROWS; i++) {
      const base = 21 + i * CONFIG.INVOICE_TABLE.COLUMNS_PER_ROW;
      const item = row.slice(base, base + CONFIG.INVOICE_TABLE.COLUMNS_PER_ROW);
      if (item.some((cell) => cell && cell.toString().trim() !== "")) {
        items.push(item);
      }
    }

    return {
      projectName: row[indexMap["Project Name"]],
      invoiceNumber: row[indexMap["Invoice Number"]],
      clientName: row[indexMap["Client Name"]],
      clientAddress: row[indexMap["Client Address"]],
      clientNumber: row[indexMap["Client Number"]],
      invoiceDate: formatDateForInput(row[indexMap["Invoice Date"]]),
      dueDate: formatDateForInput(row[indexMap["Due Date"]]),
      tax: row[indexMap["Tax Rate (%)"]],
      subtotal: row[indexMap["Subtotal"]],
      total: row[indexMap["Total"]],
      exchangeRate: row[indexMap["Exchange Rate"]],
      currency: row[indexMap["Currency"]],
      amountInEUR: row[indexMap["Amount in EUR"]],
      bankDetails1: row[indexMap["Bank Details 1"]],
      bankDetails2: row[indexMap["Bank Details 2"]],
      ourCompany: row[indexMap["Our Company"]],
      comment: row[indexMap["Comment"]],
      items: items,
    };
  } catch (error) {
    console.error("Error getting invoice data by ID:", error);
    throw error;
  }
}

/**
 * Save invoice data to spreadsheet
 * @param {Object} data - Invoice data to save
 * @returns {Object} Result with doc and PDF URLs
 */
function saveInvoiceData(data) {
  try {
    const spreadsheet = getSpreadsheet(CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheets()[0];
    const uniqueId = Utilities.getUuid();

    // Initialize headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      const baseHeaders = [
        "ID",
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
      for (let i = 1; i <= CONFIG.INVOICE_TABLE.MAX_ROWS; i++) {
        itemHeaders.push(
          `Row ${i} #`,
          `Row ${i} Service`,
          `Row ${i} Period`,
          `Row ${i} Quantity`,
          `Row ${i} Rate/hour`,
          `Row ${i} Amount`
        );
      }

      sheet.appendRow([...baseHeaders, ...itemHeaders]);
    }

    // Calculate amounts
    const subtotalNum = parseFloat(data.subtotal) || 0;
    const taxRate = parseFloat(data.tax) || 0;
    const taxAmount = calculateTaxAmount(subtotalNum, taxRate);
    const totalAmount = calculateTotalAmount(subtotalNum, taxAmount);

    const invoiceDateObject = data.invoiceDate
      ? new Date(data.invoiceDate)
      : null;
    let dueDateObject = null;
    if (data.dueDate) {
      const parts = data.dueDate.split("/");
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          dueDateObject = new Date(year, month, day);
        }
      }
    }

    // Prepare item cells
    const itemCells = [];
    data.items.forEach((row, i) => {
      const newRow = [...row];
      newRow[0] = (i + 1).toString();
      itemCells.push(...newRow);
    });

    // Prepare row data
    const row = [
      uniqueId,
      data.projectName,
      data.invoiceNumber,
      data.clientName,
      data.clientAddress,
      data.clientNumber,
      invoiceDateObject,
      dueDateObject,
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
      "doc-placeholder", // Google Doc Link placeholder
      "pdf-placeholder", // PDF Link placeholder
      ...itemCells,
    ];

    // Save to spreadsheet
    const newRowIndex = sheet.getLastRow() + 1;
    sheet.getRange(newRowIndex, 1, 1, row.length).setValues([row]);

    return { newRowIndex, uniqueId };
  } catch (error) {
    console.error("Error saving invoice data:", error);
    throw error;
  }
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
  const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);

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
      if (index === 4 || index === 5) {
        newRow.appendTableCell(
          cell ? `${data.currency}${parseFloat(cell).toFixed(2)}` : ""
        );
      } else {
        newRow.appendTableCell(cell || "");
      }
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

function processForm(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
  const uniqueId = Utilities.getUuid();

  const formattedDate = this.formatDate(data.invoiceDate);
  const formattedDueDate = this.formatDate(data.dueDate);

  const subtotalNum = parseFloat(data.subtotal) || 0;
  const taxRate = parseFloat(data.tax) || 0;
  const taxAmount = (subtotalNum * taxRate) / 100;
  const totalAmount = subtotalNum + taxAmount;

  const itemCells = [];
  data.items.forEach((row, i) => {
    const newRow = [...row];
    newRow[0] = (i + 1).toString();
    itemCells.push(...newRow);
  });

  const row = [
    uniqueId,
    data.projectName,
    data.invoiceNumber,
    data.clientName,
    data.clientAddress,
    data.clientNumber,
    new Date(data.invoiceDate),
    new Date(data.dueDate),
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
    "", // placeholders for doc & pdf
  ].concat(itemCells);

  const newRowIndex = sheet.getLastRow() + 1;
  sheet.getRange(newRowIndex, 1, 1, row.length).setValues([row]);

  const doc = this.createInvoiceDoc(
    data,
    formattedDate,
    formattedDueDate,
    subtotalNum,
    taxRate,
    taxAmount,
    totalAmount,
    data.templateId
  );

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

  sheet.getRange(newRowIndex, 20).setValue(doc.getUrl());
  sheet.getRange(newRowIndex, 21).setValue(pdfFile.getUrl());

  return {
    docUrl: doc.getUrl(),
    pdfUrl: pdfFile.getUrl(),
  };
}

/**
 * Update spreadsheet with URLs
 * @param {number} newRowIndex - Index of the new row
 * @param {string} docUrl - URL of the Google Doc
 * @param {string} pdfUrl - URL of the PDF file
 */
function updateSpreadsheetWithUrls(newRowIndex, docUrl, pdfUrl) {
  try {
    const spreadsheet = getSpreadsheet(CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheets()[0];
    sheet.getRange(newRowIndex, 21).setValue(docUrl);
    sheet.getRange(newRowIndex, 22).setValue(pdfUrl);
  } catch (error) {
    console.error("Error updating spreadsheet with URLs:", error);
    throw error;
  }
}

/**
 * Delete invoice by ID from the Invoices sheet
 * @param {string} id - Invoice ID
 * @returns {Object} { success: true } or { success: false, message }
 */
function deleteInvoiceById(id) {
  try {
    const spreadsheet = getSpreadsheet(CONFIG.SPREADSHEET_ID);
    const sheet = getSheet(spreadsheet, CONFIG.SHEETS.INVOICES);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf("ID");
    if (idCol === -1) {
      return { success: false, message: "ID column not found." };
    }
    let rowToDelete = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol] === id) {
        rowToDelete = i + 1; // 1-based for Sheets
        break;
      }
    }
    if (rowToDelete === -1) {
      return { success: false, message: "Invoice not found." };
    }
    sheet.deleteRow(rowToDelete);
    // Clear cache
    CacheService.getScriptCache().remove("invoiceList");
    return { success: true };
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return { success: false, message: error.message };
  }
}
