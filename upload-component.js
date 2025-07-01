
(function() {
    'use strict';

    let LIBFLOW_API_BASE = 'https://libflow.flowwwtin.com/api';

    let mediaInfoInstance = null;

    document.addEventListener('DOMContentLoaded', function() {
        initializeMediaInfo().then(() => {
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
        const uploadForms = document.querySelectorAll('[data-ft-libflow-upload-form]');

        uploadForms.forEach(form => {
            const fileInput = form.querySelector('input[type="file"]');
            const uploadWidget = form.querySelector('[data-ft-upload-widget]');
            const destinationField = form.querySelector('[data-ft-libflow-destination]');
            const progressBar = form.querySelector('.ft-progress-bar');
            const progressContainer = form.querySelector('.ft-progress');
            const submitButton = form.querySelector('input[type="submit"], button[type="submit"]');
            const validationTextElement = form.querySelector('[data-ft-validation-text]');

            const folderId = form.getAttribute('data-ft-folder-id');

            const isUploadRequired = form.getAttribute('data-ft-libflow-required') === 'true';

            const allowMultiple = form.getAttribute('data-ft-multiple-files') === 'true';

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

        const uploadContent = uploadWidget.querySelector('.ft-upload-content');
        const fileInfo = uploadWidget.querySelector('.ft-upload-file-info');
        const uploadStatus = uploadWidget.querySelector('.ft-upload-status');
        const fileName = uploadWidget.querySelector('.ft-file-name');
        const fileSize = uploadWidget.querySelector('.ft-file-size');
        const removeButton = uploadWidget.querySelector('.ft-remove-file');

        let multipleFilesContainer = uploadWidget.querySelector('.ft-multiple-files');
        if (allowMultiple && !multipleFilesContainer) {
            multipleFilesContainer = document.createElement('div');
            multipleFilesContainer.className = 'ft-multiple-files';
            multipleFilesContainer.style.display = 'none';
            uploadWidget.appendChild(multipleFilesContainer);
        }

        uploadWidget.addEventListener('click', function(e) {
            if (!uploadWidget.classList.contains('ft-uploading') &&
                !e.target.closest('.ft-remove-file') &&
                !e.target.closest('.ft-file-item-remove')) {
                fileInput.click();
            }
        });

        uploadWidget.addEventListener('dragover', function(e) {
            e.preventDefault();
            uploadWidget.classList.add('ft-dragover');
        });

        uploadWidget.addEventListener('dragleave', function(e) {
            e.preventDefault();
            if (!uploadWidget.contains(e.relatedTarget)) {
                uploadWidget.classList.remove('ft-dragover');
            }
        });

        uploadWidget.addEventListener('drop', function(e) {
            e.preventDefault();
            uploadWidget.classList.remove('ft-dragover');

            if (uploadWidget.classList.contains('ft-uploading')) return;

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const dt = new DataTransfer();

                if (allowMultiple) {
                    for (let i = 0; i < files.length; i++) {
                        dt.items.add(files[i]);
                    }
                } else {
                    dt.items.add(files[0]);
                }

                fileInput.files = dt.files;

                const changeEvent = new Event('change', { bubbles: true });
                fileInput.dispatchEvent(changeEvent);
            }
        });

        fileInput.addEventListener('change', function() {
            const files = Array.from(fileInput.files);

            if (progressContainer) {
                progressContainer.style.display = 'none';
            }
            elements.destinationField.value = '';
            hideValidationError(validationTextElement);

            if (files.length > 0) {
                if (allowMultiple) {
                    updateWidgetWithMultipleFiles(uploadWidget, files, {
                        uploadContent,
                        fileInfo,
                        uploadStatus,
                        fileName,
                        fileSize,
                        removeButton,
                        multipleFilesContainer
                    });
                } else {
                    updateWidgetWithFile(uploadWidget, files[0], {
                        uploadContent,
                        fileInfo,
                        uploadStatus,
                        fileName,
                        fileSize,
                        removeButton
                    });
                }
            } else {
                resetWidget(uploadWidget, uploadContent, fileInfo, uploadStatus, multipleFilesContainer);
            }
        });

        if (removeButton) {
            removeButton.addEventListener('click', function(e) {
                e.stopPropagation();

                fileInput.value = '';
                elements.destinationField.value = '';

                resetWidget(uploadWidget, uploadContent, fileInfo, uploadStatus, multipleFilesContainer);

                hideValidationError(validationTextElement);
            });
        }
    }

    function updateWidgetWithFile(widget, file, elements) {
        const { uploadContent, fileInfo, uploadStatus, fileName, fileSize } = elements;

        widget.classList.add('ft-has-file');
        widget.classList.remove('ft-dragover', 'ft-uploading', 'ft-has-multiple-files');

        if (uploadContent) uploadContent.style.display = 'none';
        if (fileInfo) fileInfo.style.display = 'flex';
        if (uploadStatus) uploadStatus.style.display = 'none';

        if (fileName) fileName.textContent = file.name;
        if (fileSize) fileSize.textContent = formatFileSize(file.size);
    }

    function updateWidgetWithMultipleFiles(widget, files, elements) {
        const { uploadContent, fileInfo, uploadStatus, multipleFilesContainer } = elements;

        widget.classList.add('ft-has-multiple-files');
        widget.classList.remove('ft-dragover', 'ft-uploading', 'ft-has-file');

        if (uploadContent) uploadContent.style.display = 'none';
        if (fileInfo) fileInfo.style.display = 'none';
        if (uploadStatus) uploadStatus.style.display = 'none';
        if (multipleFilesContainer) {
            multipleFilesContainer.style.display = 'block';
            updateMultipleFilesDisplay(multipleFilesContainer, files, widget);
        }
    }

    function updateMultipleFilesDisplay(container, files, widget) {
        container.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'ft-multiple-files-header';
        header.innerHTML = `<strong>${files.length} file${files.length !== 1 ? 's' : ''} selected</strong>`;
        container.appendChild(header);

        const fileList = document.createElement('div');
        fileList.className = 'ft-multiple-files-list';

        files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'ft-file-item';
            fileItem.innerHTML = `
                <div class="ft-file-item-info">
                    <div class="ft-file-item-name">${file.name}</div>
                    <div class="ft-file-item-size">${formatFileSize(file.size)}</div>
                </div>
                <button type="button" class="ft-file-item-remove" data-file-index="${index}">×</button>
            `;

            const removeBtn = fileItem.querySelector('.ft-file-item-remove');
            removeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                removeFileFromSelection(widget, index);
            });

            fileList.appendChild(fileItem);
        });

        container.appendChild(fileList);

        const clearAllBtn = document.createElement('button');
        clearAllBtn.type = 'button';
        clearAllBtn.className = 'ft-clear-all-files';
        clearAllBtn.textContent = 'Clear All';
        clearAllBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            clearAllFiles(widget);
        });

        container.appendChild(clearAllBtn);
    }

    function removeFileFromSelection(widget, indexToRemove) {
        const fileInput = widget.closest('form').querySelector('input[type="file"]');
        const files = Array.from(fileInput.files);

        files.splice(indexToRemove, 1);

        const dt = new DataTransfer();
        files.forEach(file => dt.items.add(file));
        fileInput.files = dt.files;

        const changeEvent = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(changeEvent);
    }

    function clearAllFiles(widget) {
        const fileInput = widget.closest('form').querySelector('input[type="file"]');
        const destinationField = widget.closest('form').querySelector('[data-ft-libflow-destination]');

        fileInput.value = '';
        destinationField.value = '';

        const uploadContent = widget.querySelector('.ft-upload-content');
        const fileInfo = widget.querySelector('.ft-upload-file-info');
        const uploadStatus = widget.querySelector('.ft-upload-status');
        const multipleFilesContainer = widget.querySelector('.ft-multiple-files');

        resetWidget(widget, uploadContent, fileInfo, uploadStatus, multipleFilesContainer);
    }

    function resetWidget(widget, uploadContent, fileInfo, uploadStatus, multipleFilesContainer) {
        widget.classList.remove('ft-has-file', 'ft-has-multiple-files', 'ft-uploading', 'ft-dragover');

        if (uploadContent) uploadContent.style.display = 'flex';
        if (fileInfo) fileInfo.style.display = 'none';
        if (uploadStatus) uploadStatus.style.display = 'none';
        if (multipleFilesContainer) multipleFilesContainer.style.display = 'none';
    }

    function setWidgetUploadingState(widget, isUploading, statusText) {
        const uploadContent = widget.querySelector('.ft-upload-content');
        const fileInfo = widget.querySelector('.ft-upload-file-info');
        const uploadStatus = widget.querySelector('.ft-upload-status');
        const multipleFilesContainer = widget.querySelector('.ft-multiple-files');
        const statusMainText = widget.querySelector('.ft-upload-status-main');

        if (isUploading) {
            widget.classList.add('ft-uploading');

            if (uploadContent) uploadContent.style.display = 'none';
            if (fileInfo) fileInfo.style.display = 'none';
            if (uploadStatus) uploadStatus.style.display = 'flex';
            if (multipleFilesContainer) multipleFilesContainer.style.display = 'none';

            if (statusMainText && statusText) {
                statusMainText.textContent = statusText;
            }
        } else {
            widget.classList.remove('ft-uploading');

            if (uploadStatus) uploadStatus.style.display = 'none';

            const hasFile = widget.classList.contains('ft-has-file');
            const hasMultipleFiles = widget.classList.contains('ft-has-multiple-files');

            if (hasMultipleFiles) {
                if (multipleFilesContainer) multipleFilesContainer.style.display = 'block';
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
            const errorMessage = form.getAttribute(`data-ft-validation-${errorType.toLowerCase().replace('_', '-')}`);
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
            return form.getAttribute('data-ft-multiple-files') === 'true';
        }
    };

})();
