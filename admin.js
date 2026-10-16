const STORAGE_KEYS = {
    FLATS: "nexSociety_flats",
    COMPLAINTS: "nexSociety_complaints",
    NOTICES: "nexSociety_notices"
};

const DEFAULT_FLATS = [
    { flat: "A-101", resident: "Ramesh Patel", phone: "+91 98201 11201", tower: "Tower A", bay: "Bay A-01", status: "paid" },
    { flat: "A-102", resident: "Sunita Deshmukh", phone: "+91 98201 22302", tower: "Tower A", bay: "Bay A-02", status: "paid" },
    { flat: "A-204", resident: "Aryan Sharma", phone: "+91 98201 44521", tower: "Tower A", bay: "Bay B-12", status: "paid" },
    { flat: "A-301", resident: "Deepak Chopra", phone: "+91 98201 55603", tower: "Tower A", bay: "Bay A-15", status: "pending" },
    { flat: "B-102", resident: "Neha Verma", phone: "+91 91234 56789", tower: "Tower B", bay: "Bay B-04", status: "paid" },
    { flat: "B-201", resident: "Sanjay Singhania", phone: "+91 98202 77805", tower: "Tower B", bay: "Bay B-08", status: "paid" },
    { flat: "B-303", resident: "Suresh Gupta", phone: "+91 90012 34567", tower: "Tower B", bay: "Bay B-19", status: "paid" },
    { flat: "C-404", resident: "Dr. K. Mehta", phone: "+91 99887 76655", tower: "Tower C", bay: "Bay C-10", status: "paid" },
    { flat: "C-501", resident: "Vikram Malhotra", phone: "+91 98765 01234", tower: "Tower C", bay: "Bay C-22", status: "pending" }
];

const DEFAULT_COMPLAINTS = [
    {
        id: "CMP-101",
        category: "Plumbing",
        flat: "Flat A-204 (Aryan)",
        details: "Low water pressure in kitchen sink tap.",
        date: "Today, 09:30 AM",
        status: "In Review"
    },
    {
        id: "CMP-102",
        category: "Electrical",
        flat: "Flat B-303 (S. Gupta)",
        details: "Corridor light flickering outside 3rd floor lift lobby.",
        date: "Today, 08:15 AM",
        status: "In Review"
    },
    {
        id: "CMP-103",
        category: "Elevator",
        flat: "Tower C Elevator",
        details: "Lift car jerk during 4th floor floor alignment.",
        date: "Yesterday",
        status: "In Review"
    },
    {
        id: "CMP-104",
        category: "Carpentry",
        flat: "Clubhouse Door",
        details: "Main glass door hydraulic latch loose.",
        date: "2 days ago",
        status: "Resolved"
    }
];

// Storage helper functions
function loadFromStorage(key, fallback) {
    try {
        const item = localStorage.getItem(key);
        if (item) return JSON.parse(item);
    } catch (e) {
        console.warn(`Error reading ${key}:`, e);
    }
    return JSON.parse(JSON.stringify(fallback));
}

function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`Error saving ${key}:`, e);
    }
}

// Active state
let flats = loadFromStorage(STORAGE_KEYS.FLATS, DEFAULT_FLATS);
let adminComplaints = loadFromStorage(STORAGE_KEYS.COMPLAINTS, DEFAULT_COMPLAINTS);
let dirSearchQuery = "";

// DOM Ready Setup
// ========================================================
document.addEventListener("DOMContentLoaded", () => {
    initAdminClock();
    renderFlatsDirectory();
    renderAdminComplaints();
    initDirectorySearch();
});

// Real-time Clock
function initAdminClock() {
    const clockEl = document.getElementById("adminClock");
    if (!clockEl) return;

    function update() {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
        });
    }

    update();
    setInterval(update, 1000);
}

function renderFlatsDirectory() {
    const tbody = document.getElementById("directoryTableBody");
    if (!tbody) return;

    const filtered = flats.filter(item => {
        if (!dirSearchQuery.trim()) return true;
        const q = dirSearchQuery.toLowerCase().trim();
        return (
            item.flat.toLowerCase().includes(q) ||
            item.resident.toLowerCase().includes(q) ||
            item.phone.toLowerCase().includes(q) ||
            item.bay.toLowerCase().includes(q)
        );
    });

    tbody.innerHTML = "";

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted);">
                    No flats matched your search query.
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach(row => {
        const tr = document.createElement("tr");

        let statusBadge = "";
        let actionBtn = "";

        if (row.status === "paid") {
            statusBadge = `<span class="status-chip paid">✓ Paid (Oct)</span>`;
            actionBtn = `<button type="button" class="action-btn-sm" onclick="showToast('Invoice receipt #REC-${row.flat} sent to ${row.resident}', '✓')">Receipt</button>`;
        } else {
            statusBadge = `<span class="status-chip pending">₹4,250 Overdue</span>`;
            actionBtn = `<button type="button" class="action-btn-sm" style="background: #fef2f2; color: #ef4444;" onclick="sendDuesReminder('${row.flat}', '${row.resident}', '${row.phone}')">Remind ✉️</button>`;
        }

        tr.innerHTML = `
            <td>
                <strong>${row.flat}</strong>
                <div style="font-size: 11px; color: var(--text-muted);">${row.tower}</div>
            </td>
            <td>
                <strong>${row.resident}</strong>
            </td>
            <td>
                <span style="font-family: monospace;">${row.phone}</span>
            </td>
            <td>
                <span style="font-family: monospace; font-size: 11px; background: var(--bg-main); padding: 3px 6px; border-radius: 4px;">${row.bay}</span>
            </td>
            <td>
                ${statusBadge}
            </td>
            <td>
                ${actionBtn}
            </td>
        `;

        tbody.appendChild(tr);
    });
}

