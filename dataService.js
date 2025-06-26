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
