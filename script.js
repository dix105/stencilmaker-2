document.addEventListener('DOMContentLoaded', () => {
    
    // ==============================================
    // 1. MOBILE MENU TOGGLE
    // ==============================================
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('header nav');
    
    if (menuToggle && nav) {
        menuToggle.addEventListener('click', () => {
            nav.classList.toggle('active');
            // Change icon
            const icon = menuToggle.querySelector('i');
            if (icon) {
                if (nav.classList.contains('active')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });

        // Close menu when clicking a link
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('active');
                const icon = menuToggle.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
        });
    }

    // ==============================================
    // 2. SCROLL REVEAL ANIMATIONS
    // ==============================================
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // ==============================================
    // 3. FAQ ACCORDION
    // ==============================================
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const answer = question.nextElementSibling;
            
            // Toggle active state
            question.classList.toggle('active');
            
            if (question.classList.contains('active')) {
                answer.style.maxHeight = answer.scrollHeight + "px";
            } else {
                answer.style.maxHeight = null;
            }
            
            // Close others (optional)
            faqQuestions.forEach(otherQ => {
                if (otherQ !== question && otherQ.classList.contains('active')) {
                    otherQ.classList.remove('active');
                    otherQ.nextElementSibling.style.maxHeight = null;
                }
            });
        });
    });

    // ==============================================
    // 4. MODALS (PRIVACY & TERMS)
    // ==============================================
    const modalTriggers = document.querySelectorAll('[data-modal-target]');
    const modalClosers = document.querySelectorAll('[data-modal-close]');
    
    modalTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const modalId = trigger.getAttribute('data-modal-target');
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('hidden');
                // Small delay to allow display:block to apply before opacity transition
                setTimeout(() => {
                    modal.classList.add('visible');
                }, 10);
            }
        });
    });

    modalClosers.forEach(closer => {
        closer.addEventListener('click', () => {
            const modalId = closer.getAttribute('data-modal-close');
            closeModal(modalId);
        });
    });

    // Close on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id);
        }
    });

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('visible');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300); // Match CSS transition duration
        }
    }

    // ==============================================
    // 5. PLAYGROUND LOGIC (STENCIL MAKER) - REAL API WIRED
    // ==============================================
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const previewImage = document.getElementById('preview-image');
    const uploadContent = document.querySelector('.upload-content');
    const generateBtn = document.getElementById('generate-btn');
    const resetBtn = document.getElementById('reset-btn');
    const resultContainer = document.getElementById('result-container');
    const resultPlaceholder = document.querySelector('.result-placeholder');
    const loadingState = document.getElementById('loading-state');
    const resultFinal = document.getElementById('result-final');
    const downloadBtn = document.getElementById('download-btn');
    
    // Fix: JS_ID_MISMATCH - Create status element if it doesn't exist
    let statusText = document.getElementById('status-text') || document.querySelector('.status-text');
    if (!statusText && generateBtn) {
        statusText = document.createElement('p');
        statusText.id = 'status-text';
        statusText.className = 'status-text text-center mt-3 text-sm font-medium opacity-90';
        // Append after the generate button
        if (generateBtn.parentNode) {
            generateBtn.parentNode.insertBefore(statusText, generateBtn.nextSibling);
        }
    }

    // Global State
    let currentUploadedUrl = null;
    const USER_ID = 'DObRu1vyStbUynoQmTcHBlhs55z2';
    const POLL_INTERVAL = 2000;
    const MAX_POLLS = 60;

    // ------------------------------------------------
    // API & HELPER FUNCTIONS
    // ------------------------------------------------

    // Generate nanoid for unique filename
    function generateNanoId(length = 21) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Upload file to CDN storage (called immediately when file is selected)
    async function uploadFile(file) {
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const uniqueId = generateNanoId();
        // Filename is just nanoid.extension (no media/ prefix)
        const fileName = uniqueId + '.' + fileExtension;
        
        // Step 1: Get signed URL from API
        const signedUrlResponse = await fetch(
            'https://api.chromastudio.ai/get-emd-upload-url?fileName=' + encodeURIComponent(fileName),
            { method: 'GET' }
        );
        
        if (!signedUrlResponse.ok) {
            throw new Error('Failed to get signed URL: ' + signedUrlResponse.statusText);
        }
        
        const signedUrl = await signedUrlResponse.text();
        
        // Step 2: PUT file to signed URL
        const uploadResponse = await fetch(signedUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type
            }
        });
        
        if (!uploadResponse.ok) {
            throw new Error('Failed to upload file: ' + uploadResponse.statusText);
        }
        
        // Step 3: Return download URL
        const downloadUrl = 'https://contents.maxstudio.ai/' + fileName;
        return downloadUrl;
    }

    // Submit generation job (Image)
    async function submitImageGenJob(imageUrl) {
        const endpoint = 'https://api.chromastudio.ai/image-gen';
        
        const headers = {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json',
            'sec-ch-ua-platform': '"Windows"',
            'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
            'sec-ch-ua-mobile': '?0'
        };

        const body = {
            model: 'image-effects',
            toolType: 'image-effects',
            effectId: 'stencilMaker',
            imageUrl: imageUrl,
            userId: USER_ID,
            removeWatermark: true,
            isPrivate: true
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            throw new Error('Failed to submit job: ' + response.statusText);
        }
        
        const data = await response.json();
        return data;
    }

    // Poll job status until completed or failed
    async function pollJobStatus(jobId) {
        const baseUrl = 'https://api.chromastudio.ai/image-gen';
        let polls = 0;
        
        while (polls < MAX_POLLS) {
            const response = await fetch(
                `${baseUrl}/${USER_ID}/${jobId}/status`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json, text/plain, */*'
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to check status: ' + response.statusText);
            }
            
            const data = await response.json();
            
            if (data.status === 'completed') {
                return data;
            }
            
            if (data.status === 'failed' || data.status === 'error') {
                throw new Error(data.error || 'Job processing failed');
            }
            
            // Update UI with progress
            updateStatus('PROCESSING... (' + (polls + 1) + ')');
            
            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
            polls++;
        }
        
        throw new Error('Job timed out after ' + MAX_POLLS + ' polls');
    }

    // ------------------------------------------------
    // UI HELPERS
    // ------------------------------------------------

    function showLoading() {
        if (resultPlaceholder) resultPlaceholder.classList.add('hidden');
        if (resultFinal) resultFinal.classList.add('hidden');
        if (loadingState) {
            loadingState.classList.remove('hidden');
            loadingState.style.display = 'flex';
        }
        if (resultContainer) resultContainer.classList.add('loading');
    }

    function hideLoading() {
        if (loadingState) {
            loadingState.classList.add('hidden');
            loadingState.style.display = 'none';
        }
        if (resultContainer) resultContainer.classList.remove('loading');
    }

    function updateStatus(text) {
        if (statusText) statusText.textContent = text;
        
        if (generateBtn) {
            if (text.includes('PROCESSING') || text.includes('UPLOADING') || text.includes('SUBMITTING') || text.includes('QUEUED')) {
                generateBtn.disabled = true;
                generateBtn.textContent = text;
            } else if (text === 'READY') {
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate Stencil';
            } else if (text === 'COMPLETE') {
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate Again';
            }
        }
    }

    function showError(msg) {
        alert('Error: ' + msg);
    }

    function showResultMedia(url) {
        if (!resultFinal) return;

        // Clean up any existing video element
        const oldVideo = document.getElementById('result-video');
        if (oldVideo) oldVideo.style.display = 'none';

        const isVideo = url.toLowerCase().match(/\.(mp4|webm)(\?.*)?$/i);
        
        if (isVideo) {
            resultFinal.style.display = 'none';
            
            let video = document.getElementById('result-video');
            if (!video) {
                video = document.createElement('video');
                video.id = 'result-video';
                video.controls = true;
                video.autoplay = true;
                video.loop = true;
                video.className = resultFinal.className;
                resultFinal.parentElement.appendChild(video);
            }
            video.src = url;
            video.style.display = 'block';
        } else {
            // Display Image - cache bust to ensure reload
            resultFinal.src = url + '?t=' + new Date().getTime();
            resultFinal.classList.remove('hidden');
            resultFinal.style.display = 'block';
        }
        
        if (resultPlaceholder) resultPlaceholder.classList.add('hidden');
    }

    function resetResultArea() {
        if (resultFinal) resultFinal.classList.add('hidden');
        const video = document.getElementById('result-video');
        if (video) video.style.display = 'none';
        
        if (resultPlaceholder) resultPlaceholder.classList.remove('hidden');
        
        if (downloadBtn) {
            downloadBtn.disabled = true;
            delete downloadBtn.dataset.url;
            downloadBtn.removeAttribute('href');
            downloadBtn.removeAttribute('download');
        }
        
        if (statusText) statusText.textContent = '';
    }

    // ------------------------------------------------
    // EVENT HANDLERS (LOGIC)
    // ------------------------------------------------

    // Handler when file is selected - uploads immediately
    async function handleFileSelect(file) {
        try {
            if (!file.type.startsWith('image/')) {
                alert('Please upload an image file.');
                return;
            }

            // Show local preview first (UX)
            const reader = new FileReader();
            reader.onload = (e) => {
                if (previewImage) {
                    previewImage.src = e.target.result;
                    previewImage.classList.remove('hidden');
                }
                if (uploadContent) uploadContent.classList.add('hidden');
            };
            reader.readAsDataURL(file);
            
            // Enable reset
            if (resetBtn) resetBtn.disabled = false;
            
            // Start Upload
            // We use status text to indicate uploading but don't block the UI completely with full loader
            // effectively replacing "Generate" button text with "UPLOADING..."
            updateStatus('UPLOADING...');
            
            // Upload immediately
            const uploadedUrl = await uploadFile(file);
            currentUploadedUrl = uploadedUrl;
            
            updateStatus('READY');
            
            // Reset result area if a previous result exists
            resetResultArea();
            
        } catch (error) {
            updateStatus('ERROR');
            showError(error.message);
            
            // Reset file input on critical upload failure
            if (fileInput) fileInput.value = '';
            if (uploadContent) uploadContent.classList.remove('hidden');
            if (previewImage) previewImage.classList.add('hidden');
        }
    }

    // Handler when Generate button is clicked
    async function handleGenerate() {
        if (!currentUploadedUrl) {
            alert('Please select and upload a file first.');
            return;
        }
        
        try {
            showLoading();
            updateStatus('SUBMITTING JOB...');
            
            // Step 1: Submit job
            const jobData = await submitImageGenJob(currentUploadedUrl);
            updateStatus('JOB QUEUED...');
            
            // Step 2: Poll for completion
            const result = await pollJobStatus(jobData.jobId);
            
            // Step 3: Get result URL
            const resultItem = Array.isArray(result.result) ? result.result[0] : result.result;
            const resultUrl = resultItem?.mediaUrl || resultItem?.video || resultItem?.image;
            
            if (!resultUrl) {
                throw new Error('No image URL in response');
            }
            
            // Step 4: Display result
            showResultMedia(resultUrl);
            
            updateStatus('COMPLETE');
            hideLoading();
            
            // Setup Download Button
            if (downloadBtn) {
                downloadBtn.dataset.url = resultUrl;
                downloadBtn.disabled = false;
            }
            
        } catch (error) {
            hideLoading();
            updateStatus('ERROR');
            showError(error.message);
        }
    }

    // ------------------------------------------------
    // WIRING (LISTENERS)
    // ------------------------------------------------

    // 1. File Input Change
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleFileSelect(file);
        });
    }

    // 2. Upload Zone Drag & Drop
    if (uploadZone) {
        uploadZone.addEventListener('click', () => {
            if (fileInput) fileInput.click();
        });
        
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.style.borderColor = 'var(--primary)';
            uploadZone.style.background = 'rgba(102, 126, 234, 0.1)';
        });

        uploadZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadZone.style.borderColor = '';
            uploadZone.style.background = '';
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.style.borderColor = '';
            uploadZone.style.background = '';
            
            const file = e.dataTransfer.files[0];
            if (file) handleFileSelect(file);
        });
    }

    // 3. Generate Button
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerate);
    }

    // 4. Reset Button
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            // Reset Global State
            currentUploadedUrl = null;
            
            // Reset Inputs
            if (fileInput) fileInput.value = '';
            
            // Reset UI Areas
            if (previewImage) {
                previewImage.src = '';
                previewImage.classList.add('hidden');
            }
            if (uploadContent) uploadContent.classList.remove('hidden');
            
            resetResultArea();
            
            // Reset Buttons
            if (generateBtn) {
                generateBtn.disabled = true;
                generateBtn.textContent = 'Generate Stencil';
            }
            if (resetBtn) resetBtn.disabled = true;
        });
    }

    // 5. Download Button (Robust Logic)
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const url = downloadBtn.dataset.url;
            if (!url) return;
            
            const originalText = downloadBtn.innerHTML;
            downloadBtn.textContent = 'Downloading...';
            downloadBtn.disabled = true;
            
            // Helpers
            function downloadBlob(blob, filename) {
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = filename;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
            }
            
            function getExtension(url, contentType) {
                if (contentType) {
                    if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
                    if (contentType.includes('png')) return 'png';
                    if (contentType.includes('webp')) return 'webp';
                }
                const match = url.match(/\.(jpe?g|png|webp)/i);
                return match ? match[1].toLowerCase().replace('jpeg', 'jpg') : 'png';
            }
            
            try {
                // Strategy 1: Chroma Proxy
                const proxyUrl = 'https://api.chromastudio.ai/download-proxy?url=' + encodeURIComponent(url);
                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error('Proxy failed');
                
                const blob = await response.blob();
                const ext = getExtension(url, response.headers.get('content-type'));
                downloadBlob(blob, 'stencil_' + generateNanoId(8) + '.' + ext);
                
            } catch (proxyErr) {
                // Strategy 2: Direct Fetch
                try {
                    const fetchUrl = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
                    const response = await fetch(fetchUrl, { mode: 'cors' });
                    if (response.ok) {
                        const blob = await response.blob();
                        const ext = getExtension(url, response.headers.get('content-type'));
                        downloadBlob(blob, 'stencil_' + generateNanoId(8) + '.' + ext);
                        return;
                    }
                } catch (fetchErr) {
                    // Strategy 3: Direct Link Fallback
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'stencil_' + generateNanoId(8) + '.png';
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            } finally {
                downloadBtn.innerHTML = originalText;
                downloadBtn.disabled = false;
            }
        });
    }
});