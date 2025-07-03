(function() {
    'use strict';

    let LIBFLOW_API_BASE = 'https://libflow.flowwwtin.com/api';

    let mediaInfoInstance = null;

    function loadMediaInfoScript() {
        return new Promise((resolve, reject) => {
            if (typeof MediaInfo !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = "https://unpkg.com/mediainfo.js";
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    document.addEventListener('DOMContentLoaded', function() {
        loadMediaInfoScript().then(() => {
            return initializeMediaInfo();
        }).then(() => {
            initializeLibFlowUpload();
        }).catch(error => {
            console.error('LibFlow: Failed to initialize MediaInfo:', error);
            initializeLibFlowUpload();
        });
    });

    async function initializeMediaInfo() {
        try {
            if (typeof MediaInfo === 'undefined') {
                throw new Error('MediaInfo library not loaded from CDN');
            }

            mediaInfoInstance = await MediaInfo.mediaInfoFactory({
                format: 'object'
            });

            console.log('LibFlow: MediaInfo initialized successfully');
        } catch (error) {
            console.error('LibFlow: MediaInfo initialization failed:', error);
            throw error;
        }
    }

    function initializeLibFlowUpload() {
        const uploadForms = document.querySelectorAll('[data-ft-lib-component="upload-form"]');

        uploadForms.forEach(form => {
            const fileInput = form.querySelector('input[type="file"]');
            const uploadWidget = form.querySelector('[data-ft-lib-upload-widget]');
            const destinationField = form.querySelector('[data-ft-lib-field="destination"]');
            const progressBar = form.querySelector('[data-ft-lib-progress-bar]');
            const progressContainer = form.querySelector('[data-ft-lib-progress]');
            const submitButton = form.querySelector('input[type="submit"], button[type="submit"]');
            const validationTextElement = form.querySelector('[data-ft-lib-validation-text]');

            const folderId = form.getAttribute('data-ft-lib-folder-id');

            const isUploadRequired = form.getAttribute('data-ft-lib-required') === 'true';

            const allowMultiple = form.getAttribute('data-ft-lib-multiple-files') === 'true';

            if (!fileInput || !destinationField) {
                console.warn('LibFlow: Missing required elements (file input or destination field)');
                return;
            }

            if (allowMultiple) {
                fileInput.setAttribute('multiple', 'multiple');
                console.log('LibFlow: Multiple file upload enabled');
            }

            destinationField.style.display = 'none';

            initializeWidgetUI(form, {
                fileInput,
                uploadWidget,
                destinationField,
                progressBar,
                progressContainer,
                submitButton,
                validationTextElement,
                folderId,
                isUploadRequired,
                allowMultiple
            });

            const originalAction = form.action;
            const originalMethod = form.method || 'POST';
            const originalTarget = form.target;
            const originalEnctype = form.enctype;

            form.addEventListener('submit', function(e) {
                handleFormSubmit(e, {
                    form,
                    fileInput,
                    uploadWidget,
                    destinationField,
                    progressBar,
                    progressContainer,
                    submitButton,
                    validationTextElement,
                    originalAction,
                    originalMethod,
                    originalTarget,
                    originalEnctype,
                    folderId,
                    isUploadRequired,
                    allowMultiple
                });
            });
        });
    }

    function initializeWidgetUI(form, elements) {
        const { fileInput, uploadWidget, progressContainer, validationTextElement, allowMultiple } = elements;

        if (!uploadWidget) return;

        const uploadContent = uploadWidget.querySelector('[data-ft-lib-element="upload-content"]');
        const fileInfo = uploadWidget.querySelector('[data-ft-lib-element="upload-file-info"]');
        const uploadStatus = uploadWidget.querySelector('[data-ft-lib-element="upload-status"]');
        const fileName = uploadWidget.querySelector('[data-ft-lib-file-name]');
        const fileSize = uploadWidget.querySelector('[data-ft-lib-file-size]');
        const removeButton = uploadWidget.querySelector('[data-ft-lib-remove-file]');

        const multipleFilesContainer = uploadWidget.querySelector('[data-ft-lib-element="multiple-files"]');

        if (allowMultiple && !multipleFilesContainer) {
            console.warn('LibFlow: Multiple files enabled but [data-ft-lib-element="multiple-files"] container not found in markup');
        }

        // Set initial visibility state on load
        if (fileInput) fileInput.style.display = 'none';
        if (uploadContent) uploadContent.style.display = 'flex';
        if (fileInfo) fileInfo.style.display = 'none';
        if (uploadStatus) uploadStatus.style.display = 'none';
        if (multipleFilesContainer) multipleFilesContainer.style.display = 'none';
        if (progressContainer) progressContainer.style.display = 'none';
        if (validationTextElement) validationTextElement.style.display = 'none';

        // Hide file item template
        const fileItemTemplate = uploadWidget.querySelector('[data-ft-lib-file-item-template]');
        if (fileItemTemplate) fileItemTemplate.style.display = 'none';

        uploadWidget.addEventListener('click', function(e) {
            if (uploadWidget.getAttribute('data-ft-lib-state') !== 'uploading' &&
                !e.target.closest('[data-ft-lib-remove-file]') &&
                !e.target.closest('[data-ft-lib-file-item-remove]')) {
                fileInput.click();
            }
        });

        uploadWidget.addEventListener('dragover', function(e) {
            e.preventDefault();
            uploadWidget.setAttribute('data-ft-lib-state-dragover', '');
        });

        uploadWidget.addEventListener('dragleave', function(e) {
            e.preventDefault();
            if (!uploadWidget.contains(e.relatedTarget)) {
                uploadWidget.removeAttribute('data-ft-lib-state-dragover');
            }
        });

        uploadWidget.addEventListener('drop', function(e) {
            e.preventDefault();
            uploadWidget.removeAttribute('data-ft-lib-state-dragover');

            if (uploadWidget.getAttribute('data-ft-lib-state') === 'uploading') return;

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const dt = new DataTransfer();

                if (allowMultiple) {
                    // Add existing files first
                    const existingFiles = fileInput._libflowFiles || [];
                    for (let i = 0; i < existingFiles.length; i++) {
                        dt.items.add(existingFiles[i]);
                    }
                    // Then add new files
                    for (let i = 0; i < files.length; i++) {
                        dt.items.add(files[i]);
                    }
                } else {
                    dt.items.add(files[0]);
                }

                fileInput.setAttribute('data-ft-lib-programmatic-change', 'true');
                fileInput.files = dt.files;

                const changeEvent = new Event('change', { bubbles: true });
                fileInput.dispatchEvent(changeEvent);
            }
        });

        fileInput.addEventListener('change', function(e) {
            // Prevent recursive calls when we programmatically update the file input
            if (fileInput._libflowUpdating) {
                return;
            }

            const newFiles = Array.from(e.target.files);

            if (progressContainer) {
                progressContainer.style.display = 'none';
            }
            elements.destinationField.value = '';
            hideValidationError(validationTextElement);

            if (newFiles.length > 0) {
                if (allowMultiple) {
                    // Check if this change was triggered by our drag/drop or programmatic file addition
                    const isFromDropOrProgrammatic = e.target.hasAttribute('data-ft-lib-programmatic-change');

                    let allFiles;
                    if (isFromDropOrProgrammatic) {
                        // This change was from drag/drop or our own code, use files as-is
                        allFiles = newFiles;
                        e.target.removeAttribute('data-ft-lib-programmatic-change');
                    } else {
                        // This is from user clicking file input, combine with existing
                        const existingFiles = fileInput._libflowFiles || [];
                        allFiles = [...existingFiles, ...newFiles];

                        // Update the file input with combined files (but don't trigger another change event)
                        const dt = new DataTransfer();
                        allFiles.forEach(file => dt.items.add(file));

                        // Set flag to prevent recursive calls
                        fileInput._libflowUpdating = true;
                        e.target.files = dt.files;
                        fileInput._libflowUpdating = false;
                    }

                    // Store current files for next addition
                    fileInput._libflowFiles = allFiles;

                    updateWidgetWithMultipleFiles(uploadWidget, allFiles, {
                        uploadContent,
                        fileInfo,
                        uploadStatus,
                        fileName,
                        fileSize,
                        removeButton,
                        multipleFilesContainer
                    });
                } else {
                    updateWidgetWithFile(uploadWidget, newFiles[0], {
                        uploadContent,
                        fileInfo,
                        uploadStatus,
                        fileName,
                        fileSize,
                        removeButton
                    });
                }
            } else {
                if (allowMultiple) {
                    fileInput._libflowFiles = [];
                }
                resetWidget(uploadWidget, uploadContent, fileInfo, uploadStatus, multipleFilesContainer);
            }
        });

        if (removeButton) {
            removeButton.addEventListener('click', function(e) {
                e.stopPropagation();

                fileInput.value = '';
                fileInput._libflowFiles = [];
                elements.destinationField.value = '';

                resetWidget(uploadWidget, uploadContent, fileInfo, uploadStatus, multipleFilesContainer);

                hideValidationError(validationTextElement);
            });
        }
    }

    function updateWidgetWithFile(widget, file, elements) {
        const { uploadContent, fileInfo, uploadStatus, fileName, fileSize } = elements;

        widget.setAttribute('data-ft-lib-state', 'has-file');
        widget.removeAttribute('data-ft-lib-state-dragover');
        widget.removeAttribute('data-ft-lib-state');
        widget.removeAttribute('data-ft-lib-state');

        if (uploadContent) uploadContent.style.display = 'none';
        if (fileInfo) fileInfo.style.display = 'flex';
        if (uploadStatus) uploadStatus.style.display = 'none';

        if (fileName) fileName.textContent = file.name;
        if (fileSize) fileSize.textContent = formatFileSize(file.size);
    }

    function updateWidgetWithMultipleFiles(widget, files, elements) {
        const { uploadContent, fileInfo, uploadStatus, multipleFilesContainer } = elements;

        widget.setAttribute('data-ft-lib-state', 'has-multiple-files');
        widget.removeAttribute('data-ft-lib-state-dragover');
        widget.removeAttribute('data-ft-lib-state');
        widget.removeAttribute('data-ft-lib-state');

        if (uploadContent) uploadContent.style.display = 'flex';
        if (fileInfo) fileInfo.style.display = 'none';
        if (uploadStatus) uploadStatus.style.display = 'none';
        if (multipleFilesContainer) {
            multipleFilesContainer.style.display = 'flex';
            updateMultipleFilesDisplay(multipleFilesContainer, files, widget);
        }
    }

    function updateMultipleFilesDisplay(container, files, widget) {
        if (!container) return;

        const header = container.querySelector('[data-ft-lib-multiple-files-header]');
        const fileList = container.querySelector('[data-ft-lib-multiple-files-list]');
        const fileItemTemplate = container.querySelector('[data-ft-lib-file-item-template]');
        const clearAllBtn = container.querySelector('[data-ft-lib-clear-all-files]');

        if (!header || !fileList || !fileItemTemplate) {
            console.warn('LibFlow: Missing required elements in multiple files container');
            return;
        }

        if (header) {
            const headerText = header.querySelector('[data-ft-lib-files-count-text]');
            if (headerText) {
                headerText.textContent = `${files.length} file${files.length !== 1 ? 's' : ''} selected`;
            }
        }

        const existingItems = fileList.querySelectorAll('[data-ft-lib-file-item]:not([data-ft-lib-file-item-template])');
        existingItems.forEach(item => item.remove());

        files.forEach((file, index) => {
            const fileItem = fileItemTemplate.cloneNode(true);
            fileItem.removeAttribute('data-ft-lib-file-item-template');
            fileItem.style.display = '';

            const fileName = fileItem.querySelector('[data-ft-lib-file-item-name]');
            const fileSize = fileItem.querySelector('[data-ft-lib-file-item-size]');
            const removeBtn = fileItem.querySelector('[data-ft-lib-file-item-remove]');

            if (fileName) fileName.textContent = file.name;
            if (fileSize) fileSize.textContent = formatFileSize(file.size);
            if (removeBtn) {
                removeBtn.setAttribute('data-file-index', index);
                removeBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    removeFileFromSelection(widget, index);
                });
            }

            fileList.appendChild(fileItem);
        });

        if (clearAllBtn && !clearAllBtn.hasAttribute('data-ft-lib-event-bound')) {
            clearAllBtn.setAttribute('data-ft-lib-event-bound', 'true');
            clearAllBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                clearAllFiles(widget);
            });
        }
    }

    function removeFileFromSelection(widget, indexToRemove) {
        const fileInput = widget.closest('form').querySelector('input[type="file"]');
        const files = Array.from(fileInput.files);

        files.splice(indexToRemove, 1);

        const dt = new DataTransfer();
        files.forEach(file => dt.items.add(file));

        // Update our internal file storage
        fileInput._libflowFiles = files;

        fileInput.setAttribute('data-ft-lib-programmatic-change', 'true');
        fileInput.files = dt.files;

        const changeEvent = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(changeEvent);
    }

    function clearAllFiles(widget) {
        const fileInput = widget.closest('form').querySelector('input[type="file"]');
        const destinationField = widget.closest('form').querySelector('[data-ft-lib-field="destination"]');

        fileInput.value = '';
        fileInput._libflowFiles = [];
        destinationField.value = '';

        const uploadContent = widget.querySelector('[data-ft-lib-element="upload-content"]');
        const fileInfo = widget.querySelector('[data-ft-lib-element="upload-file-info"]');
        const uploadStatus = widget.querySelector('[data-ft-lib-element="upload-status"]');
        const multipleFilesContainer = widget.querySelector('[data-ft-lib-element="multiple-files"]');

        resetWidget(widget, uploadContent, fileInfo, uploadStatus, multipleFilesContainer);
    }

    function resetWidget(widget, uploadContent, fileInfo, uploadStatus, multipleFilesContainer) {
        widget.removeAttribute('data-ft-lib-state');
        widget.removeAttribute('data-ft-lib-state');
        widget.removeAttribute('data-ft-lib-state');
        widget.removeAttribute('data-ft-lib-state-dragover');

        if (uploadContent) uploadContent.style.display = 'flex';
        if (fileInfo) fileInfo.style.display = 'none';
        if (uploadStatus) uploadStatus.style.display = 'none';
        if (multipleFilesContainer) multipleFilesContainer.style.display = 'none';
    }

    function setWidgetUploadingState(widget, isUploading, statusText) {
        const uploadContent = widget.querySelector('[data-ft-lib-element="upload-content"]');
        const fileInfo = widget.querySelector('[data-ft-lib-element="upload-file-info"]');
        const uploadStatus = widget.querySelector('[data-ft-lib-element="upload-status"]');
        const multipleFilesContainer = widget.querySelector('[data-ft-lib-element="multiple-files"]');
        const statusMainText = widget.querySelector('[data-ft-lib-element="upload-status-main"]');

        if (isUploading) {
            widget.setAttribute('data-ft-lib-state', 'uploading');

            if (uploadContent) uploadContent.style.display = 'none';
            if (fileInfo) fileInfo.style.display = 'none';
            if (uploadStatus) uploadStatus.style.display = 'flex';
            if (multipleFilesContainer) multipleFilesContainer.style.display = 'none';

            if (statusMainText && statusText) {
                statusMainText.textContent = statusText;
            }
        } else {
            widget.removeAttribute('data-ft-lib-state');

            if (uploadStatus) uploadStatus.style.display = 'none';

            const hasFile = widget.getAttribute('data-ft-lib-state') === 'has-file';
            const hasMultipleFiles = widget.getAttribute('data-ft-lib-state') === 'has-multiple-files';

            if (hasMultipleFiles) {
                if (uploadContent) uploadContent.style.display = 'flex';
                if (multipleFilesContainer) multipleFilesContainer.style.display = 'flex';
            } else if (hasFile) {
                if (fileInfo) fileInfo.style.display = 'flex';
            } else {
                if (uploadContent) uploadContent.style.display = 'flex';
            }
        }
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function showValidationError(form, validationTextElement, errorTypes) {
        if (!validationTextElement) {
            console.warn('LibFlow: Could not show validation error - missing validation text element');
            return;
        }

        if (!Array.isArray(errorTypes)) {
            errorTypes = [errorTypes];
        }

        const errorMessages = [];

        errorTypes.forEach(errorType => {
            const errorMessage = form.getAttribute(`data-ft-lib-validation-${errorType.toLowerCase().replace('_', '-')}`);
            if (errorMessage) {
                errorMessages.push(errorMessage);
            } else {
                console.warn('LibFlow: Missing validation message for error type:', errorType);
            }
        });

        if (errorMessages.length > 0) {
            validationTextElement.innerHTML = errorMessages.join('<br>');
            validationTextElement.style.display = 'block';
            console.log('LibFlow: Showing validation errors:', errorMessages);
        } else {
            console.warn('LibFlow: No validation messages found for error types:', errorTypes);
        }
    }

    function hideValidationError(validationTextElement) {
        if (validationTextElement) {
            validationTextElement.style.display = 'none';
            validationTextElement.innerHTML = '';
        }
    }

    async function analyzeFileWithMediaInfo(file) {
        if (!mediaInfoInstance) {
            console.warn('LibFlow: MediaInfo not available, using file.size');
            return {
                size: file.size,
                duration: null,
                format: null,
                mediaInfo: null
            };
        }

        try {
            console.log('LibFlow: Analyzing file with MediaInfo...');

            const getSize = () => file.size;
            const readChunk = (chunkSize, offset) => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        if (event.target.error) {
                            reject(event.target.error);
                        } else {
                            resolve(new Uint8Array(event.target.result));
                        }
                    };
                    reader.onerror = () => reject(reader.error);
                    reader.readAsArrayBuffer(file.slice(offset, offset + chunkSize));
                });
            };

            const result = await mediaInfoInstance.analyzeData(getSize, readChunk);

            const mediaData = parseMediaInfoResult(result, file);

            console.log('LibFlow: MediaInfo analysis complete:', mediaData);
            return mediaData;

        } catch (error) {
            console.error('LibFlow: MediaInfo analysis failed:', error);
            return {
                size: file.size,
                duration: null,
                format: null,
                mediaInfo: null,
                error: error.message
            };
        }
    }

    function parseMediaInfoResult(result, file) {
        const mediaData = {
            size: file.size,
            duration: null,
            format: null,
            mediaInfo: result,
            bitrate: null,
            resolution: null,
            codec: null,
            width: null,
            height: null
        };

        try {
            if (typeof result === 'object' && result.media && result.media.track) {
                const tracks = result.media.track;

                const generalTrack = tracks.find(track => track['@type'] === 'General');
                if (generalTrack) {
                    mediaData.format = generalTrack.Format;
                    mediaData.duration = generalTrack.Duration;
                    if (generalTrack.OverallBitRate) {
                        mediaData.bitrate = generalTrack.OverallBitRate;
                    }
                }

                const videoTrack = tracks.find(track => track['@type'] === 'Video');
                if (videoTrack) {
                    mediaData.width = videoTrack.Width;
                    mediaData.height = videoTrack.Height;
                    mediaData.codec = videoTrack.Format;
                    if (mediaData.width && mediaData.height) {
                        mediaData.resolution = `${mediaData.width}x${mediaData.height}`;
                    }
                }

                if (!videoTrack) {
                    const audioTrack = tracks.find(track => track['@type'] === 'Audio');
                    if (audioTrack) {
                        mediaData.codec = audioTrack.Format;
                        if (audioTrack.BitRate) {
                            mediaData.bitrate = audioTrack.BitRate;
                        }
                    }
                }
            }
            else if (typeof result === 'string') {
                const lines = result.split('\n');

                for (const line of lines) {
                    const trimmedLine = line.trim();

                    if (trimmedLine.includes('Duration') && trimmedLine.includes(':')) {
                        const durationMatch = trimmedLine.match(/Duration\s*:\s*([^\s]+)/i);
                        if (durationMatch) {
                            mediaData.duration = durationMatch[1];
                        }
                    }

                    if (trimmedLine.includes('Format') && trimmedLine.includes(':')) {
                        const formatMatch = trimmedLine.match(/Format\s*:\s*([^\s]+)/i);
                        if (formatMatch) {
                            mediaData.format = formatMatch[1];
                        }
                    }

                    if (trimmedLine.includes('Overall bit rate') && trimmedLine.includes(':')) {
                        const bitrateMatch = trimmedLine.match(/Overall bit rate\s*:\s*([^\s]+)/i);
                        if (bitrateMatch) {
                            mediaData.bitrate = bitrateMatch[1];
                        }
                    }

                    if (trimmedLine.includes('Width') && trimmedLine.includes(':')) {
                        const widthMatch = trimmedLine.match(/Width\s*:\s*([^\s]+)/i);
                        if (widthMatch) {
                            mediaData.width = widthMatch[1];
                        }
                    }

                    if (trimmedLine.includes('Height') && trimmedLine.includes(':')) {
                        const heightMatch = trimmedLine.match(/Height\s*:\s*([^\s]+)/i);
                        if (heightMatch) {
                            mediaData.height = heightMatch[1];
                        }
                    }

                    if (trimmedLine.includes('Codec') && trimmedLine.includes(':')) {
                        const codecMatch = trimmedLine.match(/Codec\s*:\s*([^\s]+)/i);
                        if (codecMatch) {
                            mediaData.codec = codecMatch[1];
                        }
                    }
                }

                if (mediaData.width && mediaData.height) {
                    mediaData.resolution = `${mediaData.width}x${mediaData.height}`;
                }
            }

        } catch (parseError) {
            console.warn('LibFlow: Failed to parse MediaInfo result:', parseError);
        }

        return mediaData;
    }

    async function handleFormSubmit(event, elements) {
        const { form, fileInput, uploadWidget, destinationField, progressBar, progressContainer, submitButton, validationTextElement, folderId, isUploadRequired, allowMultiple } = elements;
        const files = Array.from(fileInput.files);

        if (form.dataset.libflowProcessed === 'true') {
            console.log('LibFlow: Form already processed, allowing normal submission');
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        hideValidationError(validationTextElement);

        if (files.length === 0) {
            console.warn('LibFlow: No files selected');
            if (isUploadRequired) {
                console.log('LibFlow: Upload is required but no files selected, preventing submission');
                return;
            } else {
                console.log('LibFlow: Upload is not required, submitting form normally');
                submitFormNormally(form, elements);
                return;
            }
        }

        if (destinationField.value.trim()) {
            submitFormNormally(form, elements);
            return;
        }

        try {
            if (progressContainer) {
                progressContainer.style.display = 'block';
            }
            setWidgetUploadingState(uploadWidget, true, allowMultiple ? 'Analyzing files...' : 'Analyzing file...');

            setSubmitButtonState(submitButton, true, allowMultiple ? 'Analyzing files...' : 'Analyzing file...');

            updateProgress(progressBar, 0);

            console.log(`LibFlow: Analyzing ${files.length} file(s)...`);
            const fileAnalyses = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                console.log(`LibFlow: Analyzing file ${i + 1}/${files.length}: ${file.name}`);
                setWidgetUploadingState(uploadWidget, true, `Analyzing file ${i + 1}/${files.length}...`);
                setSubmitButtonState(submitButton, true, `Analyzing file ${i + 1}/${files.length}...`);

                const mediaData = await analyzeFileWithMediaInfo(file);
                fileAnalyses.push({ file, mediaData });

                const analysisProgress = Math.round(((i + 1) / files.length) * 20);
                updateProgress(progressBar, analysisProgress);
            }

            console.log('LibFlow: Starting uploads...');
            const uploadedUrls = [];

            for (let i = 0; i < fileAnalyses.length; i++) {
                const { file, mediaData } = fileAnalyses[i];

                console.log(`LibFlow: Uploading file ${i + 1}/${files.length}: ${file.name}`);
                setSubmitButtonState(submitButton, true, `Uploading file ${i + 1}/${files.length}...`);
                setWidgetUploadingState(uploadWidget, true, `Uploading file ${i + 1}/${files.length}...`);

                const presignedData = await getPresignedUrl(file, mediaData, folderId);

                const baseProgress = 20 + Math.round((i / files.length) * 60);
                updateProgress(progressBar, baseProgress);

                const fileUrl = await uploadFileToStorage(file, presignedData, progressBar, {
                    currentFileIndex: i,
                    totalFiles: files.length,
                    baseProgress: baseProgress
                });

                uploadedUrls.push(fileUrl);
                console.log(`LibFlow: File ${i + 1}/${files.length} uploaded successfully: ${fileUrl}`);
            }

            if (allowMultiple) {
                destinationField.value = JSON.stringify(uploadedUrls);
            } else {
                destinationField.value = uploadedUrls[0];
            }

            console.log(`LibFlow: All ${files.length} file(s) uploaded successfully`);
            updateProgress(progressBar, 100);

            submitFormNormally(form, elements);

        } catch (error) {
            console.log("This is error type " + error.errorType);

            console.error('LibFlow: Upload failed:', error);

            setWidgetUploadingState(uploadWidget, false);
            if (progressContainer) {
                progressContainer.style.display = 'none';
            }

            if (error.isValidationError && error.errorTypes) {
                showValidationError(form, validationTextElement, error.errorTypes);
            } else if (error.isValidationError && error.errorType) {
                showValidationError(form, validationTextElement, [error.errorType]);
            } else {
                alert('File upload failed. Please try again.');
            }

            setSubmitButtonState(submitButton, false, 'Submit');
            updateProgress(progressBar, 0);

            if (isUploadRequired) {
                console.log('LibFlow: Upload is required but failed, preventing form submission');
                return;
            } else {
                console.log('LibFlow: Upload failed but not required, submitting form anyway');
                submitFormNormally(form, elements);
            }
        }
    }

    async function getPresignedUrl(file, mediaData, folderId) {
        const requestPayload = {
            filename: file.name,
            content_type: file.type,
            file_size: file.size,
            media_info: {
                analyzed_size: mediaData.size,
                duration: mediaData.duration,
                format: mediaData.format,
                bitrate: mediaData.bitrate,
                resolution: mediaData.resolution,
                codec: mediaData.codec,
                width: mediaData.width,
                height: mediaData.height
            }
        };

        if (folderId) {
            requestPayload.folder_id = folderId;
            console.log('LibFlow: Including folder ID in request:', folderId);
        }

        if (mediaData.mediaInfo && mediaData.mediaInfo.length < 10000) {
            requestPayload.media_info.full_analysis = mediaData.mediaInfo;
        }

        console.log('LibFlow: Sending request with media info and folder ID:', requestPayload);

        const response = await fetch(`${LIBFLOW_API_BASE}/presigned-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestPayload)
        });

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (parseError) {
                const errorText = await response.text();
                throw new Error(`Failed to get presigned URL: ${response.status} ${response.statusText}. ${errorText}`);
            }

            if (response.status === 422 && errorData.error === 'FILE_REJECTED' && errorData.reasons) {
                console.log('LibFlow: Validation error received:', errorData);

                const validationError = new Error(`File validation failed: ${errorData.reasons.join(', ')}`);
                validationError.isValidationError = true;
                validationError.errorTypes = errorData.reasons;
                throw validationError;
            }

            throw new Error(`Failed to get presigned URL: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();

        if (!data.presigned_url || !data.file_url) {
            throw new Error('Invalid response from LibFlow API');
        }

        return data;
    }

    function uploadFileToStorage(file, presignedData, progressBar, options = {}) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const { currentFileIndex = 0, totalFiles = 1, baseProgress = 40 } = options;

            xhr.upload.addEventListener('progress', function(e) {
                if (e.lengthComputable) {
                    const fileUploadPercent = (e.loaded / e.total) * 100;

                    let totalPercent;
                    if (totalFiles > 1) {
                        const progressPerFile = 60 / totalFiles;
                        const thisFileProgress = (fileUploadPercent / 100) * progressPerFile;
                        totalPercent = baseProgress + thisFileProgress;
                    } else {
                        const uploadPercent = Math.round(fileUploadPercent * 0.6);
                        totalPercent = 40 + uploadPercent;
                    }

                    updateProgress(progressBar, Math.min(totalPercent, 100));
                }
            });

            xhr.addEventListener('load', function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    if (currentFileIndex === totalFiles - 1) {
                        updateProgress(progressBar, 100);
                    }
                    resolve(presignedData.file_url);
                } else {
                    reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
                }
            });

            xhr.addEventListener('error', function() {
                reject(new Error('Upload failed: Network error'));
            });

            xhr.addEventListener('abort', function() {
                reject(new Error('Upload aborted'));
            });

            xhr.open('PUT', presignedData.presigned_url);

            if (file.type) {
                xhr.setRequestHeader('Content-Type', file.type);
            }

            xhr.send(file);
        });
    }

    function updateProgress(progressBar, percentage) {
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
    }

    function setSubmitButtonState(button, isLoading, text) {
        if (!button) return;

        button.disabled = isLoading;

        if (text) {
            const originalText = button.dataset.originalText || (button.tagName === 'INPUT' ? button.value : button.textContent);

            if (!button.dataset.originalText) {
                button.dataset.originalText = originalText;
            }

            if (button.tagName === 'INPUT') {
                button.value = isLoading ? text : button.dataset.originalText;
            } else {
                button.textContent = isLoading ? text : button.dataset.originalText;
            }
        }
    }

    function submitFormNormally(form, elements) {
        const { submitButton, uploadWidget, progressContainer } = elements;

        form.dataset.libflowProcessed = 'true';

        setWidgetUploadingState(uploadWidget, false);
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }

        setSubmitButtonState(submitButton, false);

        setTimeout(() => {
            try {
                if (submitButton && typeof submitButton.click === 'function') {
                    console.log('LibFlow: Triggering submit button click');
                    submitButton.click();
                    return;
                }

                if (typeof form.requestSubmit === 'function') {
                    console.log('LibFlow: Using requestSubmit()');
                    form.requestSubmit();
                    return;
                }

                const formData = new FormData(form);
                const action = form.action || window.location.href;
                const method = (form.method || 'POST').toUpperCase();

                console.log('LibFlow: Submitting via fetch');

                if (method === 'GET') {
                    const url = new URL(action, window.location.origin);
                    for (const [key, value] of formData.entries()) {
                        url.searchParams.append(key, value);
                    }
                    window.location.href = url.toString();
                } else {
                    fetch(action, {
                        method: method,
                        body: formData
                    }).then(response => {
                        if (response.redirected) {
                            window.location.href = response.url;
                        } else {
                            return response.text();
                        }
                    }).then(html => {
                        if (html) {
                            document.open();
                            document.write(html);
                            document.close();
                        }
                    }).catch(error => {
                        console.error('LibFlow: Form submission failed:', error);
                        HTMLFormElement.prototype.submit.call(form);
                    });
                }

            } catch (error) {
                console.error('LibFlow: All submission methods failed:', error);
                try {
                    HTMLFormElement.prototype.submit.call(form);
                } catch (finalError) {
                    console.error('LibFlow: Even native submit failed:', finalError);
                    alert('Form submission failed. Please try submitting manually.');
                }
            }
        }, 100);
    }

    window.LibFlow = {
        isInitialized: true,
        version: '1.4.0',
        mediaInfoAvailable: () => !!mediaInfoInstance,

        reinitialize: function() {
            initializeLibFlowUpload();
        },

        setApiBase: function(url) {
            LIBFLOW_API_BASE = url.replace(/\/$/, '');
        },

        analyzeFile: async function(file) {
            return await analyzeFileWithMediaInfo(file);
        },

        getMultipleFileStatus: function(form) {
            return form.getAttribute('data-ft-lib-multiple-files') === 'true';
        }
    };

})();
