/**
 * NexSociety - Resident Portal Logic (Flat A-204)
 * Comprehensive, fully functional implementation for:
 * - Expected Guests pre-approvals, copy code, WhatsApp share, passcard preview & revoke
 * - Helpdesk tickets submission, real-time filtering, resolve & withdraw
 * - Maintenance invoice breakdown, official receipt view & print, advance payment simulation
 * - Interactive Society Events RSVP toggles & .ics calendar downloads
 * - Temporary visitor parking slot allocation (synced with Security Gate)
 * - Real-time Gate 1 Intercom two-way audio simulation
 * - Dynamic society notices loaded from Admin broadcast
 */

// Storage Keys matching Security & Admin terminals
const STORAGE_KEYS = {
    VISITORS: "nexSociety_visitors",
    PREAPPROVED: "nexSociety_preapproved",
    COMPLAINTS: "nexSociety_complaints",
    NOTICES: "nexSociety_notices",
    VEHICLES: "nexSociety_vehicles",
    RSVP: "nexSociety_rsvp",
    MAINTENANCE: "nexSociety_maintenance",
    DISMISSED_NOTICE: "nexSociety_dismissed_notice"
};

// Safe storage utilities
function loadFromStorage(key, fallback) {
    try {
        const item = localStorage.getItem(key);
        if (item) {
            return JSON.parse(item);
        }
    } catch (e) {
        console.warn(`Error reading ${key} from storage:`, e);
    }
    return JSON.parse(JSON.stringify(fallback));
}

function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`Error saving ${key} to storage:`, e);
    }
}

// --------------------------------------------------------------------------
// DEFAULT INITIAL DATASETS
// --------------------------------------------------------------------------

const DEFAULT_PREAPPROVED = [
    {
        id: "PRE-01",
        name: "Rahul Sharma",
        phone: "+91 98201 44521",
        flat: "A-204",
        resident: "Aryan Sharma",
        purpose: "guest",
        passNumber: "#9402",
        vehicle: "MH-02-CD-4421",
        expectedTime: "Today (Anytime)"
    },
    {
        id: "PRE-02",
        name: "Priya Shah",
        phone: "+91 97654 32109",
        flat: "A-204",
        resident: "Aryan Sharma",
        purpose: "guest",
        passNumber: "#582194",
        vehicle: "Walking",
        expectedTime: "Evening (7:00 PM)"
    }
];

const DEFAULT_COMPLAINTS = [
    {
        id: "CMP-101",
        category: "Plumbing",
        flat: "Flat A-204 (Aryan)",
        urgency: "Normal",
        details: "Low water pressure in kitchen sink tap during morning supply hours.",
        date: "Today, 09:30 AM",
        status: "In Review"
    }
];

const DEFAULT_EVENTS = [
    {
        id: "EVT-1",
        day: "20",
        month: "OCT",
        title: "Grand Diwali Celebration & Rangoli Fest",
        venue: "Clubhouse Lawn • 07:00 PM onwards",
        description: "Community lighting ceremony, musical evening, festive snacks buffet, and prizes for best rangoli art.",
        baseAttendees: 42
    },
    {
        id: "EVT-2",
        day: "25",
        month: "OCT",
        title: "Annual Residents General Body Meeting (AGM)",
        venue: "Community Hall • 06:30 PM",
        description: "Review of annual society audit, lift modernization plans, and election of new committee members.",
        baseAttendees: 78
    },
    {
        id: "EVT-3",
        day: "12",
        month: "NOV",
        title: "Children's Sports & Badminton Tournament",
        venue: "Sports Complex • 09:00 AM",
        description: "Annual sports day for junior society residents across U-12 and U-16 categories with medals and trophies.",
        baseAttendees: 31
    }
];

const DEFAULT_NOTICES = [
    {
        id: "NOT-01",
        headline: "⚠️ Scheduled Water Supply Maintenance Tomorrow",
        category: "Maintenance",
        content: "Water supply will remain unavailable tomorrow from 10:00 AM to 1:00 PM due to pipeline servicing in Tower A.",
        date: "Today",
        time: "08:00 AM"
    },
    {
        id: "NOT-02",
        headline: "🎉 Grand Diwali Festive Lighting Guidelines",
        category: "Celebration",
        content: "Please ensure fairy lights adhere to electrical safety standards. Firecracker bursting is restricted to the outer sports ground after 8:00 PM.",
        date: "Yesterday",
        time: "06:30 PM"
    },
    {
        id: "NOT-03",
        headline: "🛗 Tower B & C Lift AMC Modernization",
        category: "Maintenance",
        content: "Schindler engineers will be conducting preventive sensory tests on high-speed passenger elevators.",
        date: "12 Oct 2026",
        time: "11:15 AM"
    }
];

