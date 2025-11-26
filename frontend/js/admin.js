const ADMIN_API = "/api/admin";

const adminState = {
    currentSection: "dashboard",
    editingEntity: null,
    modalContext: null,
};

// ------------------------ Core Helpers ------------------------
async function apiCall(endpoint, method = "GET", data) {
    const options = {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    };
    if (data) options.body = JSON.stringify(data);

    const res = await fetch(`${ADMIN_API}${endpoint}`, options);
    let body = {};
    try {
        body = await res.json();
    } catch (_) {}

    if (!res.ok) {
        const message = body.error || `Request failed (${res.status})`;
        throw new Error(message);
    }
    return body;
}

function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3500);
}

function confirmDelete(message = "Are you sure you want to delete this item?") {
    return window.confirm(message);
}

function setBreadcrumb(text) {
    const el = document.getElementById("breadcrumbs");
    if (el) el.textContent = text;
}

// ------------------------ Auth & Layout ------------------------
async function checkAuth() {
    try {
        const data = await apiCall("/check-auth", "GET");
        if (!data.authenticated) {
            window.location.href = "login.html";
            return;
        }
        document.getElementById("admin-name").textContent = `Welcome, ${data.admin.username}`;
    } catch (_) {
        window.location.href = "login.html";
    }
}

async function handleLogout() {
    try {
        await apiCall("/logout", "POST");
        localStorage.removeItem("gp_admin_session");
    } catch (_) {
        // ignore
    } finally {
        window.location.href = "login.html";
    }
}

function switchSection(id) {
    adminState.currentSection = id;
    document.querySelectorAll(".content-panel").forEach((panel) => {
        panel.classList.toggle("active", panel.id === id);
    });
    document.querySelectorAll(".nav-link").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.section === id);
    });
    setBreadcrumb(
        id
            .split("-")
            .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
            .join(" ")
    );
}

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    sidebar?.classList.toggle("open");
}

// ------------------------ Modal System ------------------------
function hideModal() {
    adminState.modalContext = null;
    const overlay = document.getElementById("modal-overlay");
    const form = document.getElementById("modal-form");
    if (overlay) overlay.classList.add("hidden");
    if (form) form.innerHTML = "";
}

function openModal(title, innerHtml, onSubmit) {
    const overlay = document.getElementById("modal-overlay");
    const titleEl = document.getElementById("modal-title");
    const form = document.getElementById("modal-form");
    if (!overlay || !titleEl || !form) return;

    titleEl.textContent = title;
    form.innerHTML = innerHtml;
    overlay.classList.remove("hidden");

    adminState.modalContext = { onSubmit };
}

function handleModalSubmit(event) {
    event.preventDefault();
    if (!adminState.modalContext?.onSubmit) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {};
    for (const [key, val] of formData.entries()) {
        payload[key] = val;
    }
    adminState.modalContext.onSubmit(payload);
}

