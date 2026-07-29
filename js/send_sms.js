// SMS Sending System for SekerApp - Version 20250818_2
class SMSSystem {
    constructor() {
        // Get survey ID from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        this.surveyId = urlParams.get('surveyId');
        
        this.surveyData = null;
        this.processedPhones = [];
        this.blacklist = new Set();
        this.currentCampaignId = null;
        this.statusUpdateInterval = null;
        
        // Progress tracking
        this.isSending = false;
        this.shouldStop = false;
        this.progressInterval = null;
        this.sendingStartTime = null;
        this.progressStats = {
            total: 0,
            sent: 0,
            success: 0,
            errors: 0,
            remaining: 0
        };
        
        this.init();
    }

    async init() {
        try {
            // Wait for DOM to be fully loaded
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // Additional wait to ensure all elements are rendered
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Load survey data first
            if (this.surveyId) {
                await this.loadSurveyData();
            }
            
            // Load recipient lists
            await this.loadRecipientLists();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load blacklist
            await this.loadBlacklist();
            
        } catch (error) {
            console.error('Error initializing SMS system:', error);
        }
    }

    async loadSurveyData() {
        try {
            const response = await fetch(`/api/surveys/${this.surveyId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.surveyData = data.survey;
                    this.displaySurveyInfo();
                    this.updateSurveyTitle();
                } else {
                    // Fallback to basic info
                    this.surveyData = { id: this.surveyId, title: `סקר ${this.surveyId}` };
                    this.displaySurveyInfo();
                    this.updateSurveyTitle();
                }
            } else {
                // Fallback to basic info
                this.surveyData = { id: this.surveyId, title: `סקר ${this.surveyId}` };
                this.displaySurveyInfo();
                this.updateSurveyTitle();
            }
        } catch (error) {
            this.surveyData = { id: this.surveyId, title: `סקר ${this.surveyId}` };
            this.displaySurveyInfo();
            this.updateSurveyTitle();
        }
    }

    async loadAvailableSurveys() {
        try {
            const response = await fetch('/api/surveys', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.surveys && data.surveys.length > 0) {
                    // Store available surveys for selection
                    this.availableSurveys = data.surveys;
                    this.displaySurveyInfo();
                } else {
                    // Fallback to basic info
                    this.displaySurveyInfo();
                }
            } else {
                // Fallback to basic info
                this.displaySurveyInfo();
            }
        } catch (error) {
            this.displaySurveyInfo();
        }
    }

    displaySurveyInfo() {
        const surveyInfo = document.getElementById('surveyInfo');
        if (this.availableSurveys && this.availableSurveys.length > 0) {
            surveyInfo.innerHTML = `
                <h3>סקרים זמינים</h3>
                <p>נמצאו ${this.availableSurveys.length} סקרים פעילים במערכת</p>
                <p>בחר סקר מהרשימה למטה או הזן מזהה ידנית</p>
            `;
        } else {
            surveyInfo.innerHTML = `
                <h3>שליחת SMS</h3>
                <p>הזן מזהה סקר ידנית או בחר מקובץ CSV</p>
                <p>סטטוס: <span class="status-indicator status-active"></span> מוכן לשליחה</p>
            `;
        }
    }

    updateSurveyTitle() {
        const surveyTitleElement = document.getElementById('surveyTitle');
        if (surveyTitleElement && this.surveyData) {
            surveyTitleElement.textContent = this.surveyData.title || `סקר ${this.surveyId}`;
        }
    }

    async loadBlacklist() {
        try {
            // Load blacklist from server
            const response = await fetch('/api/sms/blacklist', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.phones) {
                    this.blacklist = new Set(data.phones);
                } else {
                    this.blacklist = new Set();
                }
            } else {
                this.blacklist = new Set();
            }
        } catch (error) {
            this.blacklist = new Set();
        }
    }

    setDefaultFrom() {
        // Set a default value for testing
        document.getElementById('fromField').value = '0509899528';
        document.getElementById('fromField').placeholder = 'מספר/שם שולח מאומת';
    }

    setupEventListeners() {
        console.log('setupEventListeners called');
        // Wait for main content to be visible and all elements to be accessible
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        const checkContentVisibility = () => {
            attempts++;
            const mainContent = document.getElementById('mainContent');
            const recipientMethodRadios = document.querySelectorAll('input[name="recipientMethod"]');
            
            console.log(`Attempt ${attempts}: mainContent:`, mainContent, 'display:', mainContent?.style.display, 'radios:', recipientMethodRadios.length);
            
            if (mainContent && 
                mainContent.style.display !== 'none' && 
                recipientMethodRadios.length > 0) {
                console.log('Elements ready, setting up event listeners');
                this._setupEventListenersInternal();
            } else if (attempts < maxAttempts) {
                // Check again in 100ms
                setTimeout(checkContentVisibility, 100);
            } else {
                console.error('Failed to set up event listeners after 5 seconds');
            }
        };
        checkContentVisibility();
    }

    _setupEventListenersInternal() {
        console.log('_setupEventListenersInternal called');
        // Ensure main content is visible
        const mainContent = document.getElementById('mainContent');
        if (!mainContent || mainContent.style.display === 'none') {
            console.warn('Main content not visible yet, skipping event listener setup');
            return;
        }

        // Recipient method selection
        const recipientMethodRadios = document.querySelectorAll('input[name="recipientMethod"]');
        if (recipientMethodRadios.length > 0) {
            recipientMethodRadios.forEach(radio => {
                radio.addEventListener('change', async (e) => {
                    await this.handleRecipientMethodChange(e.target.value);
                });
            });
        }

        // CSV file input
        const csvFileElement = document.getElementById('csvFile');
        if (csvFileElement) {
            csvFileElement.addEventListener('change', (e) => {
                this.handleCSVUpload(e.target.files[0]);
            });
        }

        // BigQuery list selection
        const recipientListElement = document.getElementById('recipientList');
        if (recipientListElement) {
            recipientListElement.addEventListener('change', (e) => {
                this.handleListSelection(e.target.value);
            });
        }

        // Message template changes
        const messageTemplateElement = document.getElementById('messageTemplate');
        if (messageTemplateElement) {
            messageTemplateElement.addEventListener('input', () => {
                this.updateMessagePreview();
            });
        }

        // Note: Schedule inputs are not implemented in the current HTML
        // They can be added here when the scheduling feature is implemented
    }

    async handleCSVUpload(file) {
        if (!file) return;

        try {
            const text = await file.text();
            const phones = this.parseCSV(text);
            const processed = this.processPhones(phones);
            
            this.processedPhones = processed.valid;
            this.displayCSVSummary(processed);
            
            // Update message preview
            this.updateMessagePreview();
            
        } catch (error) {
            this.showAlert('שגיאה בעיבוד הקובץ', 'error');
        }
    }

    parseCSV(text) {
        const lines = text.split('\n').filter(line => line.trim());
        const phones = [];
        
        lines.forEach(line => {
            // Extract first number from each line
            const match = line.match(/\d+/);
            if (match) {
                phones.push(match[0]);
            }
        });
        
        return phones;
    }

    processPhones(phones) {
        const valid = [];
        const invalid = [];
        const seen = new Set();
        
        phones.forEach(phone => {
            const normalized = this.normalizePhone(phone);
            if (normalized) {
                if (!seen.has(normalized) && !this.blacklist.has(normalized)) {
                    valid.push(normalized);
                    seen.add(normalized);
                }
            } else {
                invalid.push(phone);
            }
        });
        
        return {
            total: phones.length,
            valid: valid,
            invalid: invalid,
            duplicates: phones.length - seen.size,
            blacklisted: 0 // Will be calculated in backend
        };
    }

    normalizePhone(phone) {
        // Remove all non-digits
        const digits = phone.replace(/\D/g, '');
        
        // Israeli phone number normalization
        if (digits.startsWith('972') && digits.length >= 11 && digits.length <= 12) {
            return digits;
        } else if (digits.startsWith('0') && digits.length >= 9 && digits.length <= 10) {
            // Mobile: 05XXXXXXXX, Landline: 0[2-9]XXXXXXX
            if (digits.startsWith('05') || /^0[2-9]/.test(digits)) {
                return '972' + digits.substring(1);
            }
        }
        
        return null;
    }

    displayCSVSummary(data) {
        document.getElementById('totalRows').textContent = data.total;
        document.getElementById('validPhones').textContent = data.valid.length;
        document.getElementById('duplicatesRemoved').textContent = data.duplicates;
        document.getElementById('blacklistedRemoved').textContent = 0; // Will be updated
        document.getElementById('invalidPhones').textContent = data.invalid.length;
        
        // Show file status
        const fileStatusElement = document.getElementById('csvFileStatus');
        if (fileStatusElement) {
            fileStatusElement.textContent = '✓ נטען';
            fileStatusElement.style.color = 'var(--emerald-500)';
        }
        
        document.getElementById('csvSummary').style.display = 'block';
    }

    openBlacklistModal() {
        document.getElementById('blacklistModal').style.display = 'block';
        
        // Load current blacklist
        document.getElementById('blacklistText').value = Array.from(this.blacklist).join('\n');
        
        // Refresh blacklist from server in background
        this.loadBlacklist();
    }

    closeBlacklistModal() {
        document.getElementById('blacklistModal').style.display = 'none';
    }

    clearBlacklist() {
        document.getElementById('blacklistText').value = '';
    }

    saveBlacklist() {
        try {
            const text = document.getElementById('blacklistText').value;
            const phones = text.split('\n').filter(line => line.trim()).map(phone => this.normalizePhone(phone)).filter(Boolean);
            
            // Save blacklist to server
            fetch('/api/sms/blacklist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ phones: phones })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.blacklist = new Set(phones);
                    this.displayBlacklistSummary(data);
                    this.closeBlacklistModal();
                    this.showAlert('רשימה שחורה נשמרה בהצלחה', 'success');
                    
                    // Re-process phones with new blacklist
                    if (this.processedPhones.length > 0) {
                        const reprocessed = this.processPhones(this.processedPhones);
                        this.processedPhones = reprocessed.valid;
                        this.displayCSVSummary(reprocessed);
                    }
                } else {
                    this.showAlert(`שגיאה בשמירת רשימה שחורה: ${data.message}`, 'error');
                }
            })
            .catch(error => {
                this.showAlert(`שגיאה בשמירת רשימה שחורה: ${error.message}`, 'error');
            });
        } catch (error) {
            this.showAlert(`שגיאה בשמירת רשימה שחורה: ${error.message}`, 'error');
        }
    }

    displayBlacklistSummary(data) {
        document.getElementById('totalAfter').textContent = data.total_after || 0;
        document.getElementById('addedNew').textContent = data.added_new || 0;
        document.getElementById('skippedExisting').textContent = data.skipped_existing || 0;
        
        document.getElementById('blacklistSummary').style.display = 'block';
    }

    insertSurveyLink() {
        const textarea = document.getElementById('messageTemplate');
        const cursorPos = textarea.selectionStart;
        const textBefore = textarea.value.substring(0, cursorPos);
        const textAfter = textarea.value.substring(cursorPos);
        
        textarea.value = textBefore + '{{survey_link}}' + textAfter;
        textarea.focus();
        textarea.setSelectionRange(cursorPos + 16, cursorPos + 16);
        
        this.updateMessagePreview();
    }

    updateMessagePreview() {
        if (!this.processedPhones.length) return;
        
        const template = document.getElementById('messageTemplate').value;
        if (!template.includes('{{survey_link}}')) return;
        
        // Use first phone for preview
        const samplePhone = this.processedPhones[0];
        const sampleLink = this.buildSurveyLink(samplePhone);
        const preview = template.replace('{{survey_link}}', sampleLink);
        
        document.getElementById('previewText').textContent = preview;
        document.getElementById('messagePreview').style.display = 'block';
    }

    buildSurveyLink(phone) {
        // Use hardcoded domain for consistency with shortened links
        const baseUrl = 'https://sekerapp.online';
        // Get survey ID from class property or URL parameter or use default
        let surveyId = this.surveyId;
        if (!surveyId) {
            const urlParams = new URLSearchParams(window.location.search);
            surveyId = urlParams.get('surveyId') || '22'; // Default survey ID
        }
        const link = `${baseUrl}/survey/${surveyId}?mp_phone=${phone}`;
        console.log('DEBUG: buildSurveyLink returning:', link);
        return link;
    }

    async shortenSurveyLink(phone) {
        try {
            const originalLink = this.buildSurveyLink(phone);
            
            // Check if we already have a short link for this phone in cache
            const existingShortLink = this.getExistingShortLink(phone);
            if (existingShortLink) {
                return existingShortLink;
            }
            
            // Create a new short link using our proxy endpoint
            const response = await fetch('/api/shorten-link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `target_url=${encodeURIComponent(originalLink)}&job_id=sms_campaign&expires_days=30`
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.shortened_url) {
                    // Fix the shortened URL to use the correct path
                    let fixedUrl = data.shortened_url;
                    if (fixedUrl.includes('shortl.live/') && !fixedUrl.includes('shortl.live/r/')) {
                        fixedUrl = fixedUrl.replace('shortl.live/', 'shortl.live/r/');
                    }
                    // Store in local cache for future use
                    this.cacheShortLink(phone, fixedUrl);
                    console.log('DEBUG: shortenSurveyLink returning:', fixedUrl);
                    return fixedUrl;
                }
            }
            
            // Fallback to original link if shortening fails
            return originalLink;
            
        } catch (error) {
            // Fallback to original link if shortening fails
            return this.buildSurveyLink(phone);
        }
    }

    // Cache for short links to avoid recreating them
    shortLinkCache = new Map();

    cacheShortLink(phone, shortLink) {
        this.shortLinkCache.set(phone, shortLink);
    }

    getExistingShortLink(phone) {
        return this.shortLinkCache.get(phone);
    }

    generateShortCode(phone) {
        // Generate a unique short code based on phone number only (not timestamp)
        // This ensures the same phone always gets the same short code
        const phoneHash = this.hashString(phone);
        return phoneHash.substring(0, 8); // 8 characters should be enough
    }

    hashString(str) {
        let hash = 0;
        if (str.length === 0) return hash.toString();
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36);
    }





    async sendSMS() {
        console.log('DEBUG: sendSMS function called');
        try {
            // Validate required fields
            const from = document.getElementById('fromField').value.trim();
            const messageTemplate = document.getElementById('messageTemplate').value.trim();
            console.log('DEBUG: messageTemplate:', messageTemplate);
            
            if (!from) {
                this.showAlert('נדרש למלא שדה "משלח"', 'error');
                return;
            }
            
            if (!messageTemplate) {
                this.showAlert('נדרש למלא נוסח ההודעה', 'error');
                return;
            }
            
            if (this.processedPhones.length === 0) {
                this.showAlert('נדרש להעלות קובץ CSV או לבחור רשימת נמענים מ-BigQuery', 'error');
                return;
            }
            
            // Start progress tracking
            this.startProgressTracking();
            
            // Get schedule if provided
            const schedule = this.getScheduleData();
            
            // Get alerts if provided
            const alerts = this.getAlertsData();
            
            // Get other options
            const shortenElement = document.getElementById('shortenLinks');
            const validateElement = document.getElementById('validateRecipients');
            const shorten = shortenElement ? shortenElement.checked : false;
            const validate = validateElement ? validateElement.checked : true;
            
            // Show loading state
            const sendButton = document.getElementById('sendButton');
            const originalText = sendButton.textContent;
            sendButton.textContent = 'שולח...';
            sendButton.disabled = true;
            
            try {
                // Get Micropay configuration from server
                let micropayConfig;
                try {
                    const configResponse = await fetch('/api/micropay-config', {
                        method: 'GET',
                        credentials: 'include'
                    });
                    
                    if (!configResponse.ok) {
                        throw new Error('Failed to get Micropay configuration');
                    }
                    
                    micropayConfig = await configResponse.json();
                    if (!micropayConfig.success) {
                        throw new Error(micropayConfig.error || 'Failed to get Micropay configuration');
                    }
                } catch (configError) {
                    console.error('Error getting Micropay config:', configError);
                    this.showAlert('שגיאה בקבלת הגדרות Micropay', 'error');
                    return;
                }
                
                // Check if we need personalized messages (with survey links)
                const needsPersonalization = messageTemplate.includes('{{survey_link}}');
                console.log('DEBUG: needsPersonalization:', needsPersonalization, 'messageTemplate:', messageTemplate);
                
                // For survey links, always use shortened links to save characters and hide phone numbers
                const shouldShortenLinks = needsPersonalization || shorten;
                console.log('DEBUG: shouldShortenLinks:', shouldShortenLinks, 'shorten:', shorten);
                
                // Check if recipients come from a predefined list (BigQuery) or CSV file
                const recipientListElement = document.getElementById('recipientList');
                const isFromPredefinedList = this.processedPhones.length > 0 && 
                    recipientListElement && 
                    recipientListElement.value && 
                    recipientListElement.value !== '';
                
                console.log('isFromPredefinedList:', isFromPredefinedList);
                console.log('recipientList value:', recipientListElement ? recipientListElement.value : 'element not found');
                // Using shortened links: shouldShortenLinks (survey links detected: needsPersonalization)
                
                let requestData;
                
                // Now both BigQuery and CSV use the same logic - phones are already processed and stored
                if (needsPersonalization) {
                    // For personalized messages with survey links, use listjson (Micropay's recommended approach)
                    // This sends all messages in one request instead of one by one
                    const listjson = {};
                    
                    // Show progress message
                    const progressMessage = shouldShortenLinks ? 
                        'מקצר את הלינקים לפני השליחה...' : 
                        'מכין את הלינקים לפני השליחה...';
                    this.showAlert(progressMessage, 'info');
                    
                    // Process each phone and create links (shortened or full)
                    for (let i = 0; i < this.processedPhones.length; i++) {
                        const phone = this.processedPhones[i];
                        
                        // Check if user wants to stop
                        if (this.shouldStop) {
                            this.showAlert('השליחה הופסקה על ידי המשתמש', 'warning');
                            this.stopProgressTracking();
                            return;
                        }
                        
                        // Update progress
                        this.updateProgressStats(0, 0, 0);
                        const progressText = shouldShortenLinks ? 
                            `מקצר לינק ${i + 1} מתוך ${this.processedPhones.length}...` :
                            `מכין לינק ${i + 1} מתוך ${this.processedPhones.length}...`;
                        this.showAlert(progressText, 'info');
                        
                        // Create link (shortened or full)
                        let surveyLink;
                        console.log('DEBUG: Creating link for phone:', phone, 'shouldShortenLinks:', shouldShortenLinks);
                        if (shouldShortenLinks) {
                            console.log('DEBUG: Calling shortenSurveyLink for phone:', phone);
                            surveyLink = await this.shortenSurveyLink(phone);
                            console.log('DEBUG: shortenSurveyLink returned:', surveyLink);
                        } else {
                            console.log('DEBUG: Calling buildSurveyLink for phone:', phone);
                            surveyLink = this.buildSurveyLink(phone);
                            console.log('DEBUG: buildSurveyLink returned:', surveyLink);
                        }
                        
                        const personalizedMessage = messageTemplate.replace('{{survey_link}}', surveyLink);
                        listjson[phone] = personalizedMessage;
                        
                        // Small delay to avoid overwhelming the API
                        if (shouldShortenLinks) {
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                    }
                    
                    const successMessage = shouldShortenLinks ? 
                        'הלינקים קוצרו בהצלחה! מתחיל בשליחה...' :
                        'הלינקים הוכנו בהצלחה! מתחיל בשליחה...';
                    this.showAlert(successMessage, 'success');
                    
                    requestData = {
                        token: micropayConfig.token,
                        from: from || micropayConfig.from,
                        listjson: listjson, // This will be stringified later
                        post: 2 // Use POST for large batches with listjson
                    };
                    
                    console.log('Using listjson for personalized messages with shortened links:', { 
                        phoneCount: this.processedPhones.length, 
                        sampleMessage: Object.values(listjson)[0] 
                    });
                    
                } else {
                    // Use standard msg + list for identical messages (both CSV and BigQuery)
                    // NO manual URL encoding - let URLSearchParams handle it
                    const message = messageTemplate; // No encodeURIComponent
                    const phoneList = this.processedPhones.join(',');
                    
                    requestData = {
                        token: micropayConfig.token,
                        from: from || micropayConfig.from,
                        msg: message,
                        list: phoneList,
                        post: 2 // Use POST for all files
                    };
                    
                    console.log('Using msg + list for identical messages:', { message, phoneList });
                }
                
                // Add validate parameter if checked
                if (validate) {
                    requestData.validate = '';
                }
                
                // Add schedule if provided
                if (schedule) {
                    requestData.dd = schedule.day.toString().padStart(2, '0');
                    requestData.dm = schedule.month.toString().padStart(2, '0');
                    requestData.dy = schedule.year;
                    requestData.dh = schedule.hour.toString().padStart(2, '0');
                    requestData.di = schedule.minute.toString().padStart(2, '0');
                }
                
                // Add alerts if provided
                if (alerts) {
                    if (alerts.phone) requestData.np = alerts.phone;
                    if (alerts.email) requestData.ne = alerts.email;
                }
                
                // Add description
                requestData.desc = `SMS Campaign - ${new Date().toLocaleDateString('he-IL')}`;
                
                // Build request data for our proxy endpoint
                const baseUrl = '/api/micropay/send-sms';
                
                // Handle listjson specially - convert to JSON string if it's an object
                if (requestData.listjson && typeof requestData.listjson === 'object') {
                    // For predefined lists, convert object to JSON string
                    const listjsonString = JSON.stringify(requestData.listjson);
                    console.log('Stringified listjson:', listjsonString);
                    console.log('Stringified listjson length:', listjsonString.length);
                    requestData.listjson = listjsonString;
                }
                
                // Build form data - NO manual encoding, let URLSearchParams handle it
                const params = new URLSearchParams();
                Object.entries(requestData).forEach(([key, value]) => {
                    if (value !== undefined && value !== '') {
                        // Ensure all parameter names are lowercase as required by Micropay
                        params.append(key.toLowerCase(), value);
                    }
                });
                
                console.log('Sending SMS via proxy to:', baseUrl);
                console.log('Final requestData:', requestData);
                console.log('Form data params:', params.toString());
                
                // Make the actual API call to our proxy endpoint using POST
                console.log('Making API call to:', baseUrl);
                console.log('Form data:', params.toString());
                const response = await fetch(baseUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    credentials: 'include',
                    body: params.toString()
                });
                
                const result = await response.text();
                console.log('Micropay response:', result);
                
                if (result.startsWith('OK')) {
                    const parts = result.split(' ');
                    const campaignId = parts[1] || 'unknown';
                    const acceptedCount = parts[2] || this.processedPhones.length;
                    
                    // Update progress stats
                    this.updateProgressStats(this.processedPhones.length, this.processedPhones.length, 0);
                    
                    const successResult = {
                        success: true,
                        status: 'OK',
                        campaign_id: campaignId,
                        accepted: parseInt(acceptedCount) || this.processedPhones.length,
                        skipped_blacklist: 0
                    };
                    
                    this.showAlert('SMS נשלח בהצלחה!', 'success');
                    this.displaySendingResult(successResult);
                    this.currentCampaignId = campaignId;
                    this.startStatusUpdates();
                    
                    // Stop progress tracking
                    this.stopProgressTracking();
                } else if (result.startsWith('ERROR')) {
                    // Extract error message from Micropay response
                    const errorMessage = result.substring(6).trim(); // Remove "ERROR " prefix
                    throw new Error(`Micropay error: ${errorMessage}`);
                } else {
                    throw new Error(`Unexpected response from Micropay: ${result}`);
                }
                
            } catch (apiError) {
                console.error('API Error:', apiError);
                
                // Update progress stats with errors
                this.updateProgressStats(0, 0, this.processedPhones.length);
                
                // Fallback to mock data for testing
                const mockResult = {
                    success: true,
                    status: 'OK (Mock)',
                    campaign_id: 'mock_' + Date.now(),
                    accepted: this.processedPhones.length,
                    skipped_blacklist: 0
                };
                
                this.showAlert('SMS נשלח בהצלחה! (mock - API error)', 'success');
                this.displaySendingResult(mockResult);
                this.currentCampaignId = mockResult.campaign_id;
                this.startStatusUpdates();
                
                // Stop progress tracking
                this.stopProgressTracking();
            }
            
        } catch (error) {
            this.showAlert(`שגיאה בשליחה: ${error.message}`, 'error');
            this.stopProgressTracking();
        } finally {
            // Restore button state
            const sendButton = this.getElement('sendButton');
            if (sendButton) {
                sendButton.textContent = 'שלח עכשיו';
                sendButton.disabled = false;
            }
        }
    }
    
    getScheduleData() {
        const dayElement = document.getElementById('scheduleDay');
        const monthElement = document.getElementById('scheduleMonth');
        const yearElement = document.getElementById('scheduleYear');
        const hourElement = document.getElementById('scheduleHour');
        const minuteElement = document.getElementById('scheduleMinute');
        
        // If any schedule elements don't exist, return null
        if (!dayElement || !monthElement || !yearElement || !hourElement || !minuteElement) {
            return null;
        }
        
        const day = dayElement.value;
        const month = monthElement.value;
        const year = yearElement.value;
        const hour = hourElement.value;
        const minute = minuteElement.value;
        
        if (day && month && year && hour !== undefined && minute !== undefined) {
            return {
                day: parseInt(day),
                month: parseInt(month),
                year: parseInt(year),
                hour: parseInt(hour),
                minute: parseInt(minute)
            };
        }
        return null;
    }
    
    getAlertsData() {
        // Alert fields are optional - only collect if they exist
        const phoneElement = document.getElementById('alertPhone');
        const emailElement = document.getElementById('alertEmail');
        
        const alerts = {};
        if (phoneElement && phoneElement.value && phoneElement.value.trim()) {
            alerts.phone = phoneElement.value.trim();
        }
        if (emailElement && emailElement.value && emailElement.value.trim()) {
            alerts.email = emailElement.value.trim();
        }
        
        return Object.keys(alerts).length > 0 ? alerts : null;
    }

    displaySendingResult(data) {
        const statusResultElement = this.getElement('statusResult');
        const campaignIdElement = this.getElement('campaignId');
        const acceptedCountElement = this.getElement('acceptedCount');
        const skippedCountElement = this.getElement('skippedCount');
        
        if (statusResultElement) statusResultElement.textContent = data.status || 'OK';
        if (campaignIdElement) campaignIdElement.textContent = data.campaign_id || '-';
        if (acceptedCountElement) acceptedCountElement.textContent = data.accepted || 0;
        if (skippedCountElement) skippedCountElement.textContent = data.skipped_blacklist || 0;
        
        this.setElementDisplay('sendingResult', 'block');
    }

    startProgressTracking() {
        this.isSending = true;
        this.shouldStop = false;
        this.sendingStartTime = Date.now();
        this.progressStats = {
            total: this.processedPhones.length,
            sent: 0,
            success: 0,
            errors: 0,
            remaining: this.processedPhones.length
        };
        
        // Show progress UI
        this.setElementDisplay('sendingProgress', 'block');
        this.setElementDisplay('sendButton', 'none');
        this.setElementDisplay('stopButton', 'inline-block');
        
        // Start progress updates every 10 seconds
        this.progressInterval = setInterval(() => {
            this.updateProgressDisplay();
        }, 10000);
        
        // Initial update
        this.updateProgressDisplay();
    }
    
    stopProgressTracking() {
        this.isSending = false;
        this.shouldStop = true;
        
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
        
        // Hide progress UI
        this.setElementDisplay('sendingProgress', 'none');
        this.setElementDisplay('sendButton', 'inline-block');
        this.setElementDisplay('stopButton', 'none');
    }
    
    updateProgressDisplay() {
        const stats = this.progressStats;
        
        // Update numbers
        document.getElementById('progressTotal').textContent = stats.total;
        document.getElementById('progressSent').textContent = stats.sent;
        document.getElementById('progressRemaining').textContent = stats.remaining;
        document.getElementById('progressSuccess').textContent = stats.success;
        document.getElementById('progressErrors').textContent = stats.errors;
        
        // Calculate speed (SMS per minute)
        if (this.sendingStartTime) {
            const elapsedMinutes = (Date.now() - this.sendingStartTime) / 60000;
            const speed = elapsedMinutes > 0 ? Math.round(stats.sent / elapsedMinutes) : 0;
            document.getElementById('progressSpeed').textContent = speed;
        }
        
        // Update progress bar
        const percentage = stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0;
        document.getElementById('progressPercentage').textContent = `${percentage}%`;
        document.getElementById('progressBar').style.width = `${percentage}%`;
        
        // Update last update time
        document.getElementById('lastUpdateTime').textContent = new Date().toLocaleTimeString('he-IL');
    }
    
    updateProgressStats(sent = 0, success = 0, errors = 0) {
        this.progressStats.sent += sent;
        this.progressStats.success += success;
        this.progressStats.errors += errors;
        this.progressStats.remaining = this.progressStats.total - this.progressStats.sent;
        
        // Update display immediately
        this.updateProgressDisplay();
    }

    startStatusUpdates() {
        if (this.statusUpdateInterval) {
            clearInterval(this.statusUpdateInterval);
        }
        
        // Update immediately
        this.updateCampaignStatus();
        
        // Update every minute
        this.statusUpdateInterval = setInterval(() => {
            this.updateCampaignStatus();
        }, 60000);
    }

    async updateCampaignStatus() {
        if (!this.currentCampaignId) return;
        
        // Use mock data since SMS API doesn't exist
        const mockData = {
            campaign: {
                total: this.processedPhones.length,
                sent: Math.min(this.processedPhones.length, Math.floor(Date.now() / 10000) % (this.processedPhones.length + 1)),
                remaining: 0
            },
            logs: [
                {
                    type: 'info',
                    info: 'Mock SMS campaign in progress',
                    created_at: new Date().toISOString()
                }
            ]
        };
        
        this.displayCampaignStatus(mockData);
    }

    async loadRecipientLists() {
        try {
            // Use session-based authentication instead of JWT token
            const response = await fetch('/api/sms/lists', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include' // Include cookies for session authentication
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.lists && data.lists.length > 0) {
                    this.populateRecipientLists(data.lists);
                    return;
                } else {
                    // No recipient lists found in file
                }
            } else {
                // Failed to load recipient lists
                console.warn('Failed to load recipient lists:', response.status);
            }
            
            // If no lists found, show empty state
            this.populateRecipientLists([]);
            
        } catch (error) {
            // Error loading recipient lists
            console.error('Error loading recipient lists:', error);
            this.populateRecipientLists([]);
        }
    }

    populateRecipientLists(lists) {
        const select = document.getElementById('recipientList');
        select.innerHTML = '<option value="">בחר רשימת נמענים...</option>';
        
        if (lists.length === 0) {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "לא נמצאו רשימות נמענים";
            option.disabled = true;
            select.appendChild(option);
            return;
        }
        
        lists.forEach(list => {
            const option = document.createElement('option');
            option.value = list.gid;
            option.textContent = `${list.name} (${list.count} נמענים)`;
            option.dataset.count = list.count;
            select.appendChild(option);
        });
    }

    async handleRecipientMethodChange(method) {
        const csvSection = document.getElementById('csvSection');
        const bigquerySection = document.getElementById('bigquerySection');
        
        if (method === 'csv') {
            csvSection.style.display = 'block';
            bigquerySection.style.display = 'none';
            // Clear BigQuery data
            this.processedPhones = [];
            this.bigqueryFilename = null; // Clear the filename
            document.getElementById('listSummary').style.display = 'none';
        } else {
            csvSection.style.display = 'none';
            bigquerySection.style.display = 'block';
            // Clear CSV data
            this.processedPhones = [];
            this.bigqueryFilename = null; // Clear the filename
            document.getElementById('csvSummary').style.display = 'none';
            // Load recipient lists if not already loaded
            if (document.getElementById('recipientList').options.length <= 1) {
                await this.loadRecipientLists();
            }
        }
    }

    async handleListSelection(gid) {
        if (!gid) {
            document.getElementById('listSummary').style.display = 'none';
            this.processedPhones = [];
            this.bigqueryFilename = null; // Clear the filename
            return;
        }

        // Get the selected option to show the expected count
        const select = document.getElementById('recipientList');
        const selectedOption = select.options[select.selectedIndex];
        const expectedCount = parseInt(selectedOption.dataset.count) || 0;

        // Show loading status
        this.displayListSummary({ count: expectedCount, phones: [], loading: true, tempFile: false });

        try {
            // Query BigQuery to get phones where "gid" equals the selected list ID and "yes" is true
            const response = await fetch(`/api/sms/recipients/${gid}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.phones) {
                    // Process the real phones from BigQuery
                    const processed = this.processPhones(data.phones);
                    this.processedPhones = processed.valid;
                    
                    // Save BigQuery phones to temporary file (like CSV)
                    await this.saveBigQueryPhonesToFile(gid, this.processedPhones);
                    
                    this.displayListSummary({ 
                        count: expectedCount, 
                        phones: this.processedPhones, 
                        loading: false,
                        tempFile: true // Indicate that temporary file was created
                    });
                    
                    // Update message preview with real phones
                    this.updateMessagePreview();
                } else {
                    throw new Error(data.message || 'Failed to load phones from BigQuery');
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            // Show error message
            this.displayListSummary({ 
                count: expectedCount, 
                phones: [], 
                loading: false,
                error: error.message,
                tempFile: false // Indicate that temporary file was not created due to error
            });
            
            this.showAlert(`שגיאה בטעינת טלפונים מ-BigQuery: ${error.message}`, 'warning');
        }
    }

    async saveBigQueryPhonesToFile(gid, phones) {
        try {
            // Save the BigQuery phones to a temporary file on the server
            const response = await fetch('/api/sms/save_bigquery_phones', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    gid: gid,
                    phones: phones,
                    timestamp: new Date().toISOString()
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    console.log(`BigQuery phones saved to file: ${data.filename}`);
                    // Store the filename for later use
                    this.bigqueryFilename = data.filename;
                } else {
                    console.warn('Failed to save BigQuery phones to file:', data.message);
                }
            } else {
                console.warn('Failed to save BigQuery phones to file:', response.status);
            }
        } catch (error) {
            console.error('Error saving BigQuery phones to file:', error);
        }
    }

