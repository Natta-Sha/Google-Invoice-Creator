function getInvoiceByNumberInternal(invoiceNumber) {
  const spreadsheet = getSpreadsheet(CONFIG.SPREADSHEET_ID);
  const sheet = getSheet(spreadsheet, CONFIG.SHEETS.INVOICES);
  const data = sheet.getDataRange().getValues();

  const headers = data[0];
  const rows = data.slice(1);

  const invoiceIndex = headers.indexOf("Invoice Number");
  const idIndex = headers.indexOf("ID");

  for (let row of rows) {
    if (row[invoiceIndex] === invoiceNumber) {
      const result = {};
      headers.forEach((key, i) => {
        result[keyToCamelCase(key)] = row[i];
      });
      return result;
    }
  }

  return null;
}
function getInvoiceListFromData() {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(
    CONFIG.SHEETS.INVOICES
  );
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  return data.map((row) => {
    const rowObj = {};
    headers.forEach((h, i) => (rowObj[h] = row[i]));
    return {
      projectName: rowObj["Project Name"],
      invoiceNumber: rowObj["Invoice Number"],
      invoiceDate: rowObj["Invoice Date"],
      dueDate: rowObj["Due Date"],
      total: rowObj["Total"],
      currency: rowObj["Currency"],
    };
  });
}
function getProjectNamesFromData() {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(
    CONFIG.SHEETS.LISTS
  );
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  const projectIndex = headers.indexOf("Project Name");
  const projectNames = new Set();

  data.forEach((row) => {
    const name = row[projectIndex];
    if (name) projectNames.add(name);
  });

  return [...projectNames];
}
function getProjectDetailsFromData(projectName) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(
    CONFIG.SHEETS.LISTS
  );
  const values = sheet.getDataRange().getValues();

  const templateMap = new Map();
  const bankMap = new Map();
  let projectRow = null;

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    // Project row
    const name = (row[0] || "").toString().trim();
    if (
      !projectRow &&
      name.toLowerCase() === projectName.toString().trim().toLowerCase()
    ) {
      projectRow = row;
    }
    // Template map (T/U → 19/20)
    const templateName = (row[19] || "").toString().trim();
    const templateId = (row[20] || "").toString().trim();
    if (templateName && templateId) {
      templateMap.set(templateName.toLowerCase(), templateId);
    }
    // Bank map (Q/R → 16/17)
    const short = (row[16] || "").toString().trim();
    const full = (row[17] || "").toString().trim();
    if (short && full) {
      bankMap.set(short, full);
    }
  }
  if (!projectRow) {
    throw new Error(`❗ Project "${projectName}" not found in column A.`);
  }
  const selectedTemplateName = (projectRow[13] || "").toString().trim();
  if (!selectedTemplateName) {
    throw new Error(
      `🚫 No invoice template name specified for project "${projectName}". Please fill in column N.`
    );
  }
  const selectedTemplateId = templateMap.get(
    selectedTemplateName.toLowerCase()
  );
  if (!selectedTemplateId) {
    throw new Error(
      `🚫 No invoice template found for "${selectedTemplateName}". Please check columns T and U in 'Lists'.`
    );
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
    bankDetails1: bankMap.get(shortBank1) || "",
    bankDetails2: bankMap.get(shortBank2) || "",
    ourCompany: projectRow[14] || "",
    templateId: selectedTemplateId,
  };
}

var dataService = {
  getInvoiceList: getInvoiceListFromData,
  getProjectNames: getProjectNamesFromData,
  getProjectDetails: getProjectDetailsFromData,
  getInvoiceByNumber: getInvoiceByNumberInternal,
};