// Active State
let preapproved = loadFromStorage(STORAGE_KEYS.PREAPPROVED, DEFAULT_PREAPPROVED);
let complaints = loadFromStorage(STORAGE_KEYS.COMPLAINTS, DEFAULT_COMPLAINTS);
let rsvpState = loadFromStorage(STORAGE_KEYS.RSVP, { "EVT-1": true }); // A-204 RSVP'd to Diwali by default
let maintenanceState = loadFromStorage(STORAGE_KEYS.MAINTENANCE, {
    octoberPaid: true,
    novemberPaid: false,
    octoberReceipt: "#NX-2026-10204",
    novemberReceipt: null
});

let currentComplaintFilter = "all";
let activePassModalData = null;

// Intercom call state
let intercomAudioContext = null;
let intercomOscillator1 = null;
let intercomOscillator2 = null;
let intercomTimerInterval = null;
let intercomSeconds = 0;

// --------------------------------------------------------------------------
// INITIALIZATION ON DOM READY
// --------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    initResidentDate();
    initResidentGreeting();
    renderNoticeBanner();
    renderExpectedVisitors();
    renderResidentComplaints();
    renderSocietyEvents();
    updateResidentStats();
    initGlobalModalDismiss();
});

// Format Indian Standard locale date
function initResidentDate() {
    const dateEl = document.getElementById("residentTodayDate");
    if (!dateEl) return;

    const today = new Date();
    dateEl.textContent = today.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

// Personalize greeting & user data
function initResidentGreeting() {
    let userData = null;
    try {
        const raw = localStorage.getItem("nexSocietyUserData");
        if (raw) userData = JSON.parse(raw);
    } catch (e) {}

    const loggedUser = localStorage.getItem("nexSocietyUser");
    const greetingEl = document.getElementById("residentGreeting");

    let residentName = "Resident";
    let flatNum = "A-101";

    if (userData && userData.name) {
        residentName = userData.name;
        if (userData.flat) flatNum = userData.flat;
    } else if (loggedUser) {
        const raw = loggedUser.split("@")[0];
        residentName = raw.charAt(0).toUpperCase() + raw.slice(1);
    }

    if (greetingEl) {
        const hour = new Date().getHours();
        let timeSalutation = "Good morning";
        if (hour >= 12 && hour < 17) timeSalutation = "Good afternoon";
        else if (hour >= 17) timeSalutation = "Good evening";

        greetingEl.textContent = `${timeSalutation}, ${residentName} 👋 (${flatNum})`;
    }

    const passFlatInput = document.getElementById("passFlat");
    if (passFlatInput) passFlatInput.value = flatNum;
    const cmpFlatInput = document.getElementById("complaintFlat");
    if (cmpFlatInput) cmpFlatInput.value = flatNum;
}

// --------------------------------------------------------------------------
// NOTICE BANNER & CIRCULARS SYSTEM
// --------------------------------------------------------------------------

function renderNoticeBanner() {
    const banner = document.getElementById("noticeBanner");
    const headlineEl = document.getElementById("noticeHeadline");
    const contentEl = document.getElementById("noticeContent");
    if (!banner || !headlineEl || !contentEl) return;

    const dismissedId = localStorage.getItem(STORAGE_KEYS.DISMISSED_NOTICE);
    const notices = loadFromStorage(STORAGE_KEYS.NOTICES, DEFAULT_NOTICES);

    if (notices.length === 0) {
        banner.style.display = "none";
        return;
    }

    const latest = notices[0];

    // Check if dismissed
    if (dismissedId === latest.id) {
        banner.style.display = "none";
        return;
    }

    banner.style.display = "flex";
    headlineEl.textContent = latest.headline;
    contentEl.textContent = latest.content;
    banner.dataset.noticeId = latest.id;
}

function dismissNoticeBanner() {
    const banner = document.getElementById("noticeBanner");
    if (!banner) return;

    const noticeId = banner.dataset.noticeId || "default";
    localStorage.setItem(STORAGE_KEYS.DISMISSED_NOTICE, noticeId);

    banner.style.transition = "all 0.3s ease";
    banner.style.opacity = "0";
    banner.style.transform = "translateY(-10px)";
    setTimeout(() => {
        banner.style.display = "none";
    }, 300);

    showToast("Notice dismissed.", "ℹ️");
}

function renderAllNoticesModal() {
    const container = document.getElementById("allNoticesContainer");
    if (!container) return;

    const notices = loadFromStorage(STORAGE_KEYS.NOTICES, DEFAULT_NOTICES);
    container.innerHTML = "";

    if (notices.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--text-muted);">No notices posted.</div>`;
        return;
    }

    notices.forEach(n => {
        const item = document.createElement("div");
        item.className = "complaint-card";
        item.style.marginBottom = "0";
        item.innerHTML = `
            <div class="complaint-card-top">
                <span class="complaint-category-tag">${n.category || 'General'}</span>
                <span style="font-size: 11px; color: var(--text-muted);">${n.date || 'Today'} • ${n.time || ''}</span>
            </div>
            <strong style="font-size: 14px; color: #ffffff; display: block; margin-bottom: 6px;">${n.headline}</strong>
            <p style="font-size: 12px; color: #cbd5e1; margin-bottom: 0;">${n.content}</p>
        `;
        container.appendChild(item);
    });
}

// --------------------------------------------------------------------------
// EXPECTED GUESTS & PRE-APPROVAL PASSES
// --------------------------------------------------------------------------

function renderExpectedVisitors() {
    const container = document.getElementById("expectedVisitorsContainer");
    if (!container) return;

    // Filter visitors for Flat A-204
    const flatVisitors = preapproved.filter(v => (v.flat || "").toUpperCase().includes("A-204"));

    container.innerHTML = "";

    if (flatVisitors.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 32px 16px; color: var(--text-muted); font-size: 13px;">
                <div style="font-size: 32px; margin-bottom: 8px;">♙</div>
                <strong style="color: #ffffff; display: block; margin-bottom: 4px;">No Expected Guests Scheduled</strong>
                <p style="margin-bottom: 14px;">Pre-approve your visitors to generate a 6-digit gate passcode for instant entry.</p>
                <button type="button" class="btn-primary" onclick="openModal('preapproveModal')">
                    + Pre-Approve First Guest
                </button>
            </div>
        `;
        return;
    }

    flatVisitors.forEach(guest => {
        const initials = guest.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
        const cleanPass = (guest.passNumber || "").replace("#", "");
        const purpose = guest.purpose ? guest.purpose.toUpperCase() : "GUEST";

        const div = document.createElement("div");
        div.className = "visitor-item";
        div.innerHTML = `
            <div class="visitor-left">
                <div class="visitor-avatar-badge">${initials}</div>
                <div class="visitor-meta">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <strong>${guest.name}</strong>
                        <span class="purpose-pill">${purpose}</span>
                    </div>
                    <small>Vehicle: ${guest.vehicle || 'Walking'} • Expected: ${guest.expectedTime || 'Today'}</small>
                </div>
            </div>

            <div class="visitor-right-actions">
                <span class="passcode-pill" title="6-Digit Entry Code">${guest.passNumber}</span>

                <button type="button" class="btn-action-sm btn-copy-pass" onclick="copyPassCode('${cleanPass}')" title="Copy passcode">
                    📋 Copy
                </button>

                <button type="button" class="btn-action-sm btn-whatsapp-share" onclick="shareGuestWhatsapp('${guest.name}', '${guest.passNumber}')" title="Share pass on WhatsApp">
                    💬 WhatsApp
                </button>

                <button type="button" class="btn-action-sm btn-copy-pass" onclick="openPassCardModal('${guest.id}')" title="View Digital Pass">
                    👁️ Pass
                </button>

                <button type="button" class="btn-action-sm btn-revoke-pass" onclick="revokePass('${guest.id}', '${guest.name}')" title="Revoke Pass">
                    ✕
                </button>
            </div>
        `;
        container.appendChild(div);
    });
}

function handlePreapproveVisitor(e) {
    e.preventDefault();

    const name = document.getElementById("preName").value.trim();
    const phone = document.getElementById("prePhone").value.trim() || "+91 98000 00000";
    const vehicle = document.getElementById("preVehicle").value.trim() || "Walking";
    const purpose = document.getElementById("prePurpose").value;
    const time = document.getElementById("preTime").value;

    if (!name) return;

    // Generate random 6-digit numeric passcode
    const rawNumber = Math.floor(100000 + Math.random() * 900000);
    const passCode = "#" + rawNumber;

    const newGuest = {
        id: "PRE-" + Date.now().toString().slice(-4),
        name: name,
        phone: phone,
        flat: "A-204",
        resident: "Aryan Sharma",
        vehicle: vehicle,
        purpose: purpose,
        expectedTime: time,
        passNumber: passCode
    };

    preapproved.unshift(newGuest);
    saveToStorage(STORAGE_KEYS.PREAPPROVED, preapproved);

    renderExpectedVisitors();
    updateResidentStats();
    closeModal("preapproveModal");
    document.getElementById("preapproveForm").reset();

    playSuccessChirp();

    // Directly open Digital Pass Modal preview for easy sharing
    openPassCardModal(newGuest.id);
    showToast(`✓ Pass generated for ${name}! Code: ${passCode}`, "🔑");
}

function copyPassCode(code) {
    const textToCopy = code.startsWith("#") ? code : "#" + code;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            playClickChirp();
            showToast(`📋 Passcode ${textToCopy} copied to clipboard!`, "✓");
        }).catch(() => {
            fallbackCopy(textToCopy);
        });
    } else {
        fallbackCopy(textToCopy);
    }
}

function fallbackCopy(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand("copy");
        playClickChirp();
        showToast(`📋 Passcode ${text} copied to clipboard!`, "✓");
    } catch (e) {
        prompt("Copy passcode:", text);
    }
    document.body.removeChild(textArea);
}

function shareGuestWhatsapp(name, pass) {
    const text = `Hello ${name}! Here is your digital visitor pass for Flat A-204, Tower A at Green Meadows Heights (NexSociety). Show Passcode: *${pass}* at Gate 1 for automated verification.`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    showToast(`Opening WhatsApp share for ${name}...`, "💬");
}

function revokePass(guestId, guestName) {
    const confirmRevoke = confirm(`Are you sure you want to cancel and revoke the gate pass for "${guestName}"?`);
    if (!confirmRevoke) return;

    preapproved = preapproved.filter(g => g.id !== guestId);
    saveToStorage(STORAGE_KEYS.PREAPPROVED, preapproved);

    renderExpectedVisitors();
    updateResidentStats();
    playClickChirp();
    showToast(`Pass for "${guestName}" revoked and cancelled at Gate.`, "⚠️");
}

function openPassCardModal(guestId) {
    const guest = preapproved.find(g => g.id === guestId);
    if (!guest) return;

    activePassModalData = guest;

    const pinEl = document.getElementById("passModalPin");
    const nameEl = document.getElementById("passModalGuestName");

    if (pinEl) pinEl.textContent = guest.passNumber;
    if (nameEl) nameEl.textContent = `${guest.name} (${guest.vehicle || 'Walking'})`;

    openModal("passModal");
}

function copyPassCodeModal() {
    if (!activePassModalData) return;
    copyPassCode(activePassModalData.passNumber);
}

function sharePassWhatsappModal() {
    if (!activePassModalData) return;
    shareGuestWhatsapp(activePassModalData.name, activePassModalData.passNumber);
}

// --------------------------------------------------------------------------
// HELPDESK COMPLAINTS & TICKETS SYSTEM
// --------------------------------------------------------------------------

function renderResidentComplaints() {
    const container = document.getElementById("residentComplaintsContainer");
    const navBadge = document.getElementById("navComplaintBadge");
    if (!container) return;

    // Filter complaints related to Flat A-204
    let flatTickets = complaints.filter(c => (c.flat || "").toUpperCase().includes("A-204") || (c.details || "").includes("A-204"));

    // If initial complaints didn't have flat specified, default them to A-204
    if (flatTickets.length === 0 && complaints.length > 0) {
        flatTickets = complaints;
    }

    // Apply category filter
    let filtered = flatTickets;
    if (currentComplaintFilter === "review") {
        filtered = flatTickets.filter(c => c.status !== "Resolved");
    } else if (currentComplaintFilter === "resolved") {
        filtered = flatTickets.filter(c => c.status === "Resolved");
    }

    const openCount = flatTickets.filter(c => c.status !== "Resolved").length;
    if (navBadge) navBadge.textContent = openCount;

    container.innerHTML = "";

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 13px;">
                <p>No complaints found under "${currentComplaintFilter}" filter.</p>
                <button type="button" class="btn-text" style="margin-top: 6px;" onclick="openModal('complaintModal')">
                    + Lodge a new service ticket
                </button>
            </div>
        `;
        return;
    }

    filtered.forEach(ticket => {
        const isResolved = ticket.status === "Resolved";
        const statusClass = isResolved ? "resolved" : "review";
        const statusText = isResolved ? "✓ RESOLVED" : "IN REVIEW";

        const card = document.createElement("div");
        card.className = "complaint-card";

        let actionBtnHtml = isResolved
            ? `<button type="button" class="btn-action-sm btn-copy-pass" onclick="reopenComplaint('${ticket.id}')">Re-open ↺</button>`
            : `
                <div class="complaint-actions-row">
                    <button type="button" class="btn-resolve-sm" onclick="markComplaintResolved('${ticket.id}')">Mark Resolved ✓</button>
                    <button type="button" class="btn-withdraw-sm" onclick="withdrawComplaint('${ticket.id}')">Withdraw ✕</button>
                </div>
            `;

        card.innerHTML = `
            <div class="complaint-card-top">
                <span class="complaint-category-tag">🔧 ${ticket.category}</span>
                <span class="complaint-status-pill ${statusClass}">${statusText}</span>
            </div>
            <p>${ticket.details}</p>
            <div class="complaint-card-bottom">
                <span>Ticket ID: <strong>${ticket.id}</strong> • ${ticket.date || 'Today'}</span>
                ${actionBtnHtml}
            </div>
        `;

        container.appendChild(card);
    });
}

function filterComplaints(filter) {
    currentComplaintFilter = filter;
    document.querySelectorAll(".complaint-filter-tabs .filter-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.filter === filter);
    });
    renderResidentComplaints();
}

function handleRaiseComplaint(e) {
    e.preventDefault();

    const category = document.getElementById("complaintCategory").value;
    const urgency = document.getElementById("complaintUrgency").value;
    const details = document.getElementById("complaintDetails").value.trim();

    if (!details) return;

    const newTicket = {
        id: "CMP-" + Math.floor(100 + Math.random() * 900),
        category: category,
        flat: "Flat A-204 (Aryan)",
        urgency: urgency,
        details: details,
        date: "Just now",
        status: "In Review"
    };

    complaints.unshift(newTicket);
    saveToStorage(STORAGE_KEYS.COMPLAINTS, complaints);

    renderResidentComplaints();
    updateResidentStats();
    closeModal("complaintModal");
    document.getElementById("complaintDetails").value = "";

    playSuccessChirp();
    showToast(`✓ Ticket ${newTicket.id} submitted! Dispatched to facility supervisor.`, "✓");
}

function markComplaintResolved(ticketId) {
    const ticket = complaints.find(c => c.id === ticketId);
    if (ticket) {
        ticket.status = "Resolved";
        saveToStorage(STORAGE_KEYS.COMPLAINTS, complaints);
        renderResidentComplaints();
        updateResidentStats();
        playSuccessChirp();
        showToast(`Ticket ${ticketId} marked as Resolved!`, "✓");
    }
}

function withdrawComplaint(ticketId) {
    const confirmed = confirm("Are you sure you want to withdraw this maintenance complaint?");
    if (!confirmed) return;

    complaints = complaints.filter(c => c.id !== ticketId);
    saveToStorage(STORAGE_KEYS.COMPLAINTS, complaints);
    renderResidentComplaints();
    updateResidentStats();
    playClickChirp();
    showToast(`Ticket ${ticketId} withdrawn.`, "ℹ️");
}

function reopenComplaint(ticketId) {
    const ticket = complaints.find(c => c.id === ticketId);
    if (ticket) {
        ticket.status = "In Review";
        saveToStorage(STORAGE_KEYS.COMPLAINTS, complaints);
        renderResidentComplaints();
        updateResidentStats();
        playClickChirp();
        showToast(`Ticket ${ticketId} re-opened for inspection.`, "🔄");
    }
}

// --------------------------------------------------------------------------
// SOCIETY EVENTS & INTERACTIVE RSVP
// --------------------------------------------------------------------------

function renderSocietyEvents() {
    const container = document.getElementById("eventsContainer");
    if (!container) return;

    container.innerHTML = "";

    DEFAULT_EVENTS.forEach(event => {
        const isAttending = !!rsvpState[event.id];
        const attendeeCount = event.baseAttendees + (isAttending ? 1 : 0);

        const rsvpBtnClass = isAttending ? "btn-rsvp attending" : "btn-rsvp";
        const rsvpBtnText = isAttending ? `✓ Attending (${attendeeCount})` : `RSVP Now (${attendeeCount})`;

        const div = document.createElement("div");
        div.className = "event-item";
        div.innerHTML = `
            <div class="event-date-box">
                <strong>${event.day}</strong>
                <span>${event.month}</span>
            </div>
            <div class="event-details" style="flex: 1;">
                <strong>${event.title}</strong>
                <small>${event.venue}</small>
                <div style="font-size: 11px; color: #cbd5e1; margin-top: 4px; display: none;" id="desc-${event.id}">
                    ${event.description}
                </div>
            </div>
            <div class="event-right-actions">
                <button type="button" class="${rsvpBtnClass}" onclick="toggleEventRSVP('${event.id}')">
                    ${rsvpBtnText}
                </button>
                <span class="btn-event-cal" onclick="downloadEventCalendar('${event.id}')" title="Download iCalendar file">
                    📅 Add to Calendar
                </span>
                <span class="btn-event-cal" onclick="toggleEventDetails('${event.id}')" style="font-size: 10px;">
                    Details ▾
                </span>
            </div>
        `;
        container.appendChild(div);
    });
}

function toggleEventRSVP(eventId) {
    const current = !!rsvpState[eventId];
    rsvpState[eventId] = !current;
    saveToStorage(STORAGE_KEYS.RSVP, rsvpState);

    renderSocietyEvents();

    if (!current) {
        playSuccessChirp();
        showToast("🎉 RSVP Confirmed! Looking forward to seeing you there.", "🎉");
    } else {
        playClickChirp();
        showToast("RSVP cancelled for Flat A-204.", "ℹ️");
    }
}

function toggleEventDetails(eventId) {
    const el = document.getElementById(`desc-${eventId}`);
    if (el) {
        el.style.display = el.style.display === "none" ? "block" : "none";
    }
}

function downloadEventCalendar(eventId) {
    const event = DEFAULT_EVENTS.find(e => e.id === eventId);
    if (!event) return;

    // Generate .ics calendar payload
    const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//NexSociety//Community Calendar//EN",
        "BEGIN:VEVENT",
        `SUMMARY:${event.title}`,
        `DESCRIPTION:${event.description}`,
        `LOCATION:${event.venue}`,
        `DTSTART:202610${event.day.padStart(2, '0')}T183000Z`,
        `DTEND:202610${event.day.padStart(2, '0')}T213000Z`,
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute("download", `${event.title.replace(/[^a-zA-Z0-9]/g, "_")}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    playClickChirp();
    showToast(`📅 Calendar invite downloaded for "${event.title}"!`, "✓");
}

// --------------------------------------------------------------------------
// MAINTENANCE & INVOICING DESK
// --------------------------------------------------------------------------

function switchMaintenanceTab(tab) {
    const currentTabEl = document.getElementById("maintCurrentTab");
    const historyTabEl = document.getElementById("maintHistoryTab");
    const btnCurrent = document.getElementById("tabBtnCurrentBill");
    const btnHistory = document.getElementById("tabBtnHistory");

    if (tab === "current") {
        currentTabEl.style.display = "block";
        historyTabEl.style.display = "none";
        btnCurrent.classList.add("active");
        btnHistory.classList.remove("active");
    } else {
        currentTabEl.style.display = "none";
        historyTabEl.style.display = "block";
        btnCurrent.classList.remove("active");
        btnHistory.classList.add("active");
    }
}

function openOfficialReceiptModal(period, amount, invoiceNo, date) {
    document.getElementById("rcptNumber").textContent = invoiceNo || "#NX-2026-10204";
    document.getElementById("rcptPeriod").textContent = period || "October 2026";
    document.getElementById("rcptDate").textContent = date || "02 Oct 2026";
    document.getElementById("rcptTotal").textContent = amount || "₹4,250.00";

    openModal("receiptModal");
}

function printReceiptSlip() {
    window.print();
}

function openAdvancePaymentModal() {
    closeModal("maintenanceModal");
    openModal("paymentModal");
}

function togglePaymentFields() {
    const method = document.getElementById("payMethod").value;
    const upiField = document.getElementById("upiField");
    const cardField = document.getElementById("cardField");

    if (method === "upi") {
        upiField.style.display = "block";
        cardField.style.display = "none";
    } else if (method === "card") {
        upiField.style.display = "none";
        cardField.style.display = "block";
    } else {
        upiField.style.display = "none";
        cardField.style.display = "none";
    }
}

function handleAdvancePayment(e) {
    e.preventDefault();

    const submitBtn = document.getElementById("btnPaySubmit");
    submitBtn.textContent = "Authorizing Bank Transaction...";
    submitBtn.style.pointerEvents = "none";
    submitBtn.style.opacity = "0.7";

    setTimeout(() => {
        maintenanceState.novemberPaid = true;
        maintenanceState.novemberReceipt = "#NX-2026-11204";
        saveToStorage(STORAGE_KEYS.MAINTENANCE, maintenanceState);

        submitBtn.textContent = "Pay ₹4,250 Now →";
        submitBtn.style.pointerEvents = "auto";
        submitBtn.style.opacity = "1";

        closeModal("paymentModal");
        playTriumphFanfare();

        // Update stat display
        const statAmount = document.getElementById("statMaintenanceAmount");
        if (statAmount) statAmount.textContent = "₹8,500";

        showToast("🎉 Payment Successful! November maintenance advance confirmed.", "✓");

        // Show receipt for November
        openOfficialReceiptModal("November 2026", "₹4,250.00", "#NX-2026-11204", "Today");
    }, 1200);
}

// --------------------------------------------------------------------------
// PARKING BAY & TEMPORARY GUEST SLOT REQUEST
// --------------------------------------------------------------------------

function handleRequestVisitorParking(e) {
    e.preventDefault();

    const plate = document.getElementById("visitorParkingPlate").value.trim();
    const duration = document.getElementById("visitorParkingDuration").value;

    if (!plate) return;

    // Allocate random available visitor slot V-01 to V-10
    const slotNumber = "V-" + String(Math.floor(1 + Math.random() * 9)).padStart(2, "0");

    // Sync with vehicles in LocalStorage
    const vehicles = loadFromStorage(STORAGE_KEYS.VEHICLES, []);
    vehicles.unshift({
        plate: plate,
        flat: "A-204",
        slot: slotNumber,
        type: "Guest Vehicle",
        allocatedAt: "Just now",
        duration: duration
    });
    saveToStorage(STORAGE_KEYS.VEHICLES, vehicles);

    closeModal("parkingModal");
    document.getElementById("visitorParkingPlate").value = "";

    playSuccessChirp();
    showToast(`✓ Guest Slot ${slotNumber} allocated for ${plate} (${duration})! Gate 1 notified.`, "🅿️");
}

function reportParkingDispute() {
    closeModal("parkingModal");
    startIntercomCall();
    showToast("Connecting you directly to Gate 1 security guard to report obstruction.", "⚠️");
}

// --------------------------------------------------------------------------
// GATE 1 INTERCOM TWO-WAY AUDIO SIMULATION
// --------------------------------------------------------------------------

function startIntercomCall() {
    openModal("intercomModal");

    const statusText = document.getElementById("intercomStatusText");
    const subtext = document.getElementById("intercomSubtext");
    const timer = document.getElementById("intercomTimer");
    const pulseAvatar = document.getElementById("intercomPulseAvatar");

    if (statusText) statusText.textContent = "Ringing Gate 1 Terminal...";
    if (subtext) subtext.textContent = "Calling Security Guard Vikram Singh (Ext #001)...";
    if (timer) timer.textContent = "00:00";
    if (pulseAvatar) pulseAvatar.style.background = "linear-gradient(135deg, #6366f1, #3b82f6)";

    intercomSeconds = 0;
    playTelephoneRingCadence();

    // After 2.5 seconds, simulate guard answering the call
    setTimeout(() => {
        stopTelephoneRing();

        if (statusText) {
            statusText.textContent = "Connected • Guard Vikram Singh on Line";
            statusText.style.color = "#34d399";
        }
        if (subtext) subtext.textContent = "Two-way voice channel open. Microphones active.";
        if (pulseAvatar) pulseAvatar.style.background = "linear-gradient(135deg, #10b981, #059669)";

        playBeepTone(880, 0.15); // Connect beep

        // Start call timer
        clearInterval(intercomTimerInterval);
        intercomTimerInterval = setInterval(() => {
            intercomSeconds++;
            const mins = String(Math.floor(intercomSeconds / 60)).padStart(2, "0");
            const secs = String(intercomSeconds % 60).padStart(2, "0");
            if (timer) timer.textContent = `${mins}:${secs}`;
        }, 1000);

        showToast("📞 Gate 1 Intercom Connected! Guard Vikram Singh is listening.", "📞");
    }, 2400);
}

function endIntercomCall() {
    stopTelephoneRing();
    clearInterval(intercomTimerInterval);

    playBeepTone(440, 0.2); // Hangup tone

    closeModal("intercomModal");
    showToast("Intercom call ended.", "ℹ️");
}

function playTelephoneRingCadence() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;

        intercomAudioContext = new AudioCtx();

        // Generate standard dual-frequency telephone ring (440Hz + 480Hz)
        intercomOscillator1 = intercomAudioContext.createOscillator();
        intercomOscillator2 = intercomAudioContext.createOscillator();
        const gain = intercomAudioContext.createGain();

        intercomOscillator1.frequency.value = 440;
        intercomOscillator2.frequency.value = 480;

        intercomOscillator1.connect(gain);
        intercomOscillator2.connect(gain);
        gain.connect(intercomAudioContext.destination);

        // Pulsing ring volume
        gain.gain.setValueAtTime(0.06, intercomAudioContext.currentTime);

        intercomOscillator1.start();
        intercomOscillator2.start();
    } catch (e) {}
}

function stopTelephoneRing() {
    try {
        if (intercomOscillator1) {
            intercomOscillator1.stop();
            intercomOscillator1.disconnect();
            intercomOscillator1 = null;
        }
        if (intercomOscillator2) {
            intercomOscillator2.stop();
            intercomOscillator2.disconnect();
            intercomOscillator2 = null;
        }
        if (intercomAudioContext) {
            intercomAudioContext.close();
            intercomAudioContext = null;
        }
    } catch (e) {}
}

function playBeepTone(freq, duration) {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    } catch (e) {}
}

// --------------------------------------------------------------------------
// NOTIFICATION BELL & QUICK DROPDOWN
// --------------------------------------------------------------------------

function toggleNotificationsDropdown() {
    const dropdown = document.getElementById("notificationsDropdown");
    if (!dropdown) return;
    dropdown.classList.toggle("show");
}

function clearNotifications() {
    const list = document.getElementById("notifListContainer");
    const badge = document.getElementById("notifBadge");
    if (list) list.innerHTML = `<div style="text-align:center; padding: 12px; color: var(--text-muted); font-size: 11px;">All caught up! No unread notifications.</div>`;
    if (badge) badge.style.display = "none";
    showToast("Notifications cleared.", "✓");
}

// --------------------------------------------------------------------------
// STATS UPDATE & SCROLL UTILITY
// --------------------------------------------------------------------------

function updateResidentStats() {
    const flatVisitors = preapproved.filter(v => (v.flat || "").toUpperCase().includes("A-204"));
    const openTickets = complaints.filter(c => c.status !== "Resolved");

    const visitorCountEl = document.getElementById("statVisitorCount");
    const complaintCountEl = document.getElementById("statComplaintCount");
    const complaintTagEl = document.getElementById("statComplaintTag");
    const navBadge = document.getElementById("navComplaintBadge");

    if (visitorCountEl) {
        visitorCountEl.textContent = String(flatVisitors.length).padStart(2, "0");
    }
    if (complaintCountEl) {
        complaintCountEl.textContent = String(openTickets.length).padStart(2, "0");
    }
    if (complaintTagEl) {
        complaintTagEl.textContent = `${openTickets.length} OPEN`;
    }
    if (navBadge) {
        navBadge.textContent = openTickets.length;
    }
}

function scrollToSection(id) {
    const target = document.getElementById(id);
    if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        target.style.transition = "box-shadow 0.4s ease";
        target.style.boxShadow = "0 0 25px rgba(99, 102, 241, 0.45)";
        setTimeout(() => {
            target.style.boxShadow = "";
        }, 1200);
    }
}

function handleSignOut(e) {
    e.preventDefault();
    localStorage.removeItem("nexSocietyRole");
    showToast("Signing out of Resident Portal...", "👋");
    setTimeout(() => {
        window.location.href = "index.html";
    }, 600);
}

// --------------------------------------------------------------------------
// MODAL CONTROLS & OUTSIDE CLICK
// --------------------------------------------------------------------------

function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;

    if (id === "noticesModal") {
        renderAllNoticesModal();
    }

    modal.classList.add("show");
    playClickChirp();
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove("show");
    }
}

function initGlobalModalDismiss() {
    window.addEventListener("click", (e) => {
        if (e.target.classList && e.target.classList.contains("modal")) {
            e.target.classList.remove("show");
        }

        // Close notifications dropdown if clicking outside
        const bellBox = document.querySelector(".notification-bell-box");
        const dropdown = document.getElementById("notificationsDropdown");
        if (dropdown && bellBox && !bellBox.contains(e.target)) {
            dropdown.classList.remove("show");
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            document.querySelectorAll(".modal.show").forEach(m => m.classList.remove("show"));
            const dropdown = document.getElementById("notificationsDropdown");
            if (dropdown) dropdown.classList.remove("show");
            if (intercomAudioContext) endIntercomCall();
        }
    });
}

// --------------------------------------------------------------------------
// AUDIO FEEDBACK SYNTHESIZER
// --------------------------------------------------------------------------

function playClickChirp() {
    playBeepTone(659.25, 0.05); // High E5 tap
}

function playSuccessChirp() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.07); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.14); // G5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.28);
    } catch (e) {}
}

function playTriumphFanfare() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.3); // C6
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);
    } catch (e) {}
}

// --------------------------------------------------------------------------
// TOAST NOTIFICATION UTILITY
// --------------------------------------------------------------------------

let toastTimeout = null;
function showToast(message, icon = "✓") {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");
    const toastIcon = document.getElementById("toastIcon");

    if (!toast) return;

    if (toastMessage) toastMessage.textContent = message;
    if (toastIcon) toastIcon.textContent = icon;

    toast.classList.add("active");
    toast.classList.add("show");

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove("active");
        toast.classList.remove("show");
    }, 3200);
}
