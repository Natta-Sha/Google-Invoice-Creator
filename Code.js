// Main application entry point - Optimized version
// This file contains the web app endpoints and main business logic

/**
 * Main web app entry point
 * @param {Object} e - Event object with parameters
 * @returns {HtmlOutput} Rendered HTML page
 */
function doGet(e) {
  try {
    const page = e.parameter.page || "Home";
    const template = HtmlService.createTemplateFromFile(page);
    template.baseUrl = ScriptApp.getService().getUrl();
    template.invoiceId = e.parameter.invoiceId || e.parameter.id || "";
    template.mode = e.parameter.mode || "";

    // Pass invoice ID if provided
    if (e.parameter.invoiceId || e.parameter.id) {
      template.invoiceId = e.parameter.invoiceId || e.parameter.id;
    }
    if (e.parameter.mode) {
      template.mode = e.parameter.mode;
    }

    return template.evaluate().setTitle(page);
  } catch (error) {
    console.error("Error in doGet:", error);
    return HtmlService.createHtmlOutput(
      `<h1>Error</h1><p>${error.message}</p>`
    );
  }
}

/**
 * Load HTML page content
 * @param {string} name - Page name
 * @returns {string} HTML content
 */
function loadPage(name) {
  try {
    return typeof dataService !== "undefined" && dataService.loadPage
      ? dataService.loadPage(name)
      : HtmlService.createHtmlOutputFromFile(name).getContent();
  } catch (error) {
    console.error(`Error loading page ${name}:`, error);
    return `<h1>Error</h1><p>Failed to load page: ${error.message}</p>`;
  }
}

/**
 * Process invoice form data - Main business logic
 * @param {Object} data - Form data from frontend
 * @returns {Object} Result with document and PDF URLs
 */
function processForm(data) {
  return processInvoiceCreation(data);
}

// Export functions for use in other modules
// Note: In Google Apps Script, all functions are globally available
// These comments help with documentation and IDE support

/**
 * Get project names for dropdown
 * @returns {Array} Array of project names
 */
function getProjectNames() {
  return getProjectNamesFromData();
}

/**
 * Get project details by name
 * @param {string} projectName - Project name
 * @returns {Object} Project details
 */
function getProjectDetails(projectName) {
  return getProjectDetailsFromData(projectName);
}

/**
 * Get list of all invoices
 * @returns {Array} Array of invoice objects
 */
function getInvoiceList() {
  return getInvoiceListFromData();
}

/**
 * Get invoice data by ID
 * @param {string} id - Invoice ID
 * @returns {Object} Invoice data
 */
function getInvoiceDataById(id) {
  return getInvoiceDataByIdFromData(id);
}

// Error handling and performance monitoring removed for cleaner code

// Performance monitoring removed for cleaner code

function validateRequiredFields(data, requiredFields) {
  return validateRequiredFieldsFromUtils(data, requiredFields);
}

function calculateTaxAmount(subtotal, taxRate) {
  return calculateTaxAmountFromUtils(subtotal, taxRate);
}

function calculateTotalAmount(subtotal, taxAmount) {
  return calculateTotalAmountFromUtils(subtotal, taxAmount);
}

// saveInvoiceData is handled directly in businessService.js

// Document service functions are available globally from documentService.js
// No wrapper functions needed in Google Apps Script

function formatDate(dateStr) {
  return formatDateFromUtils(dateStr);
}

function formatDateForInput(val) {
  return formatDateForInputFromUtils(val);
}

/**
 * Delete invoice by ID (global endpoint for frontend)
 * @param {string} id - Invoice ID
 * @returns {Object} { success: true } or { success: false, message }
 */
function deleteInvoiceById(id) {
  return deleteInvoiceByIdFromData(id);
}

function testLogger(message) {
  Logger.log(`[CLIENT TEST]: ${message}`);
}

/**
 * Diagnostic function to check application state
 * @returns {Object} Diagnostic information
 */
function runDiagnostics() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    config: {
      folderId: CONFIG.FOLDER_ID,
      spreadsheetId: CONFIG.SPREADSHEET_ID,
      sheets: CONFIG.SHEETS,
    },
    services: {
      dataService: typeof dataService !== "undefined",
      businessService: typeof businessService !== "undefined",
      documentService: typeof documentService !== "undefined",
      utils: typeof utils !== "undefined",
    },
    functions: {
      getProjectNames: typeof getProjectNames === "function",
      getProjectDetails: typeof getProjectDetails === "function",
      getInvoiceList: typeof getInvoiceList === "function",
      processForm: typeof processForm === "function",
    },
    errors: [],
  };

  try {
    // Test basic functionality
    const projectNames = getProjectNames();
    diagnostics.projectNames = projectNames;
    diagnostics.projectNamesCount = projectNames.length;
  } catch (error) {
    diagnostics.errors.push(`getProjectNames error: ${error.message}`);
  }

  try {
    // Test spreadsheet access
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    diagnostics.spreadsheetAccess = true;
    diagnostics.spreadsheetName = spreadsheet.getName();
  } catch (error) {
    diagnostics.errors.push(`Spreadsheet access error: ${error.message}`);
  }

  try {
    // Test folder access
    const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
    diagnostics.folderAccess = true;
    diagnostics.folderName = folder.getName();
  } catch (error) {
    diagnostics.errors.push(`Folder access error: ${error.message}`);
  }

  Logger.log(`Diagnostics: ${JSON.stringify(diagnostics, null, 2)}`);
  return diagnostics;
}

/**
 * Test function to check if all required services are loaded
 * @returns {string} Status message
 */
function testServices() {
  const services = [
    "CONFIG",
    "dataService",
    "businessService",
    "documentService",
    "utils",
  ];

  const results = services.map((service) => {
    const exists = typeof eval(service) !== "undefined";
    return `${service}: ${exists ? "✅" : "❌"}`;
  });

  const message = results.join("\n");
  Logger.log(`Service test results:\n${message}`);
  return message;
}

/**
 * Test configuration access
 * @returns {Object} Configuration test result
 */
function testConfig() {
  try {
    return {
      folderId: CONFIG.FOLDER_ID,
      spreadsheetId: CONFIG.SPREADSHEET_ID,
      sheets: CONFIG.SHEETS,
      currencySymbols: CONFIG.CURRENCY_SYMBOLS,
    };
  } catch (error) {
    Logger.log(`Config test error: ${error.message}`);
    throw error;
  }
}
