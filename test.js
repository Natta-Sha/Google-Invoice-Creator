// Test file for refactored functions - For verification purposes
// This file can be used to test the refactored functions in Google Apps Script

/**
 * Test utility functions
 */
function testUtilityFunctions() {
  console.log("Testing utility functions...");

  // Test date formatting
  const testDate = "2025-01-15";
  const formattedDate = formatDateFromUtils(testDate);
  console.log(`Date formatting: ${testDate} -> ${formattedDate}`);

  // Test currency formatting
  const amount = 1234.56;
  const currency = "$";
  const formattedAmount = formatCurrencyFromUtils(amount, currency);
  console.log(`Currency formatting: ${amount} -> ${formattedAmount}`);

  // Test tax calculations
  const subtotal = 1000;
  const taxRate = 19;
  const taxAmount = calculateTaxAmountFromUtils(subtotal, taxRate);
  const total = calculateTotalAmountFromUtils(subtotal, taxAmount);
  console.log(
    `Tax calculation: Subtotal=${subtotal}, Tax=${taxAmount}, Total=${total}`
  );

  // Test validation
  const testData = { name: "Test", amount: "100" };
  const validation = validateRequiredFieldsFromUtils(testData, [
    "name",
    "amount",
  ]);
  console.log(`Validation result: ${validation.isValid}`);

  console.log("Utility function tests completed.");
}

/**
 * Test data service functions
 */
function testDataServiceFunctions() {
  console.log("Testing data service functions...");

  try {
    // Test project names retrieval
    const projectNames = getProjectNamesFromData();
    console.log(`Retrieved ${projectNames.length} project names`);

    // Test invoice list retrieval
    const invoiceList = getInvoiceListFromData();
    console.log(`Retrieved ${invoiceList.length} invoices`);

    console.log("Data service function tests completed.");
  } catch (error) {
    console.error("Data service test error:", error.message);
  }
}

/**
 * Test business service functions
 */
function testBusinessServiceFunctions() {
  console.log("Testing business service functions...");

  try {
    // Test invoice list with caching
    const cachedList = getInvoiceListWithCaching();
    console.log(`Retrieved ${cachedList.length} invoices with caching`);

    // Test cache clearing
    clearInvoiceListCache();
    console.log("Cache cleared successfully");

    console.log("Business service function tests completed.");
  } catch (error) {
    console.error("Business service test error:", error.message);
  }
}

/**
 * Test backward compatibility
 */
function testBackwardCompatibility() {
  console.log("Testing backward compatibility...");

  // Test legacy function names still work
  const testDate = "2025-01-15";
  const legacyFormatted = formatDate(testDate);
  const newFormatted = formatDateFromUtils(testDate);

  if (legacyFormatted === newFormatted) {
    console.log("✅ Backward compatibility: formatDate() works correctly");
  } else {
    console.log("❌ Backward compatibility: formatDate() failed");
  }

  // Test other legacy functions
  const amount = 1000;
  const taxRate = 19;
  const legacyTax = calculateTaxAmount(amount, taxRate);
  const newTax = calculateTaxAmountFromUtils(amount, taxRate);

  if (legacyTax === newTax) {
    console.log(
      "✅ Backward compatibility: calculateTaxAmount() works correctly"
    );
  } else {
    console.log("❌ Backward compatibility: calculateTaxAmount() failed");
  }

  console.log("Backward compatibility tests completed.");
}

/**
 * Test project details functionality - CRITICAL FOR YOUR ISSUE
 */
