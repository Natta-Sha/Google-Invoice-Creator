// Business logic service - Refactored version
// This file contains business logic and orchestrates operations between data and document services

/**
 * Main business logic for processing invoice form data
 * This function orchestrates the entire invoice creation process
 * @param {Object} data - Form data from frontend
 * @returns {Object} Result with document and PDF URLs
 */
function processInvoiceCreation(data) {
  try {
    Logger.log("processInvoiceCreation: Starting invoice creation process.");
    Logger.log(
      `processInvoiceCreation: Processing invoice for project: ${data.projectName}, invoice: ${data.invoiceNumber}`
    );

    // Validate required data
    const validation = validateInvoiceData(data);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    // Save invoice data to spreadsheet
    const saveResult = saveInvoiceData(data);
    Logger.log(
      `processInvoiceCreation: Invoice data saved with ID: ${saveResult.uniqueId}`
    );

    // Format dates for document creation
    const formattedDate = formatDateFromUtils(data.invoiceDate);
    const [day, month, year] = data.dueDate.split("/");
    const dueDateObject = new Date(year, month - 1, day);
    const formattedDueDate = formatDateFromUtils(dueDateObject);

    // Calculate amounts
    const subtotalNum = parseFloat(data.subtotal) || 0;
    const taxRate = parseFloat(data.tax) || 0;
    const taxAmount = calculateTaxAmountFromUtils(subtotalNum, taxRate);
    const totalAmount = calculateTotalAmountFromUtils(subtotalNum, taxAmount);

    // Create document
    const doc = createInvoiceDoc(
      data,
      formattedDate,
      formattedDueDate,
      subtotalNum,
      taxRate,
      taxAmount,
      totalAmount,
      data.templateId,
      CONFIG.FOLDER_ID
    );

    if (!doc) {
      throw new Error(
        "Failed to create the Google Doc. The returned document object was empty."
      );
    }

    Logger.log(
      `processInvoiceCreation: Document created successfully. Doc ID: ${doc.getId()}`
    );

    // Generate PDF
    Utilities.sleep(1000); // Allow document to be fully processed
    const pdf = doc.getAs("application/pdf");
    if (!pdf) {
      throw new Error("Failed to generate PDF content from the document.");
    }

    // Save PDF to Drive
    const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
    const filename = generateInvoiceFilenameFromUtils(data);
    const pdfFile = folder.createFile(pdf).setName(`${filename}.pdf`);

    Logger.log(
      `processInvoiceCreation: PDF created successfully. File ID: ${pdfFile.getId()}`
    );

    // Update spreadsheet with URLs
    const spreadsheet = getSpreadsheet(CONFIG.SPREADSHEET_ID);
    const sheet = getSheet(spreadsheet, CONFIG.SHEETS.INVOICES);
    sheet.getRange(saveResult.newRowIndex, 20).setValue(doc.getUrl());
    sheet.getRange(saveResult.newRowIndex, 21).setValue(pdfFile.getUrl());
    SpreadsheetApp.flush();

    // Clear cache
    CacheService.getScriptCache().remove("invoiceList");

    const result = {
      docUrl: doc.getUrl(),
      pdfUrl: pdfFile.getUrl(),
    };

    Logger.log(
      "processInvoiceCreation: Invoice creation completed successfully."
    );
    return result;
  } catch (error) {
    Logger.log(`processInvoiceCreation: ERROR - ${error.toString()}`);
    Logger.log(`Stack Trace: ${error.stack}`);
    throw error;
  }
}

/**
 * Validate invoice data before processing
 * @param {Object} data - Invoice data to validate
 * @returns {Object} Validation result
 */
function validateInvoiceData(data) {
  const errors = [];
  const requiredFields = [
    "projectName",
    "invoiceNumber",
    "invoiceDate",
    "dueDate",
    "subtotal",
    "tax",
  ];

  // Check required fields
  requiredFields.forEach((field) => {
    if (!data[field] || data[field].toString().trim() === "") {
      errors.push(`${field} is required`);
    }
  });

  // Validate numeric fields
  if (data.subtotal && isNaN(parseFloat(data.subtotal))) {
    errors.push("Subtotal must be a valid number");
  }

  if (data.tax && isNaN(parseFloat(data.tax))) {
    errors.push("Tax rate must be a valid number");
  }

  // Validate items
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push("At least one invoice item is required");
  }

  // Validate template ID
  if (!data.templateId) {
    errors.push("Template ID is required");
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
}

/**
 * Get project details with enhanced error handling
 * @param {string} projectName - Project name
 * @returns {Object} Project details
 */
function getProjectDetailsWithValidation(projectName) {
  try {
    if (!projectName || projectName.trim() === "") {
      throw new Error("Project name is required");
    }

    const details = getProjectDetailsFromData(projectName);

    if (!details || !details.templateId) {
      throw new Error(`No template found for project: ${projectName}`);
    }

    return details;
  } catch (error) {
    Logger.log(`getProjectDetailsWithValidation: ERROR - ${error.message}`);
    throw error;
  }
}

/**
 * Delete invoice with enhanced validation and cleanup
 * @param {string} id - Invoice ID
 * @returns {Object} Delete result
 */
function deleteInvoiceWithCleanup(id) {
  try {
    if (!id || id.trim() === "") {
      return { success: false, message: "Invoice ID is required" };
    }

    // Get invoice data first to validate it exists
    const invoiceData = getInvoiceDataByIdFromData(id);
    if (!invoiceData || !invoiceData.projectName) {
      return { success: false, message: "Invoice not found" };
    }

    // Perform deletion
    const deleteResult = deleteInvoiceByIdFromData(id);

    if (deleteResult.success) {
      Logger.log(
        `deleteInvoiceWithCleanup: Successfully deleted invoice ${id}`
      );
    } else {
      Logger.log(
        `deleteInvoiceWithCleanup: Failed to delete invoice ${id}: ${deleteResult.message}`
      );
    }

    return deleteResult;
  } catch (error) {
    Logger.log(`deleteInvoiceWithCleanup: ERROR - ${error.message}`);
    return { success: false, message: error.message };
  }
}

/**
 * Get invoice list with caching and error handling
 * @returns {Array} Array of invoice objects
 */
function getInvoiceListWithCaching() {
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache.get("invoiceList");

    if (cached) {
      Logger.log("getInvoiceListWithCaching: Returning cached data");
      return JSON.parse(cached);
    }

    const invoiceList = getInvoiceListFromData();

    // Cache the result for 5 minutes
    cache.put("invoiceList", JSON.stringify(invoiceList), 300);

    Logger.log(
      `getInvoiceListWithCaching: Retrieved ${invoiceList.length} invoices from database`
    );
    return invoiceList;
  } catch (error) {
    Logger.log(`getInvoiceListWithCaching: ERROR - ${error.message}`);
    return [];
  }
}

/**
 * Clear invoice list cache
 */
function clearInvoiceListCache() {
  try {
    CacheService.getScriptCache().remove("invoiceList");
    Logger.log("clearInvoiceListCache: Cache cleared successfully");
  } catch (error) {
    Logger.log(`clearInvoiceListCache: ERROR - ${error.message}`);
  }
}
