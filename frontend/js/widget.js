// Chatbot Widget - Complete Version with All Features
// Works directly with Flask, includes all features from index.html chatbot

// Data maps (same as chatbot.js)
const quickActionMap = {
    fees: "Can you tell me about the fees structure?",
    admission: "What is the admission process?",
    scholarships: "Which scholarships are available?",
    library: "What are the library timings and facilities?",
    hostel: "Tell me about the hostel facilities.",
    faculty: "How can I contact the faculty?",
    events: "What events are happening on campus?",
};

function formatCategoryLabel(category = "") {
    const cleaned = category.replace(/_/g, " ").trim();
    if (!cleaned) return "General";
    return cleaned
        .toLowerCase()
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

const admissionInfoMap = {
    "first-year": `First Year Diploma Admission (Post SSC):
- Required documents: SSC mark sheet, leaving certificate, caste certificate (if applicable), domicile, income certificate, Aadhaar.
- Process: Register on DTE portal, fill CAP form, confirm at FC, lock choices, report to ARC/Institute with originals.
- Fees: Pay as per fee receipt at college cash counter after seat confirmation.`,
    "direct-second-year": `Direct Second Year (Post HSC/MCVC/ITI):
- Documents: HSC/MCVC mark sheet, SSC certificate, diploma/provisional for ITI, equivalence certificate, caste/income if applicable.
- Process: Apply through CAP DSE (Polytechnic) round, upload scanned documents, confirm at FC, report to allotted institute.
- Additional: Bridge courses may be scheduled for math/physics gaps.`,
    management: `Management Quota Admission:
- Documents: SSC mark sheet, latest qualifying exam mark sheet, nationality/domicile, caste/income if seeking reservation, Aadhaar, passport photo.
- Process: Collect institute form, submit documents for verification, appear for counselling with principal, pay seat confirmation fee.
- Note: Limited seats; merit still considered. Keep originals for verification.`,
    international: `International / NRI Admission:
- Documents: Passport, visa, equivalence certificate from AIU, transcripts, proof of residence abroad, sponsorship letter, medical fitness.
- Process: Apply via DTE international cell and inform institute. Obtain provisional eligibility, then pay fees in USD/INR as instructed.
- Additional: FRRO registration within 14 days of arrival; insurance recommended.`,
    bsc: `B.Sc.-based Lateral Entry (where permitted):
- Documents: B.Sc. mark sheets, degree certificate/provisional, transfer certificate, migration (if other university), caste/income if applicable.
- Process: Apply under lateral entry notification, appear for counselling (may include aptitude test), submit originals for verification, pay fees.
- Tip: Carry syllabus copies to evaluate course equivalence for credit transfer.`,
    default: `Please contact the admission cell for your document checklist and schedule.`,
};

const scholarshipInfoMap = {
    general: `Scholarships for Open / General category:
- State Merit Scholarship: 75%+ in SSC/HSC, ₹1,000 per month.
- EBC Tuition Fee Waiver: Income < ₹8L, 50% tuition concession.
- Central Sector Scheme: 80%+, ₹10,000 per year for diploma students.`,
    obc: `Scholarships for OBC / SBC students:
- Post Matric OBC Scholarship (DBT): Income < ₹8L, covers tuition + exam fees.
- OBC Free-ship: Available for diploma students admitted through CAP.
- Vocational Training Fee Reimbursement: Apply on MahaDBT before Dec.`,
    sc: `Scholarships for SC students:
- Post Matric Scholarship: 100% tuition, exam, and maintenance allowance.
- Rajarshi Shahu Maharaj Scholarship: For meritorious SC students in diploma courses.
- Book Bank Scheme: Free textbooks issued via department library.`,
    st: `Scholarships for ST students:
- Tribal Development Post Matric Scholarship: Full fee waiver + hostel allowance.
- Vocational Education Fee Waiver: Income < ₹2.5L, apply through project office.
- Ashram Hostel Support: Accommodation + mess subsidy for ST girls.`,
    ews: `Scholarships for EWS students:
- EWS Fee Reimbursement: Income < ₹8L, submit Form-16 + ration card.
- Pragati Scholarship (AICTE): ₹50,000 per year for two girl children in family.
- Skill Development Stipend: ₹1,000 per month during in-plant training.`,
    minority: `Scholarships for Minority communities:
- MahaDBT Minority Scholarship: Income < ₹2.5L, ₹6,000 maintenance allowance.
- Central Minority Merit-cum-Means Scholarship: 50% tuition + ₹10,000 stipend.
- Maulana Azad Scholarship for Girls: ₹12,000 per year (apply before Nov).`,
    female: `Scholarships for Girl students:
- Pragati Scholarship (AICTE): ₹50,000 per year + laptop allowance.
- Savitribai Phule Scholarship: ₹1,000 per month for SC/ST girls enrolled in diploma.
- Beti Bachao Beti Padhao local scholarships announced via institute notice.`,
    default: `Please connect with the scholarship cell for updated schemes.`
};

class ChatWidget {
    constructor(options = {}) {
        this.apiEndpoint = options.apiEndpoint || '/api/chatbot/message';
        this.primaryColor = options.primaryColor || '#00D26A';
        this.collegeName = options.collegeName || 'COLLEGE SUPPORT';
        this.username = options.username || null;
        
        this.state = {
            isOpen: false,
            isExpanded: false,
            messages: [],
            isTyping: false,
        };
        
        this.widgetState = {
            admissionPrompted: false,
            helpFormVisible: false,
            feesPanelVisible: false,
            admissionPanelVisible: false,
            scholarshipPanelVisible: false,
            quickInputVisible: true,
        };
        this.feeData = [];
        this.feeDropdownStatus = { loading: false, loaded: false };
        this.scholarshipsData = [];
        this.scholarshipsDropdownStatus = { loading: false, loaded: false };
        
        this.recognition = null;
        this.isRecording = false;
        this.welcomeShown = false;
        this.initVoiceRecognition();
        this.init();
    }

    init() {
        this.createWidget();
        this.attachEventListeners();
        this.loadFeeCategories();
        this.loadScholarshipCategories();
    }

    initVoiceRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US'; // English only constraint (FR1.1)
            
            this.recognition.onstart = () => {
                this.isRecording = true;
                this.updateVoiceButton(true);
            };
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                const input = document.getElementById('widget-message-input');
                if (input) {
                    input.value = transcript;
                }
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.isRecording = false;
                this.updateVoiceButton(false);
                if (event.error === 'no-speech') {
                    this.addMessage('No speech detected. Please try again.', 'bot');
                } else if (event.error === 'not-allowed') {
                    this.addMessage('Microphone permission denied. Please enable microphone access.', 'bot');
                }
            };
            
            this.recognition.onend = () => {
                this.isRecording = false;
                this.updateVoiceButton(false);
            };
        }
    }

    toggleVoiceRecognition() {
        if (!this.recognition) {
            this.addMessage('Voice input is not supported in your browser. Please use Chrome or Edge.', 'bot');
            return;
        }
        
        if (this.isRecording) {
            this.recognition.stop();
        } else {
            try {
                this.recognition.start();
            } catch (error) {
                console.error('Error starting voice recognition:', error);
            }
        }
    }

    updatePanelPosition() {
        const panel = document.getElementById('chat-panel');
        if (!panel) return;
        
        const viewportHeight = window.innerHeight;
        const panelHeight = parseInt(panel.style.height) || 600;
        // Calculate safe bottom position: ensure panel doesn't exceed viewport
        // Add 20px margin from top to prevent cutoff
        const safeBottom = Math.max(16, viewportHeight - panelHeight - 20);
        panel.style.bottom = safeBottom + 'px';
    }

    getApiBase() {
        if (
            window.location.origin &&
            window.location.origin !== 'null' &&
            window.location.origin !== 'file://'
        ) {
            return window.location.origin;
        }
        return window.__CHATBOT_API_BASE__ || 'http://localhost:5000';
    }

    async fetchChatbotData(endpoint, params = {}) {
        const base = this.getApiBase();
        const url =
            endpoint.startsWith('http://') || endpoint.startsWith('https://')
                ? new URL(endpoint)
                : new URL(endpoint, base);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && `${value}`.trim() !== '') {
                url.searchParams.append(key, value);
            }
        });

        const response = await fetch(url.toString(), { method: 'GET' });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Unable to fetch latest information.');
        }
        return data;
    }

    async loadFeeCategories(forceRefresh = false) {
        const select = document.getElementById('widget-fees-category');
        if (!select) {
            return;
        }

        // Allow refresh if forceRefresh is true, otherwise skip if already loaded and not loading
        if (!forceRefresh && (this.feeDropdownStatus.loading || this.feeDropdownStatus.loaded)) {
            return;
        }

        this.feeDropdownStatus.loading = true;
        select.innerHTML = '<option value="">Loading categories...</option>';
        select.disabled = true;

        try {
            const data = await this.fetchChatbotData('/api/chatbot/fees');
            const fees = data.fees || [];
            this.feeData = fees;

            if (!fees.length) {
                select.innerHTML = '<option value="">No fee categories configured</option>';
                this.feeDropdownStatus.loaded = true;
                return;
            }

            const uniqueCategories = Array.from(
                new Map(
                    fees
                        .filter((fee) => fee.category)
                        .map((fee) => [fee.category, formatCategoryLabel(fee.category)])
                ).entries()
            );

            select.innerHTML = '<option value="">Choose a category</option>';
            uniqueCategories
                .sort((a, b) => a[1].localeCompare(b[1]))
                .forEach(([value, label]) => {
                    const option = document.createElement('option');
                    option.value = value;
                    option.textContent = label;
                    select.appendChild(option);
                });

            select.disabled = false;
            this.feeDropdownStatus.loaded = true;
        } catch (error) {
            console.error('Failed to load fee categories:', error);
            select.innerHTML = '<option value="">Unable to load categories</option>';
        } finally {
            this.feeDropdownStatus.loading = false;
        }
    }

    async loadScholarshipCategories(forceRefresh = false) {
        const select = document.getElementById('widget-scholarship-category');
        if (!select) {
            return;
        }

        // Allow refresh if forceRefresh is true, otherwise skip if already loaded and not loading
        if (!forceRefresh && (this.scholarshipsDropdownStatus.loading || this.scholarshipsDropdownStatus.loaded)) {
            return;
        }

        this.scholarshipsDropdownStatus.loading = true;
        select.innerHTML = '<option value="">Loading categories...</option>';
        select.disabled = true;

        try {
            const data = await this.fetchChatbotData('/api/chatbot/scholarships');
            const scholarships = data.scholarships || [];
            this.scholarshipsData = scholarships;

            if (!scholarships.length) {
                select.innerHTML = '<option value="">No scholarship categories configured</option>';
                this.scholarshipsDropdownStatus.loaded = true;
                return;
            }

            // Get unique active scholarship categories
            const uniqueCategories = Array.from(
                new Map(
                    scholarships
                        .filter((sch) => sch.is_active && sch.category)
                        .map((sch) => [sch.category, formatCategoryLabel(sch.category)])
                ).entries()
            );

            select.innerHTML = '<option value="">Choose a category</option>';
            uniqueCategories
                .sort((a, b) => a[1].localeCompare(b[1]))
                .forEach(([value, label]) => {
                    const option = document.createElement('option');
                    option.value = value;
                    option.textContent = label;
                    select.appendChild(option);
                });

            select.disabled = false;
            this.scholarshipsDropdownStatus.loaded = true;
        } catch (error) {
            console.error('Failed to load scholarship categories:', error);
            select.innerHTML = '<option value="">Unable to load categories</option>';
        } finally {
            this.scholarshipsDropdownStatus.loading = false;
        }
    }

    async fetchFeesInformation(category) {
        this.showTypingIndicator();
        try {
            const data = await this.fetchChatbotData('/api/chatbot/fees', { category });
            const text =
                data.formatted_text ||
                'Fee details are not available for this category right now. Please check again later.';
            this.addMessage(text, 'bot');
        } catch (error) {
            this.addMessage(error.message || 'Unable to fetch fee information right now.', 'bot');
        } finally {
            this.hideTypingIndicator();
        }
    }

    updateVoiceButton(isRecording) {
        const voiceBtn = document.getElementById('widget-voice-btn');
        if (voiceBtn) {
            if (isRecording) {
                voiceBtn.style.color = '#E74C3C';
                voiceBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" fill="#E74C3C" opacity="0.3"></circle><circle cx="12" cy="12" r="6" fill="#E74C3C"></circle></svg>';
            } else {
                voiceBtn.style.color = '#6B7280';
                voiceBtn.innerHTML = this.getIconSVG('voice');
            }
        }
    }

    createWidget() {
        const container = document.createElement('div');
        container.className = 'chat-widget-container';
        container.id = 'chat-widget-root';
        document.body.appendChild(container);

        this.createChatButton(container);
        this.createChatPanel(container);
    }

    createChatButton(container) {
        const button = document.createElement('button');
        button.className = 'chat-button';
        button.innerHTML = `
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
        `;
        button.style.cssText = `
            position: fixed;
            bottom: 16px;
            right: 24px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background-color: ${this.primaryColor};
            color: white;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.3s ease;
        `;
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
        });
        button.addEventListener('click', () => this.toggleChat());
        button.id = 'chat-widget-button';
        container.appendChild(button);
    }

    createChatPanel(container) {
        const panel = document.createElement('div');
        panel.className = 'chat-panel';
        panel.id = 'chat-panel';
        
        // Calculate initial bottom position based on viewport height
        const viewportHeight = window.innerHeight;
        const initialHeight = 600;
        const initialBottom = Math.max(16, viewportHeight - initialHeight - 20);
        
        panel.style.cssText = `
            position: fixed;
            bottom: ${initialBottom}px;
            right: 24px;
            width: 436px;
            height: ${initialHeight}px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            z-index: 10000;
            display: none;
            flex-direction: column;
            overflow: hidden;
        `;

        panel.appendChild(this.createHeader());
        panel.appendChild(this.createMessagesArea());
        panel.appendChild(this.createQuickActions());
        panel.appendChild(this.createPanels());
        panel.appendChild(this.createInputArea());
        panel.appendChild(this.createHelpForm());

        container.appendChild(panel);
    }

    createHeader() {
        const header = document.createElement('div');
        header.className = 'chat-header';
        header.style.cssText = `
            background-color: ${this.primaryColor};
            color: white;
            padding: 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-radius: 16px 16px 0 0;
        `;

        const left = document.createElement('div');
        left.style.cssText = 'display: flex; align-items: center; gap: 12px;';

        const backBtn = document.createElement('button');
        backBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>';
        backBtn.style.cssText = 'background: none; border: none; color: white; cursor: pointer; padding: 4px;';
        backBtn.addEventListener('click', () => this.closeChat());
        left.appendChild(backBtn);

        const avatars = document.createElement('div');
        avatars.style.cssText = 'display: flex; align-items: center;';
        ['V', 'M', 'S'].forEach((letter, i) => {
            const avatar = document.createElement('div');
            avatar.textContent = letter;
            avatar.style.cssText = `
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: rgba(255,255,255,0.3);
                border: 2px solid rgba(255,255,255,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: 600;
                margin-left: ${i > 0 ? '-8px' : '0'};
                z-index: ${10 + i};
            `;
            avatars.appendChild(avatar);
        });
        left.appendChild(avatars);

        const titleDiv = document.createElement('div');
        titleDiv.innerHTML = `
            <h3 style="margin: 0; font-size: 16px; font-weight: 600;">${this.collegeName}</h3>
            <p style="margin: 0; font-size: 12px; opacity: 0.9; display: flex; align-items: center; gap: 4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                A few minutes
            </p>
        `;
        left.appendChild(titleDiv);

        const right = document.createElement('div');
        right.style.cssText = 'display: flex; align-items: center; gap: 8px;';

        const expandBtn = document.createElement('button');
        expandBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></svg>';
        expandBtn.style.cssText = 'background: none; border: none; color: white; cursor: pointer; padding: 4px;';
        expandBtn.addEventListener('click', () => this.toggleExpand());
        right.appendChild(expandBtn);

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        closeBtn.style.cssText = 'background: none; border: none; color: white; cursor: pointer; padding: 4px;';
        closeBtn.addEventListener('click', () => this.closeChat());
        right.appendChild(closeBtn);

        header.appendChild(left);
        header.appendChild(right);
        return header;
    }

    createMessagesArea() {
        const messagesArea = document.createElement('div');
        messagesArea.className = 'chat-messages';
        messagesArea.id = 'chat-messages';
        messagesArea.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            background: white;
            min-height: 0;
        `;
        return messagesArea;
    }

    createQuickActions() {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'quick-actions-widget';
        actionsDiv.id = 'quick-actions-widget';
        actionsDiv.style.cssText = `
            padding: 8px 12px;
            background: #F9FAFB;
            border-top: 1px solid #E5E7EB;
            transition: all 0.3s ease;
        `;

        // Create header with label and toggle button
        const headerDiv = document.createElement('div');
        headerDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;';
        
        const label = document.createElement('label');
        label.style.cssText = 'font-weight: 600; font-size: 14px; color: #374151; margin: 0; cursor: pointer;';
        label.textContent = 'Quick Input:';
        
        // Create toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'quick-input-toggle';
        toggleBtn.type = 'button';
        toggleBtn.style.cssText = `
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #6B7280;
            transition: transform 0.3s ease;
        `;
        toggleBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
        `;
        
        // Toggle functionality
        toggleBtn.addEventListener('click', () => this.toggleQuickInput());
        label.addEventListener('click', () => this.toggleQuickInput());
        
        headerDiv.appendChild(label);
        headerDiv.appendChild(toggleBtn);
        actionsDiv.appendChild(headerDiv);

        // Create dropdown container
        const dropdownContainer = document.createElement('div');
        dropdownContainer.id = 'quick-input-container';
        dropdownContainer.style.cssText = 'overflow: hidden; transition: max-height 0.3s ease, opacity 0.3s ease;';

        const dropdown = document.createElement('select');
        dropdown.id = 'quick-input-dropdown';
        dropdown.style.cssText = `
            width: 100%;
            padding: 6px 12px;
            border: 1px solid #D1D5DB;
            border-radius: 8px;
            background: white;
            color: #374151;
            font-size: 14px;
            cursor: pointer;
            outline: none;
        `;

        const options = [
            { value: '', text: 'Select a topic...' },
            { value: 'fees', text: 'Fees Information' },
            { value: 'admission', text: 'Admission Process' },
            { value: 'scholarships', text: 'Scholarships' },
            { value: 'library', text: 'Library Timings' },
            { value: 'hostel', text: 'Hostel Information' },
            { value: 'faculty', text: 'Contact Staff' },
            { value: 'events', text: 'Events' },
            { value: 'help', text: 'I Need Help' },
        ];

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            dropdown.appendChild(option);
        });

        dropdown.addEventListener('change', (e) => {
            const value = e.target.value;
            if (value) {
                this.handleQuickAction({ target: { dataset: { action: value } } });
                e.target.value = ''; // Reset dropdown
            }
        });

        dropdownContainer.appendChild(dropdown);
        actionsDiv.appendChild(dropdownContainer);
        
        // Initialize visibility
        this.updateQuickInputVisibility();
        
        return actionsDiv;
    }

    toggleQuickInput() {
        this.widgetState.quickInputVisible = !this.widgetState.quickInputVisible;
        this.updateQuickInputVisibility();
    }

    updateQuickInputVisibility() {
        const container = document.getElementById('quick-input-container');
        const toggleBtn = document.getElementById('quick-input-toggle');
        
        if (!container || !toggleBtn) return;
        
        if (this.widgetState.quickInputVisible) {
            // Show dropdown
            container.style.maxHeight = '100px';
            container.style.opacity = '1';
            container.style.marginBottom = '0';
            // Rotate chevron down
            toggleBtn.style.transform = 'rotate(0deg)';
        } else {
            // Hide dropdown
            container.style.maxHeight = '0';
            container.style.opacity = '0';
            container.style.marginBottom = '0';
            // Rotate chevron up
            toggleBtn.style.transform = 'rotate(180deg)';
        }
    }

    createPanels() {
        const panelsContainer = document.createElement('div');
        panelsContainer.id = 'widget-panels';
        panelsContainer.style.cssText = 'padding: 0 16px;';

        // Fees Panel
        const feesPanel = document.createElement('div');
        feesPanel.id = 'widget-fees-panel';
        feesPanel.className = 'widget-panel hidden';
        feesPanel.innerHTML = `
            <div style="background: white; padding: 8px; border-radius: 8px; margin: 4px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <label style="display: block; font-weight: 600; margin-bottom: 4px; font-size: 14px;">Select your category to view fee structure</label>
                <select id="widget-fees-category" style="width: 100%; padding: 6px; border: 1px solid #D1D5DB; border-radius: 6px; font-size: 14px;">
                    <option value="">Loading categories...</option>
                </select>
                <p style="font-size: 12px; color: #6B7280; margin-top: 2px;">Pick a category to see the detailed fee structure.</p>
            </div>
        `;
        panelsContainer.appendChild(feesPanel);

        // Admission Panel
        const admissionPanel = document.createElement('div');
        admissionPanel.id = 'widget-admission-panel';
        admissionPanel.className = 'widget-panel hidden';
        admissionPanel.innerHTML = `
            <div style="background: white; padding: 8px; border-radius: 8px; margin: 4px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <label style="display: block; font-weight: 600; margin-bottom: 4px; font-size: 14px;">Select admission route to view requirements</label>
                <select id="widget-admission-category" style="width: 100%; padding: 6px; border: 1px solid #D1D5DB; border-radius: 6px; font-size: 14px;">
                    <option value="">Choose a route</option>
                    <option value="first-year">First Year (MH-CET)</option>
                    <option value="direct-second-year">Direct Second Year (Diploma)</option>
                    <option value="management">Management Quota</option>
              
                    <option value="bsc">B.Sc.-based Lateral Entry</option>
                </select>
                <p style="font-size: 12px; color: #6B7280; margin-top: 2px;">Pick a route to see required documents and steps.</p>
            </div>
        `;
        panelsContainer.appendChild(admissionPanel);

        // Scholarship Panel
        const scholarshipPanel = document.createElement('div');
        scholarshipPanel.id = 'widget-scholarship-panel';
        scholarshipPanel.className = 'widget-panel hidden';
        scholarshipPanel.innerHTML = `
            <div style="background: white; padding: 8px; border-radius: 8px; margin: 4px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <label style="display: block; font-weight: 600; margin-bottom: 4px; font-size: 14px;">Select your category to view scholarship details</label>
                <select id="widget-scholarship-category" style="width: 100%; padding: 6px; border: 1px solid #D1D5DB; border-radius: 6px; font-size: 14px;">
                    <option value="">Loading categories...</option>
                </select>
                <p style="font-size: 12px; color: #6B7280; margin-top: 2px;">Pick a category to see scholarships you can apply for.</p>
            </div>
        `;
        panelsContainer.appendChild(scholarshipPanel);

        return panelsContainer;
    }

    createInputArea() {
        const inputArea = document.createElement('div');
        inputArea.className = 'chat-input-area';
        inputArea.style.cssText = `
            border-top: 1px solid #E5E7EB;
            padding: 16px;
            background: white;
            display: flex;
            align-items: center;
            gap: 8px;
        `;

        const icons = document.createElement('div');
        icons.style.cssText = 'display: flex; align-items: center; gap: 8px;';
        
        // Voice button with recording functionality
        const voiceBtn = document.createElement('button');
        voiceBtn.type = 'button';
        voiceBtn.id = 'widget-voice-btn';
        voiceBtn.style.cssText = 'background: none; border: none; color: #6B7280; cursor: pointer; padding: 8px; position: relative;';
        voiceBtn.innerHTML = this.getIconSVG('voice');
        voiceBtn.addEventListener('click', () => this.toggleVoiceRecognition());
        icons.appendChild(voiceBtn);
        
        inputArea.appendChild(icons);

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Ask me anything about COEA Ambajogai...';
        input.id = 'widget-message-input';
        input.style.cssText = `
            flex: 1;
            padding: 10px 16px;
            border: 1px solid #E5E7EB;
            border-radius: 999px;
            outline: none;
            font-size: 14px;
        `;
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        inputArea.appendChild(input);

        const sendBtn = document.createElement('button');
        sendBtn.type = 'button';
        sendBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
        sendBtn.style.cssText = `
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: ${this.primaryColor};
            color: white;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        sendBtn.addEventListener('click', () => this.sendMessage());
        inputArea.appendChild(sendBtn);

        return inputArea;
    }

    createHelpForm() {
        const helpForm = document.createElement('div');
        helpForm.id = 'widget-help-form';
        helpForm.className = 'widget-help-form hidden';
        helpForm.style.cssText = `
            padding: 16px;
            background: white;
            border-top: 1px solid #E5E7EB;
        `;
        helpForm.innerHTML = `
            <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">Need Assistance?</h3>
            <p style="margin: 0 0 16px 0; font-size: 14px; color: #6B7280;">Please share your details so we can create a help ticket.</p>
            <form id="widget-ticket-form">
                <div style="margin-bottom: 12px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 4px; font-size: 14px;">Full Name</label>
                    <input type="text" id="widget-help-name" required style="width: 100%; padding: 8px; border: 1px solid #D1D5DB; border-radius: 6px; font-size: 14px;">
                </div>
                <div style="margin-bottom: 12px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 4px; font-size: 14px;">Contact Number / Email</label>
                    <input type="text" id="widget-help-contact" required style="width: 100%; padding: 8px; border: 1px solid #D1D5DB; border-radius: 6px; font-size: 14px;">
                </div>
                <div style="margin-bottom: 12px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 4px; font-size: 14px;">Topic</label>
                    <select id="widget-help-topic" style="width: 100%; padding: 8px; border: 1px solid #D1D5DB; border-radius: 6px; font-size: 14px;">
                        <option value="">Select a topic...</option>
                        <option value="Fees Information">Fees Information</option>
                        <option value="Admission Process">Admission Process</option>
                        <option value="Scholarships">Scholarships</option>
                        <option value="Library Timings">Library Timings</option>
                        <option value="Hostel Information">Hostel Information</option>
                        <option value="Contact Staff">Contact Staff</option>
                        <option value="Events">Events</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div style="margin-bottom: 12px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 4px; font-size: 14px;">How can we help?</label>
                    <textarea id="widget-help-query" rows="3" required style="width: 100%; padding: 8px; border: 1px solid #D1D5DB; border-radius: 6px; font-size: 14px; resize: vertical;"></textarea>
                </div>
                <div style="margin-bottom: 12px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 4px; font-size: 14px;">Attach PDF (Optional)</label>
                    <input type="file" id="widget-help-pdf" accept=".pdf" style="width: 100%; padding: 8px; border: 1px solid #D1D5DB; border-radius: 6px; font-size: 14px;">
                </div>
                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button type="button" id="widget-cancel-help" style="padding: 8px 16px; border: 1px solid #D1D5DB; background: white; border-radius: 6px; cursor: pointer; font-size: 14px;">Cancel</button>
                    <button type="submit" style="padding: 8px 16px; background: ${this.primaryColor}; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;">Submit Ticket</button>
                </div>
            </form>
        `;
        return helpForm;
    }

    getIconSVG(type) {
        const icons = {
            attachment: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>',
            emoji: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>',
            gif: '<text x="10" y="14" font-size="12" font-weight="600">GIF</text>',
            voice: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>'
        };
        return icons[type] || '';
    }

    attachEventListeners() {
        // Add window resize listener to recalculate panel position when viewport changes
        window.addEventListener('resize', () => {
            if (this.state.isOpen) {
                this.updatePanelPosition();
            }
        });
        
        // Help form
        document.getElementById('widget-ticket-form')?.addEventListener('submit', (e) => this.submitHelpTicket(e));
        document.getElementById('widget-cancel-help')?.addEventListener('click', () => this.hideHelpForm());

        // Panel dropdowns
        document.getElementById('widget-fees-category')?.addEventListener('change', (e) => this.handleFeesSelection(e));
        document.getElementById('widget-admission-category')?.addEventListener('change', (e) => this.handleAdmissionSelection(e));
        document.getElementById('widget-scholarship-category')?.addEventListener('change', (e) => this.handleScholarshipSelection(e));

        // Welcome send button
        document.addEventListener('click', (e) => {
            if (e.target.closest('.welcome-send-btn')) {
                document.getElementById('widget-message-input')?.focus();
            }
        });
    }

    handleQuickAction(e) {
        const action = e.target.dataset.action;
        if (!action) return;

        if (action === 'help') {
            this.showHelpForm();
            this.addMessage("I'll create a help ticket for you. Please provide your name and contact number.", 'bot');
            return;
        }

        if (action === 'fees') {
            this.showFeesPanel();
            this.addMessage("Please choose your category from the dropdown to view the fee structure for your category.", 'bot');
            return;
        }

        if (action === 'admission') {
            this.promptAdmissionPanel();
            return;
        }

        if (action === 'scholarships') {
            this.showScholarshipPanel();
            this.addMessage("Please choose your category from the dropdown to view scholarships tailored for you.", 'bot');
            return;
        }

        this.hideAdmissionPanel();
        this.hideScholarshipPanel();
        this.hideFeesPanel();
        const preset = quickActionMap[action];
        if (preset) {
            this.sendQuickMessage(preset);
        }
    }

    sendQuickMessage(message) {
        const input = document.getElementById('widget-message-input');
        if (input) {
            input.value = message;
            this.sendMessage();
        }
    }

    showHelpForm() {
        const form = document.getElementById('widget-help-form');
        if (form) {
            form.classList.remove('hidden');
            this.widgetState.helpFormVisible = true;
        }
    }

    hideHelpForm() {
        const form = document.getElementById('widget-help-form');
        if (form) {
            form.classList.add('hidden');
            this.widgetState.helpFormVisible = false;
        }
    }

    async submitHelpTicket(e) {
        e.preventDefault();
        const name = document.getElementById('widget-help-name')?.value.trim();
        const contact = document.getElementById('widget-help-contact')?.value.trim();
        const query = document.getElementById('widget-help-query')?.value.trim();
        const topic = document.getElementById('widget-help-topic')?.value.trim();
        const pdfFile = document.getElementById('widget-help-pdf')?.files[0];

        if (!name || !contact || !query) {
            this.addMessage("Please fill all required fields to submit the help ticket.", 'bot');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('student_name', name);
            formData.append('contact', contact);
            formData.append('query', query);
            if (topic) {
                formData.append('topic', topic);
            }
            if (pdfFile) {
                formData.append('pdf_file', pdfFile);
            }

            const response = await fetch('/api/chatbot/help-ticket', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Unable to submit ticket.');

            this.addMessage(`Thanks ${name}! Your ticket (#${data.ticket.id}) has been created. We'll reach out soon.`, 'bot');
            this.hideHelpForm();
            document.getElementById('widget-ticket-form')?.reset();
        } catch (error) {
            this.addMessage(error.message, 'bot');
        }
    }

    showFeesPanel() {
        this.hideAdmissionPanel(false);
        this.hideScholarshipPanel(false);
        const panel = document.getElementById('widget-fees-panel');
        if (panel) {
            panel.classList.remove('hidden');
            this.widgetState.feesPanelVisible = true;
            this.loadFeeCategories(true); // Force refresh to get latest categories from admin
        }
    }

    hideFeesPanel(reset = true) {
        const panel = document.getElementById('widget-fees-panel');
        if (panel) {
            panel.classList.add('hidden');
            this.widgetState.feesPanelVisible = false;
            if (reset) {
                const select = document.getElementById('widget-fees-category');
                if (select) select.value = '';
            }
        }
    }

    handleFeesSelection(e) {
        const category = e.target.value;
        if (!category) return;
        this.fetchFeesInformation(category);
    }

    showAdmissionPanel() {
        this.hideScholarshipPanel(false);
        this.hideFeesPanel(false);
        const panel = document.getElementById('widget-admission-panel');
        if (panel) {
            panel.classList.remove('hidden');
            this.widgetState.admissionPanelVisible = true;
            this.widgetState.admissionPrompted = true;
        }
    }

    hideAdmissionPanel(reset = true) {
        const panel = document.getElementById('widget-admission-panel');
        if (panel) {
            panel.classList.add('hidden');
            this.widgetState.admissionPanelVisible = false;
            this.widgetState.admissionPrompted = false;
            if (reset) {
                const select = document.getElementById('widget-admission-category');
                if (select) select.value = '';
            }
        }
    }

    promptAdmissionPanel() {
        const shouldPrompt = !this.widgetState.admissionPrompted;
        this.showAdmissionPanel();
        if (shouldPrompt) {
            this.addMessage("Select your admission route from the dropdown to view required documents and process.", 'bot');
        }
    }

    async handleAdmissionSelection(e) {
        const category = e.target.value;
        if (!category) return;
        
        // Show loading message
        this.addMessage("Fetching admission documents...", 'bot');
        
        try {
            // Fetch documents from API
            const response = await fetch(`/api/chatbot/admission-documents?type=${encodeURIComponent(category)}`);
            const data = await response.json();
            
            if (data.formatted_text) {
                // Remove loading message and show actual documents
                const messagesArea = document.getElementById('chat-messages');
                const lastMessage = messagesArea.lastElementChild;
                if (lastMessage && lastMessage.textContent.includes("Fetching")) {
                    lastMessage.remove();
                }
                
                this.addMessage(data.formatted_text, 'bot');
            } else if (data.message) {
                // Remove loading message and show error/empty message
                const messagesArea = document.getElementById('chat-messages');
                const lastMessage = messagesArea.lastElementChild;
                if (lastMessage && lastMessage.textContent.includes("Fetching")) {
                    lastMessage.remove();
                }
                
                this.addMessage(data.message, 'bot');
            } else {
                // Fallback to hardcoded info if API fails
                const info = admissionInfoMap[category] || admissionInfoMap.default;
                const messagesArea = document.getElementById('chat-messages');
                const lastMessage = messagesArea.lastElementChild;
                if (lastMessage && lastMessage.textContent.includes("Fetching")) {
                    lastMessage.remove();
                }
                this.addMessage(info, 'bot');
            }
        } catch (error) {
            console.error('Error fetching admission documents:', error);
            // Remove loading message
            const messagesArea = document.getElementById('chat-messages');
            const lastMessage = messagesArea.lastElementChild;
            if (lastMessage && lastMessage.textContent.includes("Fetching")) {
                lastMessage.remove();
            }
            // Fallback to hardcoded info
            const info = admissionInfoMap[category] || admissionInfoMap.default;
            this.addMessage(info, 'bot');
        }
        
        this.hideAdmissionPanel(false);
    }

    showScholarshipPanel() {
        this.hideAdmissionPanel(false);
        this.hideFeesPanel(false);
        const panel = document.getElementById('widget-scholarship-panel');
        if (panel) {
            panel.classList.remove('hidden');
            this.widgetState.scholarshipPanelVisible = true;
            this.loadScholarshipCategories(true); // Force refresh to get latest categories from admin
        }
    }

    hideScholarshipPanel(reset = true) {
        const panel = document.getElementById('widget-scholarship-panel');
        if (panel) {
            panel.classList.add('hidden');
            this.widgetState.scholarshipPanelVisible = false;
            if (reset) {
                const select = document.getElementById('widget-scholarship-category');
                if (select) select.value = '';
            }
        }
    }

    async handleScholarshipSelection(e) {
        const category = e.target.value;
        if (!category) return;
        this.fetchScholarshipInformation(category);
    }

    async fetchScholarshipInformation(category) {
        this.showTypingIndicator();
        try {
            const data = await this.fetchChatbotData('/api/chatbot/scholarships', {
                category,
            });
            const text =
                data.formatted_text ||
                'No scholarships are configured for this category right now. Please check again later.';
            this.addMessage(text, 'bot');
        } catch (error) {
            this.addMessage(error.message, 'bot');
        } finally {
            this.hideTypingIndicator();
        }
    }

    toggleChat() {
        this.state.isOpen = !this.state.isOpen;
        const panel = document.getElementById('chat-panel');
        const button = document.getElementById('chat-widget-button');
        
        if (this.state.isOpen) {
            panel.style.display = 'flex';
            button.style.display = 'none';
            // Update panel position when opening to ensure it's within viewport
            this.updatePanelPosition();
            this.showWelcomeMessage();
            if (!this.welcomeShown) {
                setTimeout(() => {
                    this.showAutomatedWelcome();
                    this.welcomeShown = true;
                }, 1500);
            }
        } else {
            panel.style.display = 'none';
            button.style.display = 'flex';
        }
    }

    toggleExpand() {
        this.state.isExpanded = !this.state.isExpanded;
        const panel = document.getElementById('chat-panel');
        
        if (this.state.isExpanded) {
            panel.style.width = '556px';
            panel.style.height = '630px';
        } else {
            panel.style.width = '436px';
            panel.style.height = '600px';
        }
        
        // Recalculate panel position after size change to ensure it stays within viewport
        this.updatePanelPosition();
    }

    closeChat() {
        this.state.isOpen = false;
        const panel = document.getElementById('chat-panel');
        const button = document.getElementById('chat-widget-button');
        panel.style.display = 'none';
        button.style.display = 'flex';
        this.welcomeShown = false;
        this.hideHelpForm();
        this.hideFeesPanel();
        this.hideAdmissionPanel();
        this.hideScholarshipPanel();
    }

    showWelcomeMessage() {
        const messagesArea = document.getElementById('chat-messages');
        if (this.state.messages.length === 0) {
            messagesArea.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 40px; min-height: 200px;">
                    <h2 style="font-size: 24px; font-weight: bold; color: #2C2C2C; margin-bottom: 8px; text-align: center;">
                        Hi ${this.username || 'there'} 👋
                    </h2>
                    <p style="font-size: 18px; color: #2C2C2C; margin-bottom: 24px; text-align: center;">
                        How can we help?
                    </p>
                    <button class="welcome-send-btn" style="
                        padding: 12px 24px;
                        background: white;
                        border: 2px solid #E5E7EB;
                        border-radius: 999px;
                        color: #2C2C2C;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        margin-bottom: 8px;
                        transition: all 0.2s;
                    ">
                        <span>Send us a message</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </button>
                    <p style="font-size: 12px; color: #9CA3AF; text-align: center;">
                        We typically reply in a few minutes
                    </p>
                </div>
            `;
        }
    }

    showAutomatedWelcome() {
        const welcomeText = `Hello! I am your AI assistant for Mahatma Basweshwar Education Society's College of Engineering (COEA), Ambajogai. Ask me anything about fees, admissions, scholarships, library, hostel, or say 'I need help'.`;
        this.addMessage(welcomeText, 'bot');
    }

    addMessage(text, sender) {
        const messagesArea = document.getElementById('chat-messages');
        
        if (this.state.messages.length === 0 && messagesArea.querySelector('.welcome-send-btn')) {
            messagesArea.innerHTML = '';
        }

        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            display: flex;
            justify-content: ${sender === 'user' ? 'flex-end' : 'flex-start'};
            margin-bottom: 16px;
        `;

        const bubble = document.createElement('div');
        bubble.style.cssText = `
            max-width: 75%;
            padding: 12px 16px;
            border-radius: 16px;
            ${sender === 'user' 
                ? `background-color: ${this.primaryColor}; color: white; border-bottom-right-radius: 4px;`
                : 'background-color: #F3F4F6; color: #1F2937; border-bottom-left-radius: 4px;'
            }
            font-size: 14px;
            white-space: pre-wrap;
            word-wrap: break-word;
        `;

        if (sender === 'bot') {
            const label = document.createElement('div');
            label.style.cssText = 'font-size: 11px; color: #10B981; margin-bottom: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;';
            label.textContent = 'AI Transmission';
            bubble.appendChild(label);
        }

        const textNode = document.createTextNode(text);
        bubble.appendChild(textNode);

        const time = document.createElement('div');
        time.style.cssText = 'font-size: 12px; opacity: 0.7; margin-top: 4px;';
        time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        bubble.appendChild(time);

        messageDiv.appendChild(bubble);
        messagesArea.appendChild(messageDiv);
        messagesArea.scrollTop = messagesArea.scrollHeight;

        this.state.messages.push({ text, sender, timestamp: new Date() });
    }

    showTypingIndicator() {
        const messagesArea = document.getElementById('chat-messages');
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.style.cssText = 'display: flex; justify-content: flex-start; margin-bottom: 16px;';
        
        const bubble = document.createElement('div');
        bubble.style.cssText = 'background-color: #F3F4F6; padding: 12px 16px; border-radius: 16px; border-bottom-left-radius: 4px;';
        
        const dots = document.createElement('div');
        dots.style.cssText = 'display: flex; gap: 6px;';
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('span');
            dot.style.cssText = `
                width: 8px;
                height: 8px;
                background-color: #9CA3AF;
                border-radius: 50%;
                animation: bounce 1s infinite;
                animation-delay: ${i * 0.2}s;
            `;
            dots.appendChild(dot);
        }
        bubble.appendChild(dots);
        typingDiv.appendChild(bubble);
        messagesArea.appendChild(typingDiv);
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    hideTypingIndicator() {
        const typing = document.getElementById('typing-indicator');
        if (typing) typing.remove();
    }

    async sendMessage() {
        const input = document.getElementById('widget-message-input');
        const message = input.value.trim();
        
        if (!message || this.state.isTyping) return;

        // Check for "I need help"
        if (/i need help/i.test(message)) {
            this.showHelpForm();
        }

        input.value = '';
        this.addMessage(message, 'user');
        this.showTypingIndicator();
        this.state.isTyping = true;

        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get response');
            }

            this.hideTypingIndicator();
            this.addMessage(data.response || 'I apologize, but I could not process your request.', 'bot');
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage(error.message || 'Something went wrong. Please try again later.', 'bot');
        } finally {
            this.state.isTyping = false;
        }
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.chatWidget = new ChatWidget({
            apiEndpoint: '/api/chatbot/message',
            primaryColor: '#00D26A',
            collegeName: 'COLLEGE SUPPORT'
        });
    });
} else {
    window.chatWidget = new ChatWidget({
        apiEndpoint: '/api/chatbot/message',
        primaryColor: '#00D26A',
        collegeName: 'COLLEGE SUPPORT'
    });
}
