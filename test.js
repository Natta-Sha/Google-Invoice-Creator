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
 * Run all tests
 */
function runAllTests() {
  console.log("=== Starting Refactored Code Tests ===");

  testUtilityFunctions();
  testDataServiceFunctions();
  testBusinessServiceFunctions();
  testBackwardCompatibility();
  testProjectDetails(); // This is the most important test for your issue

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