function testProjectDetails() {
  console.log("Testing project details functionality...");

  try {
    // Test getProjectNames function
    const projectNames = getProjectNames();
    console.log(
      `✅ getProjectNames() returned ${projectNames.length} projects`
    );

    if (projectNames.length > 0) {
      // Test getProjectDetails with first project
      const firstProject = projectNames[0];
      console.log(`Testing getProjectDetails with project: ${firstProject}`);

      const projectDetails = getProjectDetails(firstProject);
      console.log("✅ getProjectDetails() returned:", projectDetails);

      // Check if required fields are present
      const requiredFields = [
        "clientName",
        "clientAddress",
        "tax",
        "currency",
        "templateId",
      ];
      const missingFields = requiredFields.filter(
        (field) => !projectDetails[field]
      );

      if (missingFields.length === 0) {
        console.log("✅ All required project details fields are present");
      } else {
        console.log("❌ Missing project details fields:", missingFields);
      }
    } else {
      console.log("⚠️ No projects found to test with");
    }

    console.log("Project details test completed.");
  } catch (error) {
    console.error("❌ Project details test error:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

/**
 * Test validation function specifically
 */
function testValidationFunction() {
  console.log("Testing validation function...");

  try {
    // Test with valid data
    const validData = {
      projectName: "Test Project",
      invoiceNumber: "INV-001",
      invoiceDate: "2025-01-15",
      dueDate: "15/01/2025",
      subtotal: "1000",
      tax: "19",
      items: [["1", "Service", "Period", "10", "100", "1000"]],
      templateId: "test-template-id",
    };

    const validation = validateInvoiceData(validData);
    console.log("✅ Valid data validation result:", validation);

    // Test with missing required fields
    const invalidData = {
      projectName: "Test Project",
      invoiceNumber: "INV-001",
      // Missing invoiceDate, dueDate, subtotal, tax, items, templateId
    };

    const invalidValidation = validateInvoiceData(invalidData);
    console.log("❌ Invalid data validation result:", invalidValidation);
    console.log("Validation errors:", invalidValidation.errors);

    console.log("Validation function test completed.");
  } catch (error) {
    console.error("❌ Validation test error:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

/**
 * Test the complete data flow for invoice creation
 */
function testInvoiceCreationFlow() {
  console.log("Testing complete invoice creation flow...");

  try {
    // Get project names
    const projectNames = getProjectNames();
    if (projectNames.length === 0) {
      console.log("⚠️ No projects available for testing");
      return;
    }

    const testProject = projectNames[0];
    console.log(`Using test project: ${testProject}`);

    // Get project details
    const projectDetails = getProjectDetails(testProject);
    console.log("Project details:", projectDetails);

    // Create test invoice data
    const testInvoiceData = {
      projectName: testProject,
      invoiceNumber: "TEST-001",
      invoiceDate: "2025-01-15",
      dueDate: "15/01/2025",
      subtotal: "1000",
      tax: projectDetails.tax || "19",
      items: [["1", "Test Service", "Jan 2025", "10", "100", "1000"]],
      templateId: projectDetails.templateId,
      clientName: projectDetails.clientName,
      clientAddress: projectDetails.clientAddress,
      clientNumber: projectDetails.clientNumber,
      ourCompany: projectDetails.ourCompany,
      currency: projectDetails.currency,
      bankDetails1: projectDetails.bankDetails1,
      bankDetails2: projectDetails.bankDetails2,
      exchangeRate: "1.0000",
      amountInEUR: "1000.00",
      comment: "Test invoice",
    };

    console.log("Test invoice data:", testInvoiceData);

    // Test validation
    const validation = validateInvoiceData(testInvoiceData);
    console.log("Validation result:", validation);

    if (validation.isValid) {
      console.log("✅ Test invoice data is valid");
    } else {
      console.log("❌ Test invoice data validation failed:", validation.errors);
    }

    console.log("Invoice creation flow test completed.");
  } catch (error) {
    console.error("❌ Invoice creation flow test error:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

/**
 * Debug function to check current project details state
 */
function debugProjectDetailsState() {
  console.log("=== Debugging Project Details State ===");

  try {
    // Check if project names are loaded
    const projectNames = getProjectNames();
    console.log("Available projects:", projectNames);

    if (projectNames.length > 0) {
      const testProject = projectNames[0];
      console.log(`Testing with project: ${testProject}`);

      // Test getProjectDetails function
      const projectDetails = getProjectDetails(testProject);
      console.log("Project details returned:", projectDetails);

      // Check specific fields
      console.log("Template ID:", projectDetails.templateId);
      console.log("Client Name:", projectDetails.clientName);
      console.log("Client Address:", projectDetails.clientAddress);
      console.log("Tax Rate:", projectDetails.tax);
      console.log("Currency:", projectDetails.currency);

      // Test validation with this data
      const testData = {
        projectName: testProject,
        invoiceNumber: "TEST-001",
        invoiceDate: "2025-01-15",
        dueDate: "15/01/2025",
        subtotal: "1000",
        tax: projectDetails.tax || "19",
        items: [["1", "Test Service", "Jan 2025", "10", "100", "1000"]],
        templateId: projectDetails.templateId,
        clientName: projectDetails.clientName,
        clientAddress: projectDetails.clientAddress,
        clientNumber: projectDetails.clientNumber,
        ourCompany: projectDetails.ourCompany,
        currency: projectDetails.currency,
        bankDetails1: projectDetails.bankDetails1,
        bankDetails2: projectDetails.bankDetails2,
        exchangeRate: "1.0000",
        amountInEUR: "1000.00",
        comment: "Test invoice",
      };

      const validation = validateInvoiceData(testData);
      console.log("Validation result:", validation);

      if (validation.isValid) {
        console.log("✅ Test data would pass validation");
      } else {
        console.log("❌ Test data would fail validation:", validation.errors);
      }
    } else {
      console.log("⚠️ No projects found in the system");
    }

    console.log("=== Debug Complete ===");
  } catch (error) {
    console.error("❌ Debug error:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log("=== Starting Refactored Code Tests ===");

  testUtilityFunctions();
  testDataServiceFunctions();
  testBusinessServiceFunctions();
  testBackwardCompatibility();
  testProjectDetails(); // This is the most important test for your issue
  testValidationFunction(); // Test the validation specifically
  testInvoiceCreationFlow(); // Test the complete flow

  console.log("=== All Tests Completed ===");
}

/**
 * Test configuration
 */
function testConfiguration() {
  console.log("Testing configuration...");

  console.log("CONFIG object:", CONFIG);
  console.log("ERROR_MESSAGES object:", ERROR_MESSAGES);

  // Test specific config values
  console.log("Folder ID:", CONFIG.FOLDER_ID);
  console.log("Spreadsheet ID:", CONFIG.SPREADSHEET_ID);
  console.log("Currency symbols:", CONFIG.CURRENCY_SYMBOLS);

  console.log("Configuration test completed.");
}