// ------------------------ Fees Management ------------------------
async function loadFeesData() {
    try {
        const filter = document.getElementById("fees-filter").value;
        const query = filter ? `?category=${encodeURIComponent(filter)}` : "";
        const data = await apiCall(`/fees${query}`);

        const tbody = document.getElementById("fees-table");
        tbody.innerHTML = "";
        data.forEach((row) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${row.category}</td>
                <td>₹${row.total_fees.toFixed(2)}</td>
                <td>${row.updated_at ? new Date(row.updated_at).toLocaleDateString() : "-"}</td>
                <td>
                    <button class="ghost-btn" data-action="edit-fees" data-id="${row.id}">Edit</button>
                    <button class="ghost-btn" data-action="delete-fees" data-id="${row.id}">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        showToast(err.message, "error");
    }
}

function buildFeesForm(data = {}) {
    const defaults = {
        category: data.category || "",
        prospectus_fees: data.prospectus_fees || 0,
        tuition_fees: data.tuition_fees || 0,
        development_fees: data.development_fees || 0,
        training_placement_fees: data.training_placement_fees || 0,
        iste_fees: data.iste_fees || 0,
        library_lab_fees: data.library_lab_fees || 0,
        student_insurance: data.student_insurance || 0,
    };
    return `
        <div class="form-grid">
            <label>Category
                <input name="category" value="${defaults.category}" placeholder="OPEN" required />
            </label>
            <label>Prospectus Fees
                <input type="number" step="0.01" name="prospectus_fees" value="${defaults.prospectus_fees}" />
            </label>
            <label>Tuition Fees
                <input type="number" step="0.01" name="tuition_fees" value="${defaults.tuition_fees}" />
            </label>
            <label>Development Fees
                <input type="number" step="0.01" name="development_fees" value="${defaults.development_fees}" />
            </label>
            <label>Training & Placement
                <input type="number" step="0.01" name="training_placement_fees" value="${defaults.training_placement_fees}" />
            </label>
            <label>ISTE Fees
                <input type="number" step="0.01" name="iste_fees" value="${defaults.iste_fees}" />
            </label>
            <label>Library/Lab Fees
                <input type="number" step="0.01" name="library_lab_fees" value="${defaults.library_lab_fees}" />
            </label>
            <label>Student Insurance
                <input type="number" step="0.01" name="student_insurance" value="${defaults.student_insurance}" />
            </label>
            <button type="submit" class="primary-btn">Save</button>
        </div>
    `;
}

function addFees() {
    openModal("Add Fees Structure", buildFeesForm(), async (payload) => {
        const numericFields = [
            "prospectus_fees",
            "tuition_fees",
            "development_fees",
            "training_placement_fees",
            "iste_fees",
            "library_lab_fees",
            "student_insurance",
        ];
        numericFields.forEach((f) => (payload[f] = parseFloat(payload[f] || 0)));
        try {
            await apiCall("/fees", "POST", payload);
            showToast("Fees structure added.", "success");
            hideModal();
            loadFeesData();
        } catch (err) {
            showToast(err.message, "error");
        }
    });
}

async function editFees(id) {
    try {
        const all = await apiCall("/fees", "GET");
        const fee = all.find((f) => f.id === Number(id));
        if (!fee) return;
        openModal("Edit Fees Structure", buildFeesForm(fee), async (payload) => {
            const numericFields = [
                "prospectus_fees",
                "tuition_fees",
                "development_fees",
                "training_placement_fees",
                "iste_fees",
                "library_lab_fees",
                "student_insurance",
            ];
            numericFields.forEach((f) => (payload[f] = parseFloat(payload[f] || 0)));
            try {
                await apiCall(`/fees/${id}`, "PUT", payload);
                showToast("Fees structure updated.", "success");
                hideModal();
                loadFeesData();
            } catch (err) {
                showToast(err.message, "error");
            }
        });
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function deleteFees(id) {
    if (!confirmDelete()) return;
    try {
        await apiCall(`/fees/${id}`, "DELETE");
        showToast("Fees structure deleted.", "success");
        loadFeesData();
    } catch (err) {
        showToast(err.message, "error");
    }
}

// ------------------------ Documents ------------------------
async function loadDocuments() {
    const container = document.getElementById("documents-list");
    container.innerHTML = "";

    const tabs = document.querySelectorAll("[data-doc-tab]");
    const activeTab = Array.from(tabs).find((t) => t.classList.contains("active"));
    const type = activeTab ? activeTab.dataset.docTab : "12th";

    try {
        const docs = await apiCall(`/documents?type=${encodeURIComponent(type)}`);
        docs.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

        docs.forEach((doc) => {
            const row = document.createElement("div");
            row.className = "document-item";
            row.draggable = true;
            row.dataset.id = doc.id;
            row.innerHTML = `
                <span>
                    <input type="checkbox" ${doc.is_required ? "checked" : ""} data-action="toggle-doc-required" data-id="${doc.id}" />
                    ${doc.document_name}
                </span>
                <div>
                    <button class="ghost-btn" data-action="edit-doc" data-id="${doc.id}">Edit</button>
                    <button class="ghost-btn" data-action="delete-doc" data-id="${doc.id}">Delete</button>
                </div>
            `;
            container.appendChild(row);
        });
    } catch (err) {
        showToast(err.message, "error");
    }
}

function buildDocumentForm(data = {}, type = "12th") {
    return `
        <div class="form-grid">
            <label>Admission Type
                <select name="admission_type">
                    <option value="12th" ${type === "12th" ? "selected" : ""}>12th Based</option>
                    <option value="Diploma" ${type === "Diploma" ? "selected" : ""}>Diploma</option>
                    <option value="Management" ${type === "Management" ? "selected" : ""}>Management Quota</option>
                    <option value="BSc" ${type === "BSc" ? "selected" : ""}>BSc</option>
                </select>
            </label>
            <label>Document Name
                <input name="document_name" value="${data.document_name || ""}" required />
            </label>
            <label>Display Order
                <input type="number" name="display_order" value="${data.display_order || 0}" />
            </label>
            <label>
                <input type="checkbox" name="is_required" ${data.is_required ?? true ? "checked" : ""} />
                Required
            </label>
            <button type="submit" class="primary-btn">Save</button>
        </div>
    `;
}

function addDocument() {
    const activeTab = document.querySelector("[data-doc-tab].active");
    const type = activeTab ? activeTab.dataset.docTab : "12th";
    openModal("Add Admission Document", buildDocumentForm({}, type), async (payload) => {
        payload.display_order = parseInt(payload.display_order || 0, 10);
        payload.is_required = !!payload.is_required;
        try {
            await apiCall("/documents", "POST", payload);
            showToast("Document added.", "success");
            hideModal();
            loadDocuments();
        } catch (err) {
            showToast(err.message, "error");
        }
    });
}

async function editDocument(id) {
    try {
        const all = await apiCall("/documents", "GET");
        const doc = all.find((d) => d.id === Number(id));
        if (!doc) return;
        openModal("Edit Admission Document", buildDocumentForm(doc, doc.admission_type), async (payload) => {
            payload.display_order = parseInt(payload.display_order || 0, 10);
            payload.is_required = !!payload.is_required;
            try {
                await apiCall(`/documents/${id}`, "PUT", payload);
                showToast("Document updated.", "success");
                hideModal();
                loadDocuments();
            } catch (err) {
                showToast(err.message, "error");
            }
        });
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function toggleDocumentRequired(id, checked) {
    try {
        await apiCall(`/documents/${id}`, "PUT", { is_required: checked });
        loadDocuments();
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function deleteDocument(id) {
    if (!confirmDelete()) return;
    try {
        await apiCall(`/documents/${id}`, "DELETE");
        showToast("Document deleted.", "success");
        loadDocuments();
    } catch (err) {
        showToast(err.message, "error");
    }
}

// ------------------------ Library ------------------------
async function loadLibrary() {
    await Promise.all([loadLibraryBooks(), loadLibraryTimings()]);
}

async function loadLibraryBooks() {
    try {
        const books = await apiCall("/library/books");
        const tbody = document.getElementById("library-books-table");
        tbody.innerHTML = "";
        books.forEach((book) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${book.category}</td>
                <td>${book.book_count}</td>
                <td>${book.is_active ? "Active" : "Inactive"}</td>
                <td>
                    <button class="ghost-btn" data-action="edit-book" data-id="${book.id}">Edit</button>
                    <button class="ghost-btn" data-action="delete-book" data-id="${book.id}">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function loadLibraryTimings() {
    try {
        const timings = await apiCall("/library/timings", "GET");
        const form = document.getElementById("library-timings-form");
        if (!timings || !form) return;
        Object.keys(timings).forEach((key) => {
            if (form.elements[key]) form.elements[key].value = timings[key];
        });
    } catch (_) {
        // ignore until timings exist
    }
}

function addLibraryBook() {
    openModal(
        "Add Library Category",
        `
        <div class="form-grid">
            <label>Category
                <input name="category" required />
            </label>
            <label>Book Count
                <input type="number" name="book_count" value="0" />
            </label>
            <label>
                <input type="checkbox" name="is_active" checked /> Active
            </label>
            <button type="submit" class="primary-btn">Save</button>
        </div>
        `,
        async (payload) => {
            payload.book_count = parseInt(payload.book_count || 0, 10);
            payload.is_active = !!payload.is_active;
            try {
                await apiCall("/library/books", "POST", payload);
                showToast("Library category added.", "success");
                hideModal();
                loadLibraryBooks();
            } catch (err) {
                showToast(err.message, "error");
            }
        }
    );
}

async function editLibraryBook(id) {
    try {
        const books = await apiCall("/library/books", "GET");
        const book = books.find((b) => b.id === Number(id));
        if (!book) return;
        openModal(
            "Edit Library Category",
            `
            <div class="form-grid">
                <label>Category
                    <input name="category" value="${book.category}" required />
                </label>
                <label>Book Count
                    <input type="number" name="book_count" value="${book.book_count}" />
                </label>
                <label>
                    <input type="checkbox" name="is_active" ${book.is_active ? "checked" : ""} /> Active
                </label>
                <button type="submit" class="primary-btn">Save</button>
            </div>
            `,
            async (payload) => {
                payload.book_count = parseInt(payload.book_count || 0, 10);
                payload.is_active = !!payload.is_active;
                try {
                    await apiCall(`/library/books/${id}`, "PUT", payload);
                    showToast("Library category updated.", "success");
                    hideModal();
                    loadLibraryBooks();
                } catch (err) {
                    showToast(err.message, "error");
                }
            }
        );
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function deleteLibraryBook(id) {
    if (!confirmDelete()) return;
    try {
        await apiCall(`/library/books/${id}`, "DELETE");
        showToast("Library category deleted.", "success");
        loadLibraryBooks();
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function saveLibraryTimings(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = {};
    Array.from(form.elements).forEach((el) => {
        if (el.name) payload[el.name] = el.value;
    });
    try {
        await apiCall("/library/timings", "PUT", payload);
        showToast("Library timings saved.", "success");
    } catch (err) {
        showToast(err.message, "error");
    }
}

// ------------------------ Hostel ------------------------
async function loadHostel() {
    try {
        const data = await apiCall("/hostel", "GET");
        const container = document.getElementById("hostel-list");
        container.innerHTML = "";
        data.forEach((item) => {
            const card = document.createElement("article");
            card.className = "facility-card";
            card.innerHTML = `
                <h4>${item.facility_name}</h4>
                <p>Status: ${item.is_available ? "Available" : "Not Available"}</p>
                <p>Hostel Fees: ₹${item.hostel_fees_per_semester.toFixed(2)} / semester</p>
                <p>Mess Fees: ₹${item.mess_fees_per_month.toFixed(2)} / month</p>
                <button class="ghost-btn" data-action="edit-hostel" data-id="${item.id}">Edit</button>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function editHostel(id) {
    try {
        const all = await apiCall("/hostel", "GET");
        const item = all.find((h) => h.id === Number(id));
        if (!item) return;
        openModal(
            "Edit Hostel Facility",
            `
            <div class="form-grid">
                <label>Facility Name
                    <input name="facility_name" value="${item.facility_name}" required />
                </label>
                <label>Hostel Fees / Semester
                    <input type="number" step="0.01" name="hostel_fees_per_semester" value="${item.hostel_fees_per_semester}" />
                </label>
                <label>Mess Fees / Month
                    <input type="number" step="0.01" name="mess_fees_per_month" value="${item.mess_fees_per_month}" />
                </label>
                <label>
                    <input type="checkbox" name="is_available" ${item.is_available ? "checked" : ""} /> Available
                </label>
                <button type="submit" class="primary-btn">Save</button>
            </div>
            `,
            async (payload) => {
                payload.hostel_fees_per_semester = parseFloat(
                    payload.hostel_fees_per_semester || 0
                );
                payload.mess_fees_per_month = parseFloat(payload.mess_fees_per_month || 0);
                payload.is_available = !!payload.is_available;
                try {
                    await apiCall(`/hostel/${id}`, "PUT", payload);
                    showToast("Hostel facility updated.", "success");
                    hideModal();
                    loadHostel();
                } catch (err) {
                    showToast(err.message, "error");
                }
            }
        );
    } catch (err) {
        showToast(err.message, "error");
    }
}

// ------------------------ Scholarships ------------------------
async function loadScholarships() {
    try {
        const filter = document.getElementById("scholarship-filter").value;
        const query = filter ? `?category=${encodeURIComponent(filter)}` : "";
        const data = await apiCall(`/scholarships${query}`);
        const tbody = document.getElementById("scholarship-table");
        tbody.innerHTML = "";
        data.forEach((item) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${item.scholarship_name}</td>
                <td>${item.category}</td>
                <td>${item.amount}</td>
                <td>${item.is_active ? "Active" : "Inactive"}</td>
                <td>
                    <button class="ghost-btn" data-action="edit-scholarship" data-id="${item.id}">Edit</button>
                    <button class="ghost-btn" data-action="delete-scholarship" data-id="${item.id}">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        showToast(err.message, "error");
    }
}

function buildScholarshipForm(data = {}) {
    return `
        <div class="form-grid">
            <label>Name
                <input name="scholarship_name" value="${data.scholarship_name || ""}" required />
            </label>
            <label>Category
                <input name="category" value="${data.category || ""}" placeholder="SC / ST / OBC / EWS" required />
            </label>
            <label>Amount
                <input name="amount" value="${data.amount || ""}" />
            </label>
            <label>Eligibility
                <textarea name="eligibility" rows="3" required>${data.eligibility || ""}</textarea>
            </label>
            <label>Documents Required
                <textarea name="documents_required" rows="3">${data.documents_required || ""}</textarea>
            </label>
            <label>
                <input type="checkbox" name="is_active" ${data.is_active ?? true ? "checked" : ""} /> Active
            </label>
            <button type="submit" class="primary-btn">Save</button>
        </div>
    `;
}

function addScholarship() {
    openModal("Add Scholarship", buildScholarshipForm(), async (payload) => {
        payload.is_active = !!payload.is_active;
        try {
            await apiCall("/scholarships", "POST", payload);
            showToast("Scholarship added.", "success");
            hideModal();
            loadScholarships();
        } catch (err) {
            showToast(err.message, "error");
        }
    });
}

async function editScholarship(id) {
    try {
        const all = await apiCall("/scholarships", "GET");
        const item = all.find((s) => s.id === Number(id));
        if (!item) return;
        openModal("Edit Scholarship", buildScholarshipForm(item), async (payload) => {
            payload.is_active = !!payload.is_active;
            try {
                await apiCall(`/scholarships/${id}`, "PUT", payload);
                showToast("Scholarship updated.", "success");
                hideModal();
                loadScholarships();
            } catch (err) {
                showToast(err.message, "error");
            }
        });
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function deleteScholarship(id) {
    if (!confirmDelete()) return;
    try {
        await apiCall(`/scholarships/${id}`, "DELETE");
        showToast("Scholarship deleted.", "success");
        loadScholarships();
    } catch (err) {
        showToast(err.message, "error");
    }
}

// ------------------------ Faculty ------------------------
async function loadFaculty() {
    try {
        const data = await apiCall("/faculty", "GET");
        const tbody = document.getElementById("faculty-table");
        tbody.innerHTML = "";
        data.forEach((member) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${member.name}</td>
                <td>${member.department}</td>
                <td>${member.designation}</td>
                <td>${member.contact}</td>
                <td>
                    <button class="ghost-btn" data-action="edit-faculty" data-id="${member.id}">Edit</button>
                    <button class="ghost-btn" data-action="delete-faculty" data-id="${member.id}">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        showToast(err.message, "error");
    }
}

function buildFacultyForm(data = {}) {
    return `
        <div class="form-grid">
            <label>Name
                <input name="name" value="${data.name || ""}" required />
            </label>
            <label>Department
                <input name="department" value="${data.department || ""}" placeholder="Computer / IT / Mechanical" required />
            </label>
            <label>Designation
                <input name="designation" value="${data.designation || ""}" required />
            </label>
            <label>Subjects Taught
                <textarea name="subjects_taught" rows="3">${data.subjects_taught || ""}</textarea>
            </label>
            <label>Contact
                <input name="contact" value="${data.contact || ""}" />
            </label>
            <label>Email
                <input type="email" name="email" value="${data.email || ""}" />
            </label>
            <label>Photo URL
                <input type="url" name="photo_url" value="${data.photo_url || ""}" />
            </label>
            <button type="submit" class="primary-btn">Save</button>
        </div>
    `;
}

function addFaculty() {
    openModal("Add Faculty", buildFacultyForm(), async (payload) => {
        try {
            await apiCall("/faculty", "POST", payload);
            showToast("Faculty added.", "success");
            hideModal();
            loadFaculty();
        } catch (err) {
            showToast(err.message, "error");
        }
    });
}

async function editFaculty(id) {
    try {
        const all = await apiCall("/faculty", "GET");
        const item = all.find((f) => f.id === Number(id));
        if (!item) return;
        openModal("Edit Faculty", buildFacultyForm(item), async (payload) => {
            try {
                await apiCall(`/faculty/${id}`, "PUT", payload);
                showToast("Faculty updated.", "success");
                hideModal();
                loadFaculty();
            } catch (err) {
                showToast(err.message, "error");
            }
        });
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function deleteFaculty(id) {
    if (!confirmDelete()) return;
    try {
        await apiCall(`/faculty/${id}`, "DELETE");
        showToast("Faculty deleted.", "success");
        loadFaculty();
    } catch (err) {
        showToast(err.message, "error");
    }
}

// ------------------------ Principal ------------------------
async function loadPrincipal() {
    try {
        const data = await apiCall("/principal", "GET");
        const form = document.getElementById("principal-form");
        if (!data || !Object.keys(data).length || !form) return;
        Object.keys(data).forEach((key) => {
            if (form.elements[key]) form.elements[key].value = data[key];
        });
    } catch (_) {
        // ignore until created
    }
}

async function savePrincipal(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = {};
    Array.from(form.elements).forEach((el) => {
        if (el.name) payload[el.name] = el.value;
    });
    try {
        await apiCall("/principal", "PUT", payload);
        showToast("Principal info saved.", "success");
    } catch (err) {
        showToast(err.message, "error");
    }
}

// ------------------------ Events ------------------------
async function loadEvents() {
    try {
        const filter = document.getElementById("events-filter").value;
        const query = filter ? `?type=${encodeURIComponent(filter)}` : "";
        const data = await apiCall(`/events${query}`);
        const list = document.getElementById("events-list");
        const dashboardList = document.getElementById("upcoming-events");
        list.innerHTML = "";
        dashboardList.innerHTML = "";

        data.forEach((event) => {
            const li = document.createElement("li");
            li.innerHTML = `<strong>${event.event_name}</strong> (${event.event_type}) - ${event.event_date}`;
            list.appendChild(li);
            dashboardList.appendChild(li.cloneNode(true));
        });

        document.getElementById("stat-events").textContent = data.length;
    } catch (err) {
        showToast(err.message, "error");
    }
}

function buildEventForm(data = {}) {
    return `
        <div class="form-grid">
            <label>Event Name
                <input name="event_name" value="${data.event_name || ""}" required />
            </label>
            <label>Type
                <input name="event_type" value="${data.event_type || ""}" placeholder="Cultural / Sports / Technical / Academic" required />
            </label>
            <label>Date
                <input type="date" name="event_date" value="${data.event_date || ""}" required />
            </label>
            <label>Description
                <textarea name="description" rows="3">${data.description || ""}</textarea>
            </label>
            <label>
                <input type="checkbox" name="is_active" ${data.is_active ?? true ? "checked" : ""} /> Active
            </label>
            <button type="submit" class="primary-btn">Save</button>
        </div>
    `;
}

function addEvent() {
    openModal("Add Event", buildEventForm(), async (payload) => {
        payload.is_active = !!payload.is_active;
        try {
            await apiCall("/events", "POST", payload);
            showToast("Event added.", "success");
            hideModal();
            loadEvents();
        } catch (err) {
            showToast(err.message, "error");
        }
    });
}

async function editEvent(id) {
    try {
        const all = await apiCall("/events", "GET");
        const event = all.find((e) => e.id === Number(id));
        if (!event) return;
        openModal("Edit Event", buildEventForm(event), async (payload) => {
            payload.is_active = !!payload.is_active;
            try {
                await apiCall(`/events/${id}`, "PUT", payload);
                showToast("Event updated.", "success");
                hideModal();
                loadEvents();
            } catch (err) {
                showToast(err.message, "error");
            }
        });
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function deleteEvent(id) {
    if (!confirmDelete()) return;
    try {
        await apiCall(`/events/${id}`, "DELETE");
        showToast("Event deleted.", "success");
        loadEvents();
    } catch (err) {
        showToast(err.message, "error");
    }
}

// ------------------------ College Timings ------------------------
async function loadCollegeTimings() {
    try {
        const data = await apiCall("/timings", "GET");
        const form = document.getElementById("college-timings-form");
        if (!data || !Object.keys(data).length || !form) return;
        Object.keys(data).forEach((key) => {
            if (form.elements[key]) form.elements[key].value = data[key];
        });
    } catch (_) {
        // ignore
    }
}

async function saveCollegeTimings(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = {};
    Array.from(form.elements).forEach((el) => {
        if (el.name) payload[el.name] = el.value;
    });
    try {
        await apiCall("/timings", "PUT", payload);
        showToast("College timings saved.", "success");
    } catch (err) {
        showToast(err.message, "error");
    }
}

// ------------------------ Student Fees ------------------------
async function loadStudentFees() {
    try {
        const data = await apiCall("/student-fees", "GET");
        const tbody = document.getElementById("student-fees-table");
        tbody.innerHTML = "";
        let totalCollected = 0;
        data.forEach((record) => {
            totalCollected += Number(record.paid_amount || 0);
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${record.student_name}</td>
                <td>${record.student_id}</td>
                <td>${record.category}</td>
                <td>₹${record.total_fees.toFixed(2)}</td>
                <td>₹${record.paid_amount.toFixed(2)}</td>
                <td>₹${record.remaining_amount.toFixed(2)}</td>
                <td>${record.semester}</td>
                <td>
                    <button class="ghost-btn" data-action="edit-student-fee" data-id="${record.id}">Edit</button>
                    <button class="ghost-btn" data-action="delete-student-fee" data-id="${record.id}">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        document.getElementById("stat-fees").textContent = `₹${totalCollected.toFixed(2)}`;
        document.getElementById("stat-students").textContent = data.length;
    } catch (err) {
        showToast(err.message, "error");
    }
}

function buildStudentFeeForm(data = {}) {
    return `
        <div class="form-grid">
            <label>Student Name
                <input name="student_name" value="${data.student_name || ""}" required />
            </label>
            <label>Student ID
                <input name="student_id" value="${data.student_id || ""}" required />
            </label>
            <label>Admission Year
                <input name="admission_year" value="${data.admission_year || ""}" required />
            </label>
            <label>Category
                <input name="category" value="${data.category || ""}" placeholder="OPEN / OBC / SC / ST" required />
            </label>
            <label>Total Fees
                <input type="number" step="0.01" name="total_fees" value="${data.total_fees || 0}" required />
            </label>
            <label>Paid Amount
                <input type="number" step="0.01" name="paid_amount" value="${data.paid_amount || 0}" required />
            </label>
            <label>Remaining Amount
                <input type="number" step="0.01" name="remaining_amount" value="${data.remaining_amount || 0}" />
            </label>
            <label>Payment Date
                <input type="datetime-local" name="payment_date" value="" />
            </label>
            <label>Receipt Number
                <input name="receipt_number" value="${data.receipt_number || ""}" required />
            </label>
            <label>Semester
                <input name="semester" value="${data.semester || ""}" required />
            </label>
            <button type="submit" class="primary-btn">Save</button>
        </div>
    `;
}

function addStudentFee() {
    openModal("Add Student Payment", buildStudentFeeForm(), async (payload) => {
        const numericFields = ["total_fees", "paid_amount", "remaining_amount"];
        numericFields.forEach((f) => {
            if (payload[f] !== undefined && payload[f] !== "") {
                payload[f] = parseFloat(payload[f]);
            }
        });
        if (!payload.payment_date) delete payload.payment_date;
        try {
            await apiCall("/student-fees", "POST", payload);
            showToast("Payment record added.", "success");
            hideModal();
            loadStudentFees();
        } catch (err) {
            showToast(err.message, "error");
        }
    });
}

async function editStudentFee(id) {
    try {
        const all = await apiCall("/student-fees", "GET");
        const record = all.find((r) => r.id === Number(id));
        if (!record) return;
        openModal("Edit Student Payment", buildStudentFeeForm(record), async (payload) => {
            const numericFields = ["total_fees", "paid_amount", "remaining_amount"];
            numericFields.forEach((f) => {
                if (payload[f] !== undefined && payload[f] !== "") {
                    payload[f] = parseFloat(payload[f]);
                }
            });
            if (!payload.payment_date) delete payload.payment_date;
            try {
                await apiCall(`/student-fees/${id}`, "PUT", payload);
                showToast("Payment record updated.", "success");
                hideModal();
                loadStudentFees();
            } catch (err) {
                showToast(err.message, "error");
            }
        });
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function deleteStudentFee(id) {
    if (!confirmDelete()) return;
    try {
        await apiCall(`/student-fees/${id}`, "DELETE");
        showToast("Payment record deleted.", "success");
        loadStudentFees();
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function searchStudentById(event) {
    const value = event.target.value.trim();
    if (!value) {
        loadStudentFees();
        return;
    }
    try {
        const data = await apiCall(`/student-fees/search?student_id=${encodeURIComponent(value)}`);
        const tbody = document.getElementById("student-fees-table");
        tbody.innerHTML = "";
        if (!data || !data.id) return;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${data.student_name}</td>
            <td>${data.student_id}</td>
            <td>${data.category}</td>
            <td>₹${data.total_fees.toFixed(2)}</td>
            <td>₹${data.paid_amount.toFixed(2)}</td>
            <td>₹${data.remaining_amount.toFixed(2)}</td>
            <td>${data.semester}</td>
            <td>
                <button class="ghost-btn" data-action="edit-student-fee" data-id="${data.id}">Edit</button>
                <button class="ghost-btn" data-action="delete-student-fee" data-id="${data.id}">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    } catch (err) {
        showToast(err.message, "error");
    }
}

// ------------------------ Help Tickets ------------------------
async function loadTickets() {
    try {
        const filter = document.getElementById("tickets-filter").value;
        const query = filter ? `?status=${encodeURIComponent(filter)}` : "";
        const data = await apiCall(`/tickets${query}`, "GET");
        const tbody = document.getElementById("tickets-table");
        const pendingList = document.getElementById("pending-tickets");
        tbody.innerHTML = "";
        pendingList.innerHTML = "";

        let openCount = 0;
        data.forEach((ticket) => {
            if (ticket.status === "Open") openCount += 1;
            const tr = document.createElement("tr");
            const pdfButton = ticket.pdf_filename 
                ? `<button class="ghost-btn" data-action="download-pdf" data-id="${ticket.id}">Download PDF</button>`
                : '';
            tr.innerHTML = `
                <td>${ticket.student_name}</td>
                <td>${ticket.contact}</td>
                <td>${ticket.topic || "-"}</td>
                <td>${ticket.query}</td>
                <td>
                    <select data-action="change-ticket-status" data-id="${ticket.id}">
                        <option value="Open" ${ticket.status === "Open" ? "selected" : ""}>Open</option>
                        <option value="In Progress" ${ticket.status === "In Progress" ? "selected" : ""}>In Progress</option>
                        <option value="Resolved" ${ticket.status === "Resolved" ? "selected" : ""}>Resolved</option>
                    </select>
                </td>
                <td>${ticket.created_at ? new Date(ticket.created_at).toLocaleString() : "-"}</td>
                <td>
                    <button class="ghost-btn" data-action="view-ticket" data-id="${ticket.id}">View</button>
                    ${pdfButton}
                </td>
            `;
            tbody.appendChild(tr);

            if (ticket.status !== "Resolved") {
                const li = document.createElement("li");
                li.textContent = `${ticket.student_name} - ${ticket.query}`;
                pendingList.appendChild(li);
            }
        });
        document.getElementById("stat-tickets").textContent = openCount;
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function changeTicketStatus(id, status) {
    try {
        await apiCall(`/tickets/${id}/status`, "PUT", { status });
        loadTickets();
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function viewTicket(id) {
    try {
        const all = await apiCall("/tickets", "GET");
        const ticket = all.find((t) => t.id === Number(id));
        if (!ticket) return;
        const pdfSection = ticket.pdf_filename 
            ? `<p><strong>PDF Attachment:</strong> <a href="/api/admin/tickets/${ticket.id}/pdf" target="_blank" style="color: #00D26A; text-decoration: underline;">Download PDF</a></p>`
            : '<p><strong>PDF Attachment:</strong> None</p>';
        openModal(
            "Ticket Details",
            `
            <div class="form-grid">
                <p><strong>Student:</strong> ${ticket.student_name}</p>
                <p><strong>Contact:</strong> ${ticket.contact}</p>
                <p><strong>Topic:</strong> ${ticket.topic || "Not specified"}</p>
                <p><strong>Status:</strong> ${ticket.status}</p>
                <p><strong>Query:</strong><br/>${ticket.query}</p>
                ${pdfSection}
                <button type="button" class="primary-btn" id="close-ticket-modal">Close</button>
            </div>
            `,
            () => {}
        );
        document
            .getElementById("close-ticket-modal")
            ?.addEventListener("click", hideModal, { once: true });
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function downloadTicketPdf(id) {
    try {
        window.location.href = `/api/admin/tickets/${id}/pdf`;
    } catch (err) {
        showToast(err.message, "error");
    }
}

// ------------------------ Dashboard Init ------------------------
async function loadDashboard() {
    await Promise.all([loadStudentFees(), loadTickets(), loadEvents()]);
}

function attachEventListeners() {
    document.getElementById("logout-btn")?.addEventListener("click", handleLogout);
    document.getElementById("menu-toggle")?.addEventListener("click", toggleSidebar);

    document.querySelectorAll(".nav-link").forEach((btn) => {
        btn.addEventListener("click", () => {
            const section = btn.dataset.section;
            switchSection(section);
            if (section === "dashboard") loadDashboard();
            if (section === "fees") loadFeesData();
            if (section === "documents") loadDocuments();
            if (section === "library") loadLibrary();
            if (section === "hostel") loadHostel();
            if (section === "scholarships") loadScholarships();
            if (section === "faculty") loadFaculty();
            if (section === "principal") loadPrincipal();
            if (section === "events") loadEvents();
            if (section === "timings") loadCollegeTimings();
            if (section === "student-fees") loadStudentFees();
            if (section === "tickets") loadTickets();
        });
    });

    document.getElementById("fees-filter")?.addEventListener("change", loadFeesData);
    document
        .getElementById("scholarship-filter")
        ?.addEventListener("change", loadScholarships);
    document.getElementById("events-filter")?.addEventListener("change", loadEvents);
    document.getElementById("tickets-filter")?.addEventListener("change", loadTickets);
    document
        .getElementById("library-timings-form")
        ?.addEventListener("submit", saveLibraryTimings);
    document
        .getElementById("college-timings-form")
        ?.addEventListener("submit", saveCollegeTimings);
    document
        .getElementById("principal-form")
        ?.addEventListener("submit", savePrincipal);
    document
        .getElementById("student-search")
        ?.addEventListener("input", searchStudentById);

    // Tabs for documents
    document.querySelectorAll("[data-doc-tab]").forEach((tab) => {
        tab.addEventListener("click", () => {
            document.querySelectorAll("[data-doc-tab]").forEach((t) =>
                t.classList.toggle("active", t === tab)
            );
            loadDocuments();
        });
    });

    // Open modal buttons
    document.querySelectorAll("[data-action='open-modal']").forEach((btn) => {
        btn.addEventListener("click", () => {
            const modalType = btn.dataset.modal;
            if (modalType === "fees-form") addFees();
            if (modalType === "document-form") addDocument();
            if (modalType === "library-book-form") addLibraryBook();
            if (modalType === "scholarship-form") addScholarship();
            if (modalType === "faculty-form") addFaculty();
            if (modalType === "event-form") addEvent();
            if (modalType === "student-fee-form") addStudentFee();
        });
    });

    // Global table/button handlers
    document.body.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const action = target.dataset.action;
        const id = target.dataset.id;
        if (!action) return;

        if (action === "edit-fees") editFees(id);
        if (action === "delete-fees") deleteFees(id);

        if (action === "edit-doc") editDocument(id);
        if (action === "delete-doc") deleteDocument(id);

        if (action === "edit-book") editLibraryBook(id);
        if (action === "delete-book") deleteLibraryBook(id);

        if (action === "edit-hostel") editHostel(id);

        if (action === "edit-scholarship") editScholarship(id);
        if (action === "delete-scholarship") deleteScholarship(id);

        if (action === "edit-faculty") editFaculty(id);
        if (action === "delete-faculty") deleteFaculty(id);

        if (action === "edit-event") editEvent(id);
        if (action === "delete-event") deleteEvent(id);

        if (action === "edit-student-fee") editStudentFee(id);
        if (action === "delete-student-fee") deleteStudentFee(id);

        if (action === "view-ticket") viewTicket(id);
        if (action === "download-pdf") downloadTicketPdf(id);
    });

    document.body.addEventListener("change", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const action = target.dataset.action;
        const id = target.dataset.id;
        if (!action || !id) return;

        if (action === "toggle-doc-required") {
            toggleDocumentRequired(id, target.checked);
        }
        if (action === "change-ticket-status") {
            changeTicketStatus(id, target.value);
        }
    });

    document.getElementById("close-modal")?.addEventListener("click", hideModal);
    document.getElementById("modal-form")?.addEventListener("submit", handleModalSubmit);
}

async function initAdmin() {
    await checkAuth();
    attachEventListeners();
    switchSection("dashboard");
    loadDashboard();
}

document.addEventListener("DOMContentLoaded", initAdmin);
