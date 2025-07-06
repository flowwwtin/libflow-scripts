document.addEventListener('DOMContentLoaded', function() {
    const downloadElements = document.querySelectorAll('[data-ft-lib-download]');
    
    downloadElements.forEach(element => {
        element.addEventListener('click', function(e) {
            e.preventDefault();
            
            const downloadUrl = this.getAttribute('data-ft-lib-download-url');
            const downloadName = this.getAttribute('data-ft-lib-download-name');
            
            if (downloadUrl) {
                fetch(downloadUrl)
                    .then(response => response.blob())
                    .then(blob => {
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = downloadName || '';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                        
                        const event = new CustomEvent('libflow-file-downloaded', {
                            detail: {
                                url: downloadUrl,
                                filename: downloadName || '',
                                element: this,
                                timestamp: new Date().toISOString(),
                                originalEvent: e
                            }
                        });
                        document.dispatchEvent(event);
                    })
                    .catch(error => {
                        console.error('Download failed:', error);
                        const link = document.createElement('a');
                        link.href = downloadUrl;
                        link.download = downloadName || '';
                        link.target = '_blank';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    });
            }
        });
    });
});