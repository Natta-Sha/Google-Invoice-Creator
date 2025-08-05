// Configuration constants
const CONFIG = {
  // Google Drive IDs
  FOLDER_ID: "1Djz7X55KECay2nj_LU2lQJGyLKU1toFl",
  SPREADSHEET_ID: "1yKl8WDZQORJoVhfZ-zyyHXq2A1XCnC09wt9Q3b2bcq8",

  // Sheet names
  SHEETS: {
    INVOICES: "Invoices",
    LISTS: "Lists",
  },

  // Currency mapping
  CURRENCY_SYMBOLS: {
    USD: "$",
    EUR: "€",
    UAH: "₴",
  },

  // Column mappings for better maintainability
  COLUMNS: {
    PROJECT_NAME: 0,
    CLIENT_NAME: 1,
    CLIENT_NUMBER_PART1: 2,
    CLIENT_NUMBER_PART2: 3,
    CLIENT_ADDRESS: 4,
    TAX_RATE: 5,
    BANK_SHORT_1: 6,
    BANK_SHORT_2: 7,
    CURRENCY: 8,
    DAY_TYPE: 9,
    PAYMENT_DELAY: 10,
    TEMPLATE_NAME: 13,
    OUR_COMPANY: 14,
    TEMPLATE_NAME_COL: 19,
    TEMPLATE_ID_COL: 20,
    BANK_SHORT_COL: 16,
    BANK_FULL_COL: 17,
  },

  // Invoice table structure
  INVOICE_TABLE: {
    MAX_ROWS: 20,
    COLUMNS_PER_ROW: 6,
  },

  // File naming patterns
  FILENAME_PATTERNS: {
    INVOICE: "{date}_Invoice{number}_{company}-{client}",
  },
};

// Error messages
const ERROR_MESSAGES = {
  PROJECT_NOT_FOUND: (name) => `❗ Project "${name}" not found in column A.`,
  NO_TEMPLATE_NAME: (name) =>
    `🚫 No invoice template name specified for project "${name}". Please fill in column N.`,
  NO_TEMPLATE_FOUND: (name) =>
    `🚫 No invoice template found for "${name}". Please check columns T and U in 'Lists'.`,
  NO_TEMPLATE_ID:
    "🚫 No invoice template found for the selected project. Please check Clients details and ensure the template of invoice is chosen.",
  TABLE_NOT_FOUND:
    "❗ No table with such column names found (#, Services, Period, ...)",
  INVOICE_NOT_FOUND: "Invoice not found",
  MISSING_COLUMN: (name) => `Missing column: "${name}"`,
};
