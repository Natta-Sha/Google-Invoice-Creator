# Invoice Creator - Google Apps Script Application

A comprehensive invoice generation system built with Google Apps Script that creates professional invoices with Google Docs templates and generates PDFs.

## 🏗️ Architecture Overview

The application follows a layered architecture pattern with clear separation of concerns:

### 📁 File Structure

```
invoices-creator/
├── Code.js                 # Main entry point and web app endpoints
├── businessService.js      # Business logic and orchestration
├── dataService.js          # Data access layer (spreadsheet operations)
├── documentService.js      # Document creation and PDF generation
├── utils.js               # Utility functions and helpers
├── config.js              # Configuration constants
├── appsscript.json        # Google Apps Script manifest
├── Home.html              # Main landing page
├── InvoiceGenerator.html  # Invoice creation form
└── InvoicesList.html      # Invoice listing and management
```

### 🔧 Service Layers

#### 1. **Code.js** - Application Entry Point

- Web app endpoints (`doGet`)
- Public API functions for frontend
- Delegates to appropriate service layers

#### 2. **businessService.js** - Business Logic Layer

- Orchestrates operations between data and document services
- Handles validation and business rules
- Manages caching and error handling
- Main functions:
  - `processInvoiceCreation()` - Complete invoice creation workflow
  - `validateInvoiceData()` - Data validation
  - `getProjectDetailsWithValidation()` - Enhanced project details retrieval
  - `deleteInvoiceWithCleanup()` - Invoice deletion with cleanup

#### 3. **dataService.js** - Data Access Layer

- Handles all spreadsheet read/write operations
- Manages data caching
- Provides data transformation and formatting
- Main functions:
  - `getProjectNamesFromData()` - Retrieve project names
  - `getProjectDetailsFromData()` - Get project configuration
  - `getInvoiceListFromData()` - Retrieve invoice list
  - `saveInvoiceData()` - Save invoice to spreadsheet
  - `deleteInvoiceByIdFromData()` - Delete invoice and files

#### 4. **documentService.js** - Document Operations

- Google Docs template manipulation
- PDF generation and file management
- Document placeholder replacement
- Main functions:
  - `createInvoiceDocFromDocumentService()` - Create invoice document
  - `generateAndSavePDFFromDocumentService()` - Generate and save PDF
  - `updateSpreadsheetWithUrlsFromDocumentService()` - Update URLs in spreadsheet

#### 5. **utils.js** - Utility Functions

- Date formatting and validation
- Currency calculations
- File name generation
- Spreadsheet utilities
- Organized into logical sections with clear naming

#### 6. **config.js** - Configuration

- Google Drive IDs and sheet names
- Column mappings
- Error messages
- Currency symbols

## 🚀 Key Features

### ✅ Invoice Management

- Create invoices from project templates
- Automatic tax calculations
- Multiple currency support (USD, EUR, UAH)
- Exchange rate handling for USD invoices

### ✅ Document Generation

- Google Docs template-based invoice creation
- Automatic PDF generation
- Professional file naming
- Organized file storage in Google Drive

### ✅ Data Management

- Spreadsheet-based data storage
- Project configuration management
- Invoice history and listing
- Caching for performance optimization

### ✅ User Interface

- Responsive Bootstrap-based UI
- Real-time calculations
- Form validation
- Invoice viewing and deletion

## 🔄 Refactoring Improvements

### Before Refactoring

- Mixed responsibilities in single files
- Code duplication across functions
- Inconsistent error handling
- Business logic mixed with data access
- Poor separation of concerns

### After Refactoring

- ✅ **Clear Separation of Concerns**: Each file has a specific responsibility
- ✅ **Eliminated Code Duplication**: Removed redundant wrapper functions
- ✅ **Consistent Error Handling**: Standardized error handling patterns
- ✅ **Improved Maintainability**: Better organized and documented code
- ✅ **Enhanced Performance**: Optimized caching and data access
- ✅ **Better Testing**: Isolated functions for easier testing
- ✅ **Scalability**: Modular architecture supports future enhancements

## 📋 Setup Instructions

### 1. Google Apps Script Setup

```bash
# Install clasp (Google Apps Script CLI)
npm install -g @google/clasp

# Login to Google
clasp login

# Clone and setup project
cd invoices-creator
clasp push
```

### 2. Configuration

Update `config.js` with your Google Drive IDs:

- `FOLDER_ID`: Google Drive folder for storing invoices
- `SPREADSHEET_ID`: Google Sheets ID for data storage

### 3. Spreadsheet Setup

Ensure your Google Sheets has:

- **Lists** sheet: Project configurations and templates
- **Invoices** sheet: Invoice data storage

### 4. Deploy

```bash
# Deploy as web app
clasp deploy
```

## 🔧 Development Workflow

### Switching Between Accounts

```bash
# Switch to Sloboda account
cp ~/.clasprc_sloboda.json ~/.clasprc.json

# Switch to Personal account
cp ~/.clasprc_personal.json ~/.clasprc.json

# Navigate to project
cd ~/projects/invoices-creator/

# Standard operations
clasp pull    # Pull latest code
clasp push    # Push changes
clasp open    # Open in browser
```

## 🧪 Testing

The refactored code includes:

- Comprehensive error handling
- Detailed logging for debugging
- Input validation at multiple levels
- Graceful fallbacks for missing data

## 📈 Performance Optimizations

- **Caching**: Invoice list cached for 5 minutes
- **Batch Operations**: Efficient spreadsheet operations
- **Error Recovery**: Graceful handling of failures
- **Memory Management**: Proper cleanup of resources

## 🔒 Security Considerations

- Domain-restricted access for web app
- Input validation and sanitization
- Error messages don't expose sensitive data
- Proper file permissions management

## 🚀 Future Enhancements

The refactored architecture supports:

- Additional invoice templates
- Multi-language support
- Advanced reporting features
- Integration with external systems
- Enhanced user management

## 📞 Support

For issues or questions:

1. Check the logs in Google Apps Script console
2. Verify configuration in `config.js`
3. Ensure proper Google Drive permissions
4. Review spreadsheet structure and data

---

**Note**: This refactored version maintains 100% backward compatibility while providing a much more maintainable and scalable codebase.
