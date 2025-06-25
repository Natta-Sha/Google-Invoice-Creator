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
    template.invoiceId = e.parameter.id || "";
    template.mode = e.parameter.mode || "";

    // Pass invoice ID if provided
    if (e.parameter.id) {
      template.invoiceId = e.parameter.id;
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
  return typeof dataService !== "undefined" && dataService.processForm
    ? dataService.processForm(data)
    : { success: false, error: "processForm not implemented" };
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

// Helper functions to call the real implementations in dataService.js
function getProjectNamesFromData() {
  return typeof dataService !== "undefined" && dataService.getProjectNames
    ? dataService.getProjectNames()
    : [];
}
function getProjectDetailsFromData(projectName) {
  return typeof dataService !== "undefined" && dataService.getProjectDetails
    ? dataService.getProjectDetails(projectName)
    : {};
}
function getInvoiceListFromData() {
  return typeof dataService !== "undefined" && dataService.getInvoiceList
    ? dataService.getInvoiceList()
    : [];
}
function getInvoiceDataByIdFromData(id) {
  return typeof dataService !== "undefined" && dataService.getInvoiceDataById
    ? dataService.getInvoiceDataById(id)
    : {};
}

// Error handling wrapper for better debugging
function handleError(func, context = "") {
  return function (...args) {
    try {
      return func.apply(this, args);
    } catch (error) {
      console.error(`Error in ${context || func.name}:`, error);
      throw error;
    }
  };
}

// Performance monitoring (optional)
function logPerformance(func, context = "") {
  return function (...args) {
    const start = new Date();
    try {
      const result = func.apply(this, args);
      const duration = new Date() - start;
      console.log(`${context || func.name} took ${duration}ms`);
      return result;
    } catch (error) {
      const duration = new Date() - start;
      console.error(
        `${context || func.name} failed after ${duration}ms:`,
        error
      );
      throw error;
    }
  };
}

// Apply performance monitoring to key functions
const monitoredProcessForm = logPerformance(processForm, "processForm");
const monitoredGetProjectDetails = logPerformance(
  getProjectDetails,
  "getProjectDetails"
);
const monitoredCreateInvoiceDoc = logPerformance(
  createInvoiceDoc,
  "createInvoiceDoc"
);

function validateRequiredFields(data, requiredFields) {
  return typeof dataService !== "undefined" &&
    dataService.validateRequiredFields
    ? dataService.validateRequiredFields(data, requiredFields)
    : { isValid: true, errors: [] };
}

function calculateTaxAmount(subtotal, taxRate) {
  return typeof dataService !== "undefined" && dataService.calculateTaxAmount
    ? dataService.calculateTaxAmount(subtotal, taxRate)
    : 0;
}

function calculateTotalAmount(subtotal, taxAmount) {
  return typeof dataService !== "undefined" && dataService.calculateTotalAmount
    ? dataService.calculateTotalAmount(subtotal, taxAmount)
    : 0;
}

function saveInvoiceData(data) {
  return typeof dataService !== "undefined" && dataService.saveInvoiceData
    ? dataService.saveInvoiceData(data)
    : { newRowIndex: -1, uniqueId: "" };
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
  return typeof dataService !== "undefined" && dataService.createInvoiceDoc
    ? dataService.createInvoiceDoc(
        data,
        formattedDate,
        formattedDueDate,
        subtotal,
        taxRate,
        taxAmount,
        totalAmount,
        templateId
      )
    : null;
}

function generateInvoiceFilename(data) {
  return typeof dataService !== "undefined" &&
    dataService.generateInvoiceFilename
    ? dataService.generateInvoiceFilename(data)
    : "";
}

function generateAndSavePDF(doc, filename) {
  return typeof dataService !== "undefined" && dataService.generateAndSavePDF
    ? dataService.generateAndSavePDF(doc, filename)
    : null;
}

function updateSpreadsheetWithUrls(newRowIndex, docUrl, pdfUrl) {
  return typeof dataService !== "undefined" &&
    dataService.updateSpreadsheetWithUrls
    ? dataService.updateSpreadsheetWithUrls(newRowIndex, docUrl, pdfUrl)
    : null;
}

function formatDate(dateStr) {
  return typeof dataService !== "undefined" && dataService.formatDate
    ? dataService.formatDate(dateStr)
    : dateStr;
}

function formatDateForInput(val) {
  return typeof dataService !== "undefined" && dataService.formatDateForInput
    ? dataService.formatDateForInput(val)
    : val;
}

/**
 * Delete invoice by ID (global endpoint for frontend)
 * @param {string} id - Invoice ID
 * @returns {Object} { success: true } or { success: false, message }
 */
function deleteInvoiceById(id) {
  return typeof dataService !== "undefined" && dataService.deleteInvoiceById
    ? dataService.deleteInvoiceById(id)
    : { success: false, message: "deleteInvoiceById not implemented" };
}
