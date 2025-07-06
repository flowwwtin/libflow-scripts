# Download Component Usage

## Overview
The download component provides a simple way to trigger file downloads in your web application by adding data attributes to any HTML element.

## Basic Usage

Add the `data-ft-lib-download` attribute to any HTML element to make it a download trigger:

```html
<button data-ft-lib-download data-ft-lib-download-url="https://example.com/file.pdf">
  Download File
</button>
```

## Required Attributes

- `data-ft-lib-download` - Identifies the element as a download trigger (no value needed)
- `data-ft-lib-download-url` - The URL of the file to download

## Optional Attributes

- `data-ft-lib-download-name` - The filename to use when saving the file (if not provided, browser default will be used)

## Examples

### Basic Download
```html
<a href="#" data-ft-lib-download data-ft-lib-download-url="/files/document.pdf">
  Download PDF
</a>
```

### Download with Custom Filename
```html
<button data-ft-lib-download 
        data-ft-lib-download-url="/api/reports/monthly" 
        data-ft-lib-download-name="monthly-report.xlsx">
  Download Monthly Report
</button>
```

### Multiple Download Buttons
```html
<div class="download-section">
  <button data-ft-lib-download 
          data-ft-lib-download-url="/files/guide.pdf" 
          data-ft-lib-download-name="user-guide.pdf">
    User Guide
  </button>
  
  <button data-ft-lib-download 
          data-ft-lib-download-url="/files/template.docx" 
          data-ft-lib-download-name="template.docx">
    Template
  </button>
</div>
```

## Events

The component emits a custom event when a download is triggered:

### `libflow-file-downloaded`

Dispatched on the `document` object after a download is initiated.

**Event Detail Properties:**
- `url` - The download URL
- `filename` - The filename used (empty string if not specified)
- `element` - The HTML element that triggered the download
- `timestamp` - ISO timestamp of when the download was triggered
- `originalEvent` - The original click event

**Example Event Listener:**
```javascript
document.addEventListener('libflow-file-downloaded', function(e) {
  console.log('File downloaded:', e.detail.filename);
  console.log('URL:', e.detail.url);
  console.log('Timestamp:', e.detail.timestamp);
});
```

## Notes

- The component automatically prevents the default click behavior
- Downloads are triggered by creating a temporary anchor element
- The component works with any clickable HTML element (buttons, links, divs, etc.)
- If no download URL is provided, the click will be ignored

---

# Upload Component Usage

## Overview
The upload component provides a comprehensive file upload solution with support for single and multiple file uploads, drag-and-drop functionality, file validation, progress tracking, and automatic media analysis. It integrates with the LibFlow API for secure file storage.

## Basic Usage

Add the required attributes to a form element to enable the upload functionality:

```html
<form data-ft-lib-component="upload-form" data-ft-lib-folder-id="your-folder-id">
  <input type="file" name="file" />
  <input type="hidden" name="destination" data-ft-lib-field="destination" />
  <div data-ft-lib-upload-widget>
    <div data-ft-lib-element="upload-content">
      Click to upload or drag files here
    </div>
  </div>
  <button type="submit">Submit</button>
</form>
```

## Required Attributes

### Form Level
- `data-ft-lib-component="upload-form"` - Identifies the form as an upload component
- `data-ft-lib-folder-id` - The folder ID where files will be stored

### Input Elements
- `data-ft-lib-field="destination"` - Hidden field that will contain the uploaded file URL(s)
- `data-ft-lib-upload-widget` - Container for the upload interface

### Upload Widget Elements
- `data-ft-lib-element="upload-content"` - Initial upload interface (drag/drop area)

## Optional Attributes

### Form Level
- `data-ft-lib-required="true"` - Makes file upload required for form submission
- `data-ft-lib-multiple-files="true"` - Enables multiple file selection
- `data-ft-lib-validation-[error-type]` - Custom validation error messages

