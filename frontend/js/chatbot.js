const chatbotState = {
    messageHistory: [],
    admissionPrompted: false,
    feesData: [],
    feesDropdownStatus: { loading: false, loaded: false },
    scholarshipsData: [],
    scholarshipsDropdownStatus: { loading: false, loaded: false },
    sessionId: null,
};
function getChatSessionId() {
    if (!chatbotState.sessionId) {
        const cryptoObj = window.crypto || window.msCrypto;
        if (cryptoObj?.randomUUID) {
            chatbotState.sessionId = cryptoObj.randomUUID();
        } else {
            chatbotState.sessionId = `sess_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
        }
    }
    return chatbotState.sessionId;
}


const quickActionMap = {
    fees: "Can you tell me about the fees structure?",
    admission: "What is the admission process?",
    scholarships: "Which scholarships are available?",
    library: "What are the library timings and facilities?",
    hostel: "Tell me about the hostel facilities.",
    faculty: "How can I contact the faculty?",
    events: "What events are happening on campus?",
};

function getApiBase() {
    if (
        window.location.origin &&
        window.location.origin !== "null" &&
        window.location.origin !== "file://"
    ) {
        return window.location.origin;
    }
    return window.__CHATBOT_API_BASE__ || "http://localhost:5000";
}

async function fetchChatbotData(endpoint, params = {}) {
    const base = getApiBase();
    const url =
        endpoint.startsWith("http://") || endpoint.startsWith("https://")
            ? new URL(endpoint)
            : new URL(endpoint, base);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && `${value}`.trim() !== "") {
            url.searchParams.append(key, value);
        }
    });

    const response = await fetch(url, { method: "GET" });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || "Unable to fetch latest information.");
    }
    return data;
}

function formatTimestamp() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(str = "") {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatMessageText(text = "") {
    const lines = text.split(/\n+/);
    let html = "";
    let inList = false;

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        if (/^[-•]/.test(trimmed)) {
            if (!inList) {
                html += "<ul class=\"message-list\">";
                inList = true;
            }
            const content = escapeHtml(trimmed.replace(/^[-•]\s*/, ""));
            html += `<li>${content}</li>`;
        } else {
            if (inList) {
                html += "</ul>";
                inList = false;
            }
            html += `<p>${escapeHtml(trimmed)}</p>`;
        }
    });

    if (inList) {
        html += "</ul>";
    }

    return html || `<p>${escapeHtml(text)}</p>`;
}

function displayMessage(text, sender = "bot") {
    const chatWindow = document.getElementById("chat-window");
    if (!chatWindow) return;

    const message = document.createElement("div");
    message.classList.add("message", sender);

    if (sender === "bot") {
        const label = document.createElement("div");
        label.className = "transmission-label";
        label.textContent = "AI Transmission";
        message.appendChild(label);
    }

    const body = document.createElement("div");
    body.className = "message-body";
    message.appendChild(body);

    const timestamp = document.createElement("time");
    timestamp.textContent = formatTimestamp();
    message.appendChild(timestamp);

    chatWindow.appendChild(message);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    if (sender === "bot") {
        animateMessageWords(body, text);
    } else {
        body.innerHTML = formatMessageText(text);
    }
}

function animateMessageWords(container, text = "") {
    const chatWindow = document.getElementById("chat-window");
    const tokens = text.match(/\S+\s*/g) || [];

    if (!tokens.length) {
        container.innerHTML = formatMessageText(text);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        return;
    }

    let rendered = "";
    let index = 0;

    const interval = setInterval(() => {
        rendered += tokens[index];
        container.innerHTML = formatMessageText(rendered);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        index += 1;

        if (index >= tokens.length) {
            clearInterval(interval);
        }
    }, 150);
}

function showTypingIndicator() {
    const typing = document.getElementById("typing-indicator");
    typing?.classList.remove("hidden");
}

function hideTypingIndicator() {
    const typing = document.getElementById("typing-indicator");
    typing?.classList.add("hidden");
}

async function sendMessage(messageText) {
    const input = document.getElementById("user-message");
    input.value = "";

    displayMessage(messageText, "user");
    showTypingIndicator();

    try {
        const response = await fetch("/api/chatbot/message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: messageText, sessionId: getChatSessionId() }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to fetch response.");
        if (data.sessionId) {
            chatbotState.sessionId = data.sessionId;
        }
        displayMessage(data.response, "bot");
    } catch (error) {
        displayMessage(error.message, "bot");
    } finally {
        hideTypingIndicator();
    }
}

function handleFormSubmit(event) {
    event.preventDefault();
    const message = document.getElementById("user-message").value.trim();
    if (!message) return;

    if (/i need help/i.test(message)) {
        showHelpForm();
    }

    maybeHandleAdmissionQuery(message);

    sendMessage(message);
}

function handleQuickAction(event) {
    const action = event.target.dataset.action;
    if (!action) return;
    if (action === "help") {
        showHelpForm();
        displayMessage(
            "I'll create a help ticket for you. Please provide your name and contact number.",
            "bot"
        );
        return;
    }
    if (action === "fees") {
        showFeesPanel();
        displayMessage(
            "Please choose your category from the dropdown to view the fee structure for your category.",
            "bot"
        );
        return;
    }
    if (action === "admission") {
        promptAdmissionPanel();
        return;
    }
    if (action === "scholarships") {
        showScholarshipPanel();
        displayMessage(
            "Please choose your category from the dropdown to view scholarships tailored for you.",
            "bot"
        );
        return;
    }
    hideAdmissionPanel();
    hideScholarshipPanel();
    hideFeesPanel();
    const preset = quickActionMap[action];
    if (preset) {
        sendMessage(preset);
    }
}

function showHelpForm() {
    document.getElementById("help-form")?.classList.remove("hidden");
}

function hideHelpForm() {
    document.getElementById("help-form")?.classList.add("hidden");
}

async function submitHelpTicket(event) {
    event.preventDefault();
    const name = document.getElementById("help-name").value.trim();
    const contact = document.getElementById("help-contact").value.trim();
    const query = document.getElementById("help-query").value.trim();

    if (!name || !contact || !query) {
        displayMessage("Please fill all fields to submit the help ticket.", "bot");
        return;
    }

    try {
        const response = await fetch("/api/chatbot/help-ticket", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ student_name: name, contact, query }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to submit ticket.");
        displayMessage(
            `Thanks ${name}! Your ticket (#${data.ticket.id}) has been created. We'll reach out soon.`,
            "bot"
        );
        hideHelpForm();
        document.getElementById("ticket-form").reset();
    } catch (error) {
        displayMessage(error.message, "bot");
    }
}

function clearChat() {
    const chatWindow = document.getElementById("chat-window");
    chatWindow.innerHTML = "";
    hideAdmissionPanel();
    hideScholarshipPanel();
    hideFeesPanel();
    displayWelcomeMessage();
}

function displayWelcomeMessage() {
    displayMessage(
        "Hello! I am your AI assistant for Government Polytechnic, Ambajogai. Ask me anything about fees, admissions, scholarships, library, hostel, or say 'I need help'.",
        "bot"
    );
}

function initChatbot() {
    document.getElementById("chat-form")?.addEventListener("submit", handleFormSubmit);
    document.getElementById("clear-chat")?.addEventListener("click", clearChat);
    document
        .querySelectorAll(".quick-actions button")
        .forEach((btn) => btn.addEventListener("click", handleQuickAction));
    document.getElementById("ticket-form")?.addEventListener("submit", submitHelpTicket);
    document.getElementById("cancel-help")?.addEventListener("click", hideHelpForm);
    document
        .getElementById("scholarship-category")
        ?.addEventListener("change", handleScholarshipSelection);
    document
        .getElementById("admission-category")
        ?.addEventListener("change", handleAdmissionSelection);
    document
        .getElementById("fees-category")
        ?.addEventListener("change", handleFeesSelection);
    displayWelcomeMessage();
    initializeFeesDropdown();
    initializeScholarshipDropdown();
}

function promptAdmissionPanel() {
    const shouldPrompt = !chatbotState.admissionPrompted;
    showAdmissionPanel();
    if (shouldPrompt) {
        displayMessage(
            "Select your admission route from the dropdown to view required documents and process.",
            "bot"
        );
    }
}

function showScholarshipPanel() {
    hideAdmissionPanel(false);
    hideFeesPanel(false);
    const panel = document.getElementById("scholarship-panel");
    panel?.classList.remove("hidden");
    initializeScholarshipDropdown(true); // Force refresh to get latest categories from admin
}

function hideScholarshipPanel(reset = true) {
    const panel = document.getElementById("scholarship-panel");
    if (!panel) return;
    panel.classList.add("hidden");
    if (reset) {
        const select = document.getElementById("scholarship-category");
        if (select) {
            select.value = "";
        }
    }
}

function handleScholarshipSelection(event) {
    const category = event.target.value;
    if (!category) return;
    fetchScholarshipInformation(category);
}

function showAdmissionPanel() {
    hideScholarshipPanel(false);
    hideFeesPanel(false);
    const panel = document.getElementById("admission-panel");
    panel?.classList.remove("hidden");
    chatbotState.admissionPrompted = true;
}

function hideAdmissionPanel(reset = true) {
    const panel = document.getElementById("admission-panel");
    if (!panel) return;
    panel.classList.add("hidden");
    chatbotState.admissionPrompted = false;
    if (reset) {
        const select = document.getElementById("admission-category");
        if (select) {
            select.value = "";
        }
    }
}

function handleAdmissionSelection(event) {
    const category = event.target.value;
    if (!category) return;
    fetchAdmissionInformation(category);
}

function maybeHandleAdmissionQuery(message = "") {
    if (isAdmissionQuery(message)) {
        promptAdmissionPanel();
    } else {
        hideAdmissionPanel();
    }
}

function isAdmissionQuery(text = "") {
    return /(admission|admit|enroll|enquiry|document|requirement)/i.test(text);
}

function showFeesPanel() {
    hideAdmissionPanel(false);
    hideScholarshipPanel(false);
    const panel = document.getElementById("fees-panel");
    panel?.classList.remove("hidden");
    initializeFeesDropdown(true); // Force refresh to get latest categories from admin
}

function hideFeesPanel(reset = true) {
    const panel = document.getElementById("fees-panel");
    if (!panel) return;
    panel.classList.add("hidden");
    if (reset) {
        const select = document.getElementById("fees-category");
        if (select) {
            select.value = "";
        }
    }
}

function handleFeesSelection(event) {
    const category = event.target.value;
    if (!category) return;
    fetchFeesInformation(category);
}

async function fetchAdmissionInformation(category) {
    showTypingIndicator();
    try {
        const data = await fetchChatbotData("/api/chatbot/admission-documents", {
            type: category,
        });
        const text =
            data.formatted_text ||
            "No admission information is available for the selected route right now.";
        displayMessage(text, "bot");
    } catch (error) {
        displayMessage(error.message, "bot");
    } finally {
        hideTypingIndicator();
    }
}

async function fetchFeesInformation(category) {
    showTypingIndicator();
    try {
        const data = await fetchChatbotData("/api/chatbot/fees", {
            category,
        });
        const text =
            data.formatted_text || "Fee details are not available for this category right now.";
        displayMessage(text, "bot");
    } catch (error) {
        displayMessage(error.message, "bot");
    } finally {
        hideTypingIndicator();
    }
}

async function fetchScholarshipInformation(category) {
    showTypingIndicator();
    try {
        const data = await fetchChatbotData("/api/chatbot/scholarships", {
            category,
        });
        const text =
            data.formatted_text ||
            "No scholarships are configured for this category right now. Please check again later.";
        displayMessage(text, "bot");
    } catch (error) {
        displayMessage(error.message, "bot");
    } finally {
        hideTypingIndicator();
    }
}

document.addEventListener("DOMContentLoaded", initChatbot);

function formatCategoryLabel(category = "") {
    const cleaned = category.replace(/_/g, " ").trim();
    if (!cleaned) return "General";
    return cleaned
        .toLowerCase()
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function setFeesSelectState(select, message, disabled = true) {
    if (!select) return;
    select.innerHTML = `<option value="">${message}</option>`;
    select.disabled = disabled;
}

async function initializeFeesDropdown(forceRefresh = false) {
    const select = document.getElementById("fees-category");
    if (!select) {
        return;
    }

    // Allow refresh if forceRefresh is true, otherwise skip if already loaded and not loading
    if (!forceRefresh && (chatbotState.feesDropdownStatus.loading || chatbotState.feesDropdownStatus.loaded)) {
        return;
    }

    chatbotState.feesDropdownStatus.loading = true;
    setFeesSelectState(select, "Loading categories...");

    try {
        const data = await fetchChatbotData("/api/chatbot/fees");
        const fees = data.fees || [];
        chatbotState.feesData = fees;

        if (!fees.length) {
            setFeesSelectState(select, "No fee categories configured");
            chatbotState.feesDropdownStatus.loaded = true;
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
                const option = document.createElement("option");
                option.value = value;
                option.textContent = label;
                select.appendChild(option);
            });
        select.disabled = false;
        chatbotState.feesDropdownStatus.loaded = true;
    } catch (error) {
        console.error("Failed to load fee categories:", error);
        setFeesSelectState(select, "Unable to load categories");
    } finally {
        chatbotState.feesDropdownStatus.loading = false;
    }
}

function setScholarshipSelectState(select, message) {
    if (!select) return;
    select.innerHTML = `<option value="">${message}</option>`;
    select.disabled = message !== "Choose a category";
}

async function initializeScholarshipDropdown(forceRefresh = false) {
    const select = document.getElementById("scholarship-category");
    if (!select) {
        return;
    }

    // Allow refresh if forceRefresh is true, otherwise skip if already loaded and not loading
    if (!forceRefresh && (chatbotState.scholarshipsDropdownStatus.loading || chatbotState.scholarshipsDropdownStatus.loaded)) {
        return;
    }

    chatbotState.scholarshipsDropdownStatus.loading = true;
    setScholarshipSelectState(select, "Loading categories...");

    try {
        const data = await fetchChatbotData("/api/chatbot/scholarships");
        const scholarships = data.scholarships || [];
        chatbotState.scholarshipsData = scholarships;

        if (!scholarships.length) {
            setScholarshipSelectState(select, "No scholarship categories configured");
            chatbotState.scholarshipsDropdownStatus.loaded = true;
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
                const option = document.createElement("option");
                option.value = value;
                option.textContent = label;
                select.appendChild(option);
            });
        select.disabled = false;
        chatbotState.scholarshipsDropdownStatus.loaded = true;
    } catch (error) {
        console.error("Failed to load scholarship categories:", error);
        setScholarshipSelectState(select, "Unable to load categories");
    } finally {
        chatbotState.scholarshipsDropdownStatus.loading = false;
    }
}