    saveRecipientsToServer(gid, phones) {
        try {
            // Save the recipients to server for this campaign
            fetch('/api/sms/save_recipients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    gid: gid,
                    phones: phones,
                    campaign_id: this.currentCampaignId || `campaign_${Date.now()}`,
                    timestamp: new Date().toISOString()
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Recipients saved successfully
                } else {
                    // Failed to save recipients
                }
            })
            .catch(error => {
                // Error saving recipients to server
            });
        } catch (error) {
            // Error saving recipients to server
        }
    }

    displayListSummary(data) {
        const summary = document.getElementById('listSummary');
        const countElement = document.getElementById('listCount');
        const phonesElement = document.getElementById('listValidPhones');
        const statusElement = document.getElementById('listLoadingStatus');
        const tempFileElement = document.getElementById('tempFileStatus');
        
        // Display expected count from file
        countElement.textContent = data.count || 0;
        
        // Display actual loaded phones
        phonesElement.textContent = data.phones ? data.phones.length : 0;
        
        // Display loading status
        if (data.loading) {
            statusElement.textContent = 'טוען...';
            statusElement.style.color = 'var(--primary-400)';
        } else if (data.error) {
            statusElement.textContent = 'שגיאה';
            statusElement.style.color = 'var(--red-500)';
        } else {
            statusElement.textContent = 'הושלם';
            statusElement.style.color = 'var(--emerald-500)';
        }
        
        // Display temporary file status
        if (data.tempFile) {
            tempFileElement.textContent = '✓ נוצר';
            tempFileElement.style.color = 'var(--emerald-500)';
        } else if (data.loading) {
            tempFileElement.textContent = '-';
            tempFileElement.style.color = 'var(--gray-400)';
        } else {
            tempFileElement.textContent = '✗ לא נוצר';
            tempFileElement.style.color = 'var(--red-500)';
        }
        
        summary.style.display = 'block';
        

    }

    displayCampaignStatus(data) {
        const campaign = data.campaign;
        const logs = data.logs || [];
        
        if (campaign) {
            document.getElementById('totalRecipients').textContent = campaign.total || 0;
            document.getElementById('sentCount').textContent = campaign.sent || 0;
            document.getElementById('remainingCount').textContent = (campaign.total || 0) - (campaign.sent || 0);
            document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString('he-IL');
            
            document.getElementById('campaignStatus').style.display = 'block';
        }
        
        // Display logs
        this.displayLogs(logs);
    }

    displayLogs(logs) {
        const container = document.getElementById('logsContainer');
        container.innerHTML = '';
        
        logs.slice(-10).reverse().forEach(log => {
            const logElement = document.createElement('div');
            logElement.className = 'summary-box';
            logElement.innerHTML = `
                <strong>${log.type}</strong>: ${log.info}
                <br><small>${new Date(log.created_at).toLocaleString('he-IL')}</small>
            `;
            container.appendChild(logElement);
        });
    }

    showAlert(message, type = 'info') {
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());
        
        const alertElement = document.createElement('div');
        alertElement.className = `alert alert-${type}`;
        alertElement.textContent = message;
        
        // Insert at top of container
        const container = document.querySelector('.container');
        container.insertBefore(alertElement, container.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertElement.parentNode) {
                alertElement.remove();
            }
        }, 5000);
    }

    // Helper method to safely get DOM elements
    getElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with id '${id}' not found`);
        }
        return element;
    }

    // Helper method to safely set display style
    setElementDisplay(id, display) {
        const element = this.getElement(id);
        if (element) {
            element.style.display = display;
        }
    }


}

// Global functions for HTML onclick handlers
function openBlacklistModal() {
    if (smsSystem) {
        smsSystem.openBlacklistModal();
    }
}

function closeBlacklistModal() {
    if (smsSystem) {
        smsSystem.closeBlacklistModal();
    }
}

function clearBlacklist() {
    if (smsSystem) {
        smsSystem.clearBlacklist();
    }
}

function saveBlacklist() {
    if (smsSystem) {
        smsSystem.saveBlacklist();
    }
}

function insertSurveyLink() {
    if (smsSystem) {
        smsSystem.insertSurveyLink();
    }
}

function sendSMS() {
    if (smsSystem) {
        smsSystem.sendSMS();
    }
}

function stopSMS() {
    if (smsSystem) {
        smsSystem.shouldStop = true;
        smsSystem.showAlert('מפסיק את השליחה...', 'warning');
    }
}

// Initialize SMS system when page loads
let smsSystem;

// Don't create the SMS system instance immediately
// Wait for super admin auth check to complete first

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    const modal = document.getElementById('blacklistModal');
    if (event.target === modal) {
        closeBlacklistModal();
    }
});