function initDirectorySearch() {
    const searchInput = document.getElementById("dirSearchInput");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            dirSearchQuery = e.target.value;
            renderFlatsDirectory();
        });
    }
}

function sendDuesReminder(flat, resident, phone) {
    showToast(`📩 Automated Dues Reminder SMS dispatched to ${resident} (${flat})`, "✓");
}

function renderAdminComplaints() {
    const container = document.getElementById("adminComplaintsList");
    const countBadge = document.getElementById("complaintsBadge");
    const textCount = document.getElementById("complaintsCountText");
    const openTicketsBadge = document.getElementById("openTicketsBadge");

    const openCount = adminComplaints.filter(c => c.status !== "Resolved").length;

    if (countBadge) countBadge.textContent = openCount;
    if (textCount) textCount.textContent = String(openCount).padStart(2, "0");
    if (openTicketsBadge) openTicketsBadge.textContent = `${openCount} OPEN`;

    if (!container) return;
    container.innerHTML = "";

    if (adminComplaints.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 13px;">
                No active complaints filed.
            </div>
        `;
        return;
    }

    adminComplaints.forEach((ticket, index) => {
        const item = document.createElement("div");
        item.className = "complaint-item";

        let statusClass = ticket.status === "Resolved" ? "resolved" : "review";
        let resolveBtnHtml = ticket.status === "Resolved"
            ? `<span style="font-size: 11px; color: var(--success); font-weight: 700;">✓ Resolved</span>`
            : `<button type="button" class="btn-resolve" onclick="resolveTicket('${ticket.id || index}')">Mark Resolved ✓</button>`;

        item.innerHTML = `
            <div class="complaint-info">
                <strong>[${ticket.category}] • ${ticket.flat || 'Society Common Area'}</strong>
                <p>${ticket.details}</p>
                <small>Logged: ${ticket.date || 'Today'} • <span class="status-chip ${statusClass}">${ticket.status}</span></small>
            </div>
            <div class="complaint-actions">
                ${resolveBtnHtml}
            </div>
        `;

        container.appendChild(item);
    });
}

function resolveTicket(ticketId) {
    const ticket = adminComplaints.find(t => (t.id === ticketId || String(adminComplaints.indexOf(t)) === String(ticketId)));
    if (!ticket) return;

    ticket.status = "Resolved";
    saveToStorage(STORAGE_KEYS.COMPLAINTS, adminComplaints);

    renderAdminComplaints();
    playChirp();
    showToast(`✓ Ticket ${ticket.id || ''} for ${ticket.category} marked as Resolved!`, "✓");
}

function handlePublishNotice(e) {
    e.preventDefault();

    const headline = document.getElementById("noticeHeadline").value.trim();
    const category = document.getElementById("noticeCategory").value;
    const content = document.getElementById("noticeContent").value.trim();

    if (!headline || !content) return;

    const notice = {
        id: "NOT-" + Date.now(),
        headline: headline,
        category: category,
        content: content,
        date: new Date().toLocaleDateString("en-IN")
    };

    const notices = loadFromStorage(STORAGE_KEYS.NOTICES, []);
    notices.unshift(notice);
    saveToStorage(STORAGE_KEYS.NOTICES, notices);

    document.getElementById("noticeHeadline").value = "";
    document.getElementById("noticeContent").value = "";

    playChirp();
    showToast(`📢 Announcement "${headline}" broadcasted to all 120 residents & Gate!`, "📢");
}

function exportFlatsDirectory() {
    const headers = ["Flat", "Tower", "Resident Name", "Phone", "Parking Bay", "Maintenance Status"];
    const rows = flats.map(f => [
        `"${f.flat}"`,
        `"${f.tower}"`,
        `"${f.resident}"`,
        `"${f.phone}"`,
        `"${f.bay}"`,
        `"${f.status.toUpperCase()}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encoded = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encoded);
    link.setAttribute("download", `NexSociety_Flats_Directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("📄 Exported Flats Directory CSV successfully!", "✓");
}

function playChirp() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.28);
    } catch (e) {}
}

// Modal Controls
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add("show");
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove("show");
    }
}

// Close modal on backdrop click or Escape key
window.addEventListener("click", (e) => {
    if (e.target.classList && e.target.classList.contains("modal")) {
        e.target.classList.remove("show");
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        document.querySelectorAll(".modal.show").forEach(m => m.classList.remove("show"));
    }
});

// Admin Date Display
function initAdminDate() {
    const dateEl = document.getElementById("adminDate");
    if (!dateEl) return;
    const today = new Date();
    dateEl.textContent = today.toLocaleDateString("en-IN", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
    }) + " • Term 2026-2028";
}

document.addEventListener("DOMContentLoaded", () => {
    initAdminDate();
});

let toastTimeout = null;
function showToast(message, icon = "✓") {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");
    const toastIcon = document.getElementById("toastIcon");

    if (!toast) return;

    toastMessage.textContent = message;
    if (toastIcon) toastIcon.textContent = icon;

    toast.classList.add("active");
    toast.classList.add("show");

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove("active");
        toast.classList.remove("show");
    }, 2800);
}