### UI Elements
- `data-ft-lib-element="upload-file-info"` - Single file info display
- `data-ft-lib-element="upload-status"` - Upload progress status
- `data-ft-lib-element="multiple-files"` - Multiple files container
- `data-ft-lib-file-name` - Element to display file name
- `data-ft-lib-file-size` - Element to display file size
- `data-ft-lib-remove-file` - Button to remove single file
- `data-ft-lib-progress-bar` - Progress bar element
- `data-ft-lib-progress` - Progress container
- `data-ft-lib-validation-text` - Validation error display

### Multiple Files Elements
- `data-ft-lib-multiple-files-header` - Header for multiple files section
- `data-ft-lib-multiple-files-list` - Container for file list
- `data-ft-lib-file-item-template` - Template for individual file items
- `data-ft-lib-files-count-text` - Element showing file count
- `data-ft-lib-clear-all-files` - Button to clear all files
- `data-ft-lib-file-item` - Individual file item container
- `data-ft-lib-file-item-name` - File name in list
- `data-ft-lib-file-item-size` - File size in list
- `data-ft-lib-file-item-remove` - Remove button for individual files

## Complete Examples

### Single File Upload
```html
<form data-ft-lib-component="upload-form" data-ft-lib-folder-id="documents">
  <input type="file" name="file" accept=".pdf,.doc,.docx" />
  <input type="hidden" name="destination" data-ft-lib-field="destination" />
  
  <div data-ft-lib-upload-widget>
    <!-- Upload interface -->
    <div data-ft-lib-element="upload-content">
      <p>Click to upload or drag a document here</p>
    </div>
    
    <!-- File info display -->
    <div data-ft-lib-element="upload-file-info" style="display: none;">
      <span data-ft-lib-file-name></span>
      <span data-ft-lib-file-size></span>
      <button type="button" data-ft-lib-remove-file>Remove</button>
    </div>
    
    <!-- Upload status -->
    <div data-ft-lib-element="upload-status" style="display: none;">
      <span data-ft-lib-element="upload-status-main">Uploading...</span>
    </div>
  </div>
  
  <!-- Progress bar -->
  <div data-ft-lib-progress style="display: none;">
    <div data-ft-lib-progress-bar style="width: 0%;"></div>
  </div>
  
  <!-- Validation errors -->
  <div data-ft-lib-validation-text style="display: none;"></div>
  
  <button type="submit">Submit</button>
</form>
```

### Multiple File Upload
```html
<form data-ft-lib-component="upload-form" 
      data-ft-lib-folder-id="media" 
      data-ft-lib-multiple-files="true">
  <input type="file" name="files" multiple accept="image/*,video/*" />
  <input type="hidden" name="destination" data-ft-lib-field="destination" />
  
  <div data-ft-lib-upload-widget>
    <!-- Upload interface -->
    <div data-ft-lib-element="upload-content">
      <p>Click to upload or drag multiple files here</p>
    </div>
    
    <!-- Multiple files display -->
    <div data-ft-lib-element="multiple-files" style="display: none;">
      <div data-ft-lib-multiple-files-header>
        <span data-ft-lib-files-count-text"></span>
        <button type="button" data-ft-lib-clear-all-files>Clear All</button>
      </div>
      
      <div data-ft-lib-multiple-files-list>
        <!-- File item template -->
        <div data-ft-lib-file-item-template data-ft-lib-file-item style="display: none;">
          <span data-ft-lib-file-item-name></span>
          <span data-ft-lib-file-item-size></span>
          <button type="button" data-ft-lib-file-item-remove>×</button>
        </div>
      </div>
    </div>
    
    <!-- Upload status -->
    <div data-ft-lib-element="upload-status" style="display: none;">
      <span data-ft-lib-element="upload-status-main">Processing files...</span>
    </div>
  </div>
  
  <!-- Progress bar -->
  <div data-ft-lib-progress style="display: none;">
    <div data-ft-lib-progress-bar style="width: 0%;"></div>
  </div>
  
  <!-- Validation errors -->
  <div data-ft-lib-validation-text style="display: none;"></div>
  
  <button type="submit">Submit</button>
</form>
```

### Required Upload with Validation
```html
<form data-ft-lib-component="upload-form" 
      data-ft-lib-folder-id="attachments" 
      data-ft-lib-required="true"
      data-ft-lib-validation-file-required="Please upload a file before submitting"
      data-ft-lib-validation-file-too-large="File size must be less than 10MB"
      data-ft-lib-validation-invalid-file-type="Only PDF, DOC, and DOCX files are allowed">
  <!-- Form content -->
</form>
```

## Events

The upload component emits various custom events throughout the upload process:

### File Selection Events

#### `libflow-file-selected`
Emitted when files are selected via file input or drag-and-drop.

**Event Detail Properties:**
- `files` - Array of file objects with name, size, and type
- `fileCount` - Number of files selected
- `multipleMode` - Boolean indicating if multiple files are enabled
- `timestamp` - ISO timestamp

```javascript
document.addEventListener('libflow-file-selected', function(e) {
  console.log(`${e.detail.fileCount} files selected`);
  e.detail.files.forEach(file => {
    console.log(`File: ${file.name}, Size: ${file.size}, Type: ${file.type}`);
  });
});
```

#### `libflow-file-drop`
Emitted when files are dropped onto the upload widget.

**Event Detail Properties:**
- `files` - Array of dropped file objects
- `fileCount` - Number of files dropped
- `multipleMode` - Boolean indicating if multiple files are enabled
- `timestamp` - ISO timestamp

### File Management Events

#### `libflow-file-clear`
Emitted when the remove file button is clicked.

**Event Detail Properties:**
- `multipleMode` - Boolean indicating if multiple files are enabled
- `timestamp` - ISO timestamp

#### `libflow-file-remove`
Emitted when a specific file is removed from multiple file selection.

**Event Detail Properties:**
- `fileName` - Name of the removed file
- `fileSize` - Size of the removed file
- `fileType` - MIME type of the removed file
- `fileIndex` - Index of the removed file
- `timestamp` - ISO timestamp

#### `libflow-files-clear-all`
Emitted when the clear all files button is clicked.

**Event Detail Properties:**
- `fileCount` - Number of files that were cleared
- `timestamp` - ISO timestamp

### Upload Process Events

#### `libflow-upload-start`
Emitted when the upload process begins.

**Event Detail Properties:**
- `files` - Array of file objects being uploaded
- `fileCount` - Number of files being uploaded
- `multipleMode` - Boolean indicating if multiple files are enabled
- `timestamp` - ISO timestamp

#### `libflow-file-analyzed`
Emitted after each file is analyzed with MediaInfo.

**Event Detail Properties:**
- `fileName` - Name of the analyzed file
- `fileSize` - Size of the analyzed file
- `fileType` - MIME type of the analyzed file
- `fileIndex` - Index of the file being analyzed
- `mediaData` - Media analysis results (duration, format, resolution, etc.)
- `progress` - Current analysis progress percentage
- `timestamp` - ISO timestamp

#### `libflow-upload-progress`
Emitted during file upload with progress information.

**Event Detail Properties:**
- `fileName` - Name of the file being uploaded
- `fileSize` - Size of the file being uploaded
- `fileType` - MIME type of the file being uploaded
- `fileIndex` - Index of the file being uploaded
- `loaded` - Bytes uploaded so far
- `total` - Total bytes to upload
- `fileProgress` - Progress percentage for current file
- `totalProgress` - Overall progress percentage
- `timestamp` - ISO timestamp

#### `libflow-file-uploaded`
Emitted when an individual file upload completes.

**Event Detail Properties:**
- `fileName` - Name of the uploaded file
- `fileSize` - Size of the uploaded file
- `fileType` - MIME type of the uploaded file
- `fileIndex` - Index of the uploaded file
- `fileUrl` - URL of the uploaded file
- `progress` - Overall upload progress percentage
- `timestamp` - ISO timestamp

#### `libflow-upload-complete`
Emitted when all files have been uploaded successfully.

