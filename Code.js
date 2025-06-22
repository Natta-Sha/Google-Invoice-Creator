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

    // Pass invoice ID if provided
    if (e.parameter.id) {
      template.invoiceId = e.parameter.id;
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
    return HtmlService.createHtmlOutputFromFile(name).getContent();
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
  try {
    // Validate required fields
    const requiredFields = [
      "projectName",
      "invoiceNumber",
      "invoiceDate",
      "items",
    ];
    const validation = validateRequiredFields(data, requiredFields);

    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    // Calculate amounts
    const subtotalNum = parseFloat(data.subtotal) || 0;
    const taxRate = parseFloat(data.tax) || 0;
    const taxAmount = calculateTaxAmount(subtotalNum, taxRate);
    const totalAmount = calculateTotalAmount(subtotalNum, taxAmount);

    // Format dates
    const formattedDate = formatDate(data.invoiceDate);
    const formattedDueDate = formatDate(data.dueDate);

    // Save data to spreadsheet
    const { newRowIndex, uniqueId } = saveInvoiceData(data);

    // Create document
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

    // Generate PDF
    const filename = generateInvoiceFilename(data);
    const pdfFile = generateAndSavePDF(doc, filename);

    // Update spreadsheet with URLs
    updateSpreadsheetWithUrls(newRowIndex, doc.getUrl(), pdfFile.getUrl());

    return {
      success: true,
      docUrl: doc.getUrl(),
      pdfUrl: pdfFile.getUrl(),
      message: "Invoice created successfully!",
    };
  } catch (error) {
    console.error("Error processing form:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Export functions for use in other modules
// Note: In Google Apps Script, all functions are globally available
// These comments help with documentation and IDE support

/**
 * Get project names for dropdown
 * @returns {Array} Array of project names
 */
function getProjectNames() {
  return getProjectNames();
}

/**
 * Get project details by name
 * @param {string} projectName - Project name
 * @returns {Object} Project details
 */
function getProjectDetails(projectName) {
  return getProjectDetails(projectName);
}

/**
 * Get list of all invoices
 * @returns {Array} Array of invoice objects
 */
function getInvoiceList() {
  return getInvoiceList();
}

/**
 * Get invoice data by ID
 * @param {string} id - Invoice ID
 * @returns {Object} Invoice data
 */
function getInvoiceDataById(id) {
  return getInvoiceDataById(id);
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
