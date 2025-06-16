const TEMPLATE_ID = "1hqHM3O7pZNZ56zgb-nZJubYTs1zB2z1O42KCDRAXx2M";
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
  const vs = SpreadsheetApp.openById(SPREADSHEET_ID)
    .getSheetByName("Lists")
    .getDataRange()
    .getValues();
  const bankMap = {};
  for (let i = 1; i < vs.length; i++) {
    const shortName = vs[i][16],
      fullDetails = vs[i][17];
    if (shortName && fullDetails) bankMap[shortName] = fullDetails;
  }
  for (let i = 1; i < vs.length; i++) {
    if (vs[i][0] === projectName) {
      const taxVal =
        typeof vs[i][5] === "number" ? vs[i][5] * 100 : parseFloat(vs[i][5]);
      const currencyMap = { USD: "$", EUR: "€", UAH: "₴" };
      return {
        clientName: vs[i][1] || "",
        clientNumber: `${vs[i][2] || ""} ${vs[i][3] || ""}`.trim(),
        clientAddress: vs[i][4] || "",
        tax: isNaN(taxVal) ? 0 : taxVal.toFixed(0),
        currency: currencyMap[vs[i][8]] || vs[i][8],
        paymentDelay: parseInt(vs[i][10]) || 0,
        dayType: String(vs[i][9] || "")
          .trim()
          .toUpperCase(),
        bankDetails1: bankMap[vs[i][6]] || "",
        bankDetails2: bankMap[vs[i][7]] || "",
      };
    }
  }
  return null;
}

function getExchangeRate(dateStr) {
  const url = `https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?startPeriod=${dateStr}&endPeriod=${dateStr}`;
  const res = UrlFetchApp.fetch(url, {
    headers: { Accept: "application/vnd.sdmx.data+json" },
    muteHttpExceptions: true,
  });

  try {
    const json = JSON.parse(res.getContentText());
    const obs = json?.dataSets?.[0]?.series?.["0:0:0:0:0"]?.observations;
    if (!obs) return "";
    const key = Object.keys(obs)[0];
    return parseFloat(obs[key][0]).toFixed(4);
  } catch (e) {
    return "";
  }
}

function processForm(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
  if (sheet.getLastRow() === 0) {
    const base = [
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
      "Comment",
      "Bank Details 1",
      "Bank Details 2",
      "Google Doc Link",
      "PDF Link",
    ];
    for (let i = 1; i <= 20; i++) {
      base.push(
        `Row ${i} #`,
        `Row ${i} Service`,
        `Row ${i} Period`,
        `Row ${i} Quantity`,
        `Row ${i} Rate/hour`,
        `Row ${i} Amount`
      );
    }
    sheet.appendRow(base);
  }

  const fmtDate = formatDate(data.invoiceDate);
  const subtotal = parseFloat(data.subtotal) || 0;
  const taxRate = parseFloat(data.tax) || 0;
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;
  const items = data.items
    .map((r, i) => {
      r[0] = (i + 1).toString();
      return r;
    })
    .flat();

  const exch = data.currency === "€" ? data.exchangeRate : "";

  const row = [
    data.projectName,
    data.invoiceNumber,
    data.clientName,
    data.clientAddress,
    data.clientNumber,
    fmtDate,
    data.dueDate,
    data.tax,
    subtotal.toFixed(2),
    taxAmount.toFixed(2),
    total.toFixed(2),
    exch,
    data.currency,
    data.amountInEUR,
    data.comment,
    data.bankDetails1,
    data.bankDetails2,
    "",
    "",
    ...items,
  ];

  const idx = sheet.getLastRow() + 1;
  sheet.appendRow(row);
  const doc = createInvoiceDoc(
    data,
    fmtDate,
    data.dueDate,
    subtotal,
    taxRate,
    taxAmount,
    total
  );
  Utilities.sleep(500);
  const pdf = doc.getAs("application/pdf");
  Utilities.sleep(500);
  const f = DriveApp.getFolderById(FOLDER_ID);
  const pdfFile = f.createFile(pdf).setName(`${data.invoiceNumber}.pdf`);
  sheet.getRange(idx, 18).setValue(doc.getUrl());
  sheet.getRange(idx, 19).setValue(pdfFile.getUrl());
  return { docUrl: doc.getUrl(), pdfUrl: pdfFile.getUrl() };
}

function createInvoiceDoc(
  data,
  fmtDate,
  dueDate,
  subtotal,
  taxRate,
  taxAmount,
  total
) {
  const copy = DriveApp.getFileById(TEMPLATE_ID).makeCopy(
    `Invoice ${data.invoiceNumber}`,
    DriveApp.getFolderById(FOLDER_ID)
  );
  const doc = DocumentApp.openById(copy.getId()),
    body = doc.getBody();
  // items insertion skipped for brevity

  body.replaceText(
    "\\{Exchange Rate\\}",
    data.currency === "€" ? data.exchangeRate : ""
  );
  body.replaceText("\\{Комментарий\\}", data.comment || "");
  doc.saveAndClose();
  return doc;
}