**Event Detail Properties:**
- `files` - Array of all uploaded file objects
- `fileCount` - Number of files uploaded
- `uploadedUrls` - Array of uploaded file URLs
- `multipleMode` - Boolean indicating if multiple files were enabled
- `timestamp` - ISO timestamp

### Error Events

#### `libflow-upload-error`
Emitted when an upload error occurs.

**Event Detail Properties:**
- `error` - Error message
- `errorType` - Type of error (e.g., 'validation', 'network')
- `isValidationError` - Boolean indicating if this is a validation error
- `files` - Array of file objects that failed
- `fileCount` - Number of files that failed
- `timestamp` - ISO timestamp

#### `libflow-validation-error`
Emitted specifically for validation errors.

**Event Detail Properties:**
- `errorTypes` - Array of validation error types
- `files` - Array of file objects that failed validation
- `timestamp` - ISO timestamp

### Form Submission Events

#### `libflow-form-submit`
Emitted when the form is submitted after successful upload.

**Event Detail Properties:**
- `hasFiles` - Boolean indicating if files were uploaded
- `destinationValue` - Value of the destination field (file URLs)
- `timestamp` - ISO timestamp

## JavaScript API

The component exposes a global `LibFlow` object with utility methods:

```javascript
// Check if LibFlow is initialized
if (window.LibFlow && window.LibFlow.isInitialized) {
  console.log('LibFlow version:', window.LibFlow.version);
}

// Check if MediaInfo is available for file analysis
if (window.LibFlow.mediaInfoAvailable()) {
  console.log('Media analysis is available');
}

// Reinitialize upload components (useful for dynamically added forms)
window.LibFlow.reinitialize();

// Set custom API base URL
window.LibFlow.setApiBase('https://your-api-domain.com/api');

// Analyze a file manually
const fileInput = document.querySelector('input[type="file"]');
if (fileInput.files[0]) {
  window.LibFlow.analyzeFile(fileInput.files[0]).then(mediaData => {
    console.log('Media analysis:', mediaData);
  });
}

// Check if a form has multiple file support
const form = document.querySelector('[data-ft-lib-component="upload-form"]');
const isMultiple = window.LibFlow.getMultipleFileStatus(form);
```

## CSS States

The upload widget automatically applies CSS data attributes that you can use for styling:

```css
/* Default state */
[data-ft-lib-upload-widget] {
  border: 2px dashed #ccc;
  padding: 20px;
  text-align: center;
}

/* Drag over state */
[data-ft-lib-upload-widget][data-ft-lib-state-dragover] {
  border-color: #007bff;
  background-color: #f8f9fa;
}

/* Has single file */
[data-ft-lib-upload-widget][data-ft-lib-state="has-file"] {
  border-color: #28a745;
}

/* Has multiple files */
[data-ft-lib-upload-widget][data-ft-lib-state="has-multiple-files"] {
  border-color: #28a745;
}

/* Uploading state */
[data-ft-lib-upload-widget][data-ft-lib-state="uploading"] {
  border-color: #ffc107;
  pointer-events: none;
}
```

## Media Analysis

The component automatically analyzes uploaded media files using MediaInfo.js and provides detailed metadata:

**Available Media Data:**
- `duration` - Video/audio duration
- `format` - File format (e.g., 'MP4', 'AVI')
- `resolution` - Video resolution (e.g., '1920x1080')
- `width` - Video width in pixels
- `height` - Video height in pixels
- `bitrate` - Overall bitrate
- `codec` - Video/audio codec
- `size` - File size in bytes

## Notes

- The component requires an active internet connection to load MediaInfo.js
- Files are uploaded to secure cloud storage via presigned URLs
- The destination field receives either a single URL (single file) or JSON array of URLs (multiple files)
- Drag and drop is supported on modern browsers
- File validation is handled server-side with custom error messages
- Progress tracking works for both individual files and overall upload progress
- The component gracefully handles MediaInfo loading failures
- All events bubble up and can be caught at the document level