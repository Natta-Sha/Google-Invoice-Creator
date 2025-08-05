// Data access layer for spreadsheet operations - Refactored version
// This file handles all spreadsheet read/write operations

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

    Logger.log("Selected templateId: " + selectedTemplateId);

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
      invoiceDate: formatDateFromUtils(row[colIndex.invoiceDate]),
      dueDate: formatDateFromUtils(row[colIndex.dueDate]),
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
    const sheet = spreadsheet.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const indexMap = headers.reduce((acc, h, i) => {
      acc[h] = i;
      return acc;
    }, {});

    const row = data.find((r, i) => i > 0 && r[indexMap["ID"]] === id);
    if (!row) {
      console.log(`Invoice with ID ${id} not found.`);
      return {};
    }

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
      invoiceDate: formatDateForInputFromUtils(row[indexMap["Invoice Date"]]),
      dueDate: formatDateForInputFromUtils(row[indexMap["Due Date"]]),
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
    return {};
  }
}

/**
 * Save invoice data to spreadsheet
 * @param {Object} data - Invoice data to save
 * @returns {Object} Result with newRowIndex and uniqueId
 */
function saveInvoiceData(data) {
  try {
    const spreadsheet = getSpreadsheet(CONFIG.SPREADSHEET_ID);
    const sheet = getSheet(spreadsheet, CONFIG.SHEETS.INVOICES);
    const uniqueId = Utilities.getUuid();

    // Parse DD/MM/YYYY date
    const [day, month, year] = data.dueDate.split("/");
    const dueDateObject = new Date(year, month - 1, day);

    const newRow = [
      uniqueId,
      data.projectName,
      data.invoiceNumber,
      data.clientName,
      data.clientAddress,
      data.clientNumber,
      new Date(data.invoiceDate), // YYYY-MM-DD is fine
      dueDateObject,
      data.tax,
      data.subtotal,
      calculateTaxAmountFromUtils(data.subtotal, data.tax),
      calculateTotalAmountFromUtils(
        data.subtotal,
        calculateTaxAmountFromUtils(data.subtotal, data.tax)
      ),
      data.currency === "$" ? data.exchangeRate : "",
      data.currency,
      data.currency === "$" ? data.amountInEUR : "",
      data.bankDetails1,
      data.bankDetails2,
      data.ourCompany || "",
      data.comment || "",
      "", // Placeholder for Doc URL
      "", // Placeholder for PDF URL
    ];

    const itemCells = data.items.flat();
    const fullRow = newRow.concat(itemCells);

    const newRowIndex = sheet.getLastRow() + 1;
    sheet.getRange(newRowIndex, 1, 1, fullRow.length).setValues([fullRow]);
    CacheService.getScriptCache().remove("invoiceList");

    return { newRowIndex, uniqueId };
  } catch (error) {
    console.error("Error saving invoice data:", error);
    throw error;
  }
}

/**
 * Main business logic for processing invoice form data
 * @param {Object} data - Form data from frontend
 * @returns {Object} Result with document and PDF URLs
 */
function processFormFromData(data) {
  try {
    Logger.log("processFormFromData: Starting invoice creation.");
    Logger.log(
      `processFormFromData: Received data for project: ${data.projectName}, invoice: ${data.invoiceNumber}`
    );

    const spreadsheet = getSpreadsheet(CONFIG.SPREADSHEET_ID);
    const sheet = getSheet(spreadsheet, CONFIG.SHEETS.INVOICES);
    const uniqueId = Utilities.getUuid();
    Logger.log(`processFormFromData: Generated new unique ID: ${uniqueId}`);

    // Ensure headers exist
    ensureInvoiceHeaders(sheet);

    const formattedDate = formatDateFromUtils(data.invoiceDate);

    const [day, month, year] = data.dueDate.split("/");
    const dueDateObject = new Date(year, month - 1, day);
    const formattedDueDate = formatDateFromUtils(dueDateObject);

    const subtotalNum = parseFloat(data.subtotal) || 0;
    const taxRate = parseFloat(data.tax) || 0;
    const taxAmount = calculateTaxAmountFromUtils(subtotalNum, taxRate);
    const totalAmount = calculateTotalAmountFromUtils(subtotalNum, taxAmount);

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
      "",
      "", // placeholders for doc & pdf
    ].concat(itemCells);

    const newRowIndex = sheet.getLastRow() + 1;
    sheet.getRange(newRowIndex, 1, 1, row.length).setValues([row]);
    SpreadsheetApp.flush();
    Logger.log(
      `processFormFromData: Wrote main data to sheet '${CONFIG.SHEETS.INVOICES}' at row ${newRowIndex}.`
    );

    // Create document and PDF
    const doc = createInvoiceDocFromDocumentService(
      data,
      formattedDate,
      formattedDueDate,
      subtotalNum,
      taxRate,
      taxAmount,
      totalAmount,
      data.templateId
    );
    if (!doc) {
      Logger.log(
        "processFormFromData: ERROR - createInvoiceDoc returned null or undefined."
      );
      throw new Error(
        "Failed to create the Google Doc. The returned document object was empty."
      );
    }
    Logger.log(
      `processFormFromData: createInvoiceDoc successful. Doc ID: ${doc.getId()}, URL: ${doc.getUrl()}`
    );

    Utilities.sleep(1000);
    Logger.log("processFormFromData: Woke up from 1-second sleep.");

    const pdf = doc.getAs("application/pdf");
    if (!pdf) {
      Logger.log(
        "processFormFromData: ERROR - doc.getAs('application/pdf') returned a null blob."
      );
      throw new Error("Failed to generate PDF content from the document.");
    }
    Logger.log(
      `processFormFromData: Got PDF blob. Name: ${pdf.getName()}, Type: ${pdf.getContentType()}, Size: ${
        pdf.getBytes().length
      } bytes.`
    );

    const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);

    const filename = generateInvoiceFilenameFromUtils(data);
    const pdfFile = folder.createFile(pdf).setName(`${filename}.pdf`);
    Logger.log(
      `processFormFromData: Created PDF file. ID: ${pdfFile.getId()}, URL: ${pdfFile.getUrl()}`
    );

    sheet.getRange(newRowIndex, 20).setValue(doc.getUrl());
    sheet.getRange(newRowIndex, 21).setValue(pdfFile.getUrl());
    SpreadsheetApp.flush();
    Logger.log(
      `processFormFromData: Wrote Doc and PDF URLs to sheet at row ${newRowIndex}.`
    );

    const result = {
      docUrl: doc.getUrl(),
      pdfUrl: pdfFile.getUrl(),
    };
    Logger.log(
      "processFormFromData: Successfully completed. Returning URLs to client."
    );

    CacheService.getScriptCache().remove("invoiceList");

    return result;
  } catch (e) {
    Logger.log(`processFormFromData: CRITICAL ERROR - ${e.toString()}`);
    Logger.log(`Stack Trace: ${e.stack}`);
    throw e;
  }
}

/**
 * Ensure invoice sheet has proper headers
 * @param {Sheet} sheet - The invoice sheet
 */
function ensureInvoiceHeaders(sheet) {
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
    SpreadsheetApp.flush();
    Logger.log("processFormFromData: Sheet was empty, headers created.");
  }
}

/**
 * Delete invoice by ID from the Invoices sheet
 * @param {string} id - Invoice ID
 * @returns {Object} { success: true } or { success: false, message }
 */
function deleteInvoiceByIdFromData(id) {
  try {
    const spreadsheet = getSpreadsheet(CONFIG.SPREADSHEET_ID);
    const sheet = getSheet(spreadsheet, CONFIG.SHEETS.INVOICES);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const idCol = headers.indexOf("ID");
    const docLinkCol = headers.indexOf("Google Doc Link");
    const pdfLinkCol = headers.indexOf("PDF Link");

    if (idCol === -1) throw new Error("ID column not found.");

    let rowToDelete = -1;
    let docUrl = "";
    let pdfUrl = "";

    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol] === id) {
        rowToDelete = i + 1; // 1-based index
        docUrl = data[i][docLinkCol] || "";
        pdfUrl = data[i][pdfLinkCol] || "";
        break;
      }
    }

    if (rowToDelete === -1) {
      return { success: false, message: "Invoice not found." };
    }

    // Delete files (if they exist), log errors
    let deletedNotes = [];

    if (docUrl) {
      try {
        const docId = extractFileIdFromUrl(docUrl);
        DriveApp.getFileById(docId).setTrashed(true);
      } catch (err) {
        const msg = "Google Doc already deleted or not found.";
        Logger.log(msg + " " + err.message);
        deletedNotes.push(msg);
      }
    }

    if (pdfUrl) {
      try {
        const pdfId = extractFileIdFromUrl(pdfUrl);
        DriveApp.getFileById(pdfId).setTrashed(true);
      } catch (err) {
        const msg = "PDF already deleted or not found.";
        Logger.log(msg + " " + err.message);
        deletedNotes.push(msg);
      }
    }

    // Delete row
    sheet.deleteRow(rowToDelete);

    // Clear cache
    CacheService.getScriptCache().remove("invoiceList");

    return {
      success: true,
      note: deletedNotes.length ? deletedNotes.join(" ") : undefined,
    };
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Extract file ID from Google Drive URL
 * @param {string} url - Google Drive URL
 * @returns {string} File ID
 */
function extractFileIdFromUrl(url) {
  const match = url.match(/[-\w]{25,}/);
  if (!match) {
    throw new Error("Invalid file URL: " + url);
  }
  return match[0];
}
