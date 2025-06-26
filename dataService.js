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

var dataService = {
  getInvoiceList: getInvoiceListFromData,
  getProjectNames: getProjectNamesFromData,
  getInvoiceByNumber: getInvoiceByNumberInternal,
};
