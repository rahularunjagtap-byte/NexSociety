

const STORAGE_KEYS = {
    VISITORS: "nexSociety_visitors",
    PREAPPROVED: "nexSociety_preapproved",
    COMPLAINTS: "nexSociety_complaints"
};


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

// Active Pre-approvals state
let preapproved = loadFromStorage(STORAGE_KEYS.PREAPPROVED, [
    {
        id: "PRE-01",
        name: "Rahul Sharma",
        flat: "A-204",
        resident: "Aryan Sharma",
        passNumber: "#9402",
        vehicle: "MH-02-CD-4421"
    },
    {
        id: "PRE-02",
        name: "Priya Shah",
        flat: "A-204",
        resident: "Aryan Sharma",
        passNumber: "Expected 7:00 PM",
        vehicle: "Walking"
    }
]);

let complaints = loadFromStorage(STORAGE_KEYS.COMPLAINTS, [
    {
        id: "CMP-101",
        category: "Plumbing",
        details: "Low water pressure in kitchen sink tap.",
        date: "Today, 09:30 AM",
        status: "In Review"
    }
]);


document.addEventListener("DOMContentLoaded", () => {
    initResidentDate();
    initResidentGreeting();
    renderExpectedVisitors();
    updateResidentStats();
});

// Format today's date
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

// Personalize greeting from login session
function initResidentGreeting() {
    const loggedUser = localStorage.getItem("nexSocietyUser");
    const greetingEl = document.getElementById("residentGreeting");

    if (loggedUser && greetingEl) {
        const username = loggedUser.split("@")[0];
        const formatted = username.charAt(0).toUpperCase() + username.slice(1);
        greetingEl.textContent = `Good day, ${formatted} 👋`;
    }
}


function renderExpectedVisitors() {
    const container = document.getElementById("expectedVisitorsContainer");
    if (!container) return;

    // Filter pre-approved passes for Flat A-204
    const flatVisitors = preapproved.filter(v => (v.flat || "").toUpperCase().includes("A-204"));

    container.innerHTML = "";

    if (flatVisitors.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 13px;">
                <p>No expected visitors scheduled for today.</p>
                <button type="button" class="btn-text" style="margin-top: 6px;" onclick="openModal('preapproveModal')">
                    + Invite your first guest
                </button>
            </div>
        `;
        return;
    }

    flatVisitors.forEach(guest => {
        const initials = guest.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
        const div = document.createElement("div");
        div.className = "visitor-item";
        div.innerHTML = `
            <div class="visitor-left">
                <div class="visitor-avatar-badge">${initials}</div>
                <div class="visitor-meta">
                    <strong>${guest.name}</strong>
                    <small>Vehicle: ${guest.vehicle || 'Walking'}</small>
                </div>
            </div>
            <span class="passcode-pill">Pass ${guest.passNumber}</span>
        `;
        container.appendChild(div);
    });
}


function updateResidentStats() {
    const flatVisitors = preapproved.filter(v => (v.flat || "").toUpperCase().includes("A-204"));
    const visitorCountEl = document.getElementById("statVisitorCount");
    const complaintCountEl = document.getElementById("statComplaintCount");

    if (visitorCountEl) {
        visitorCountEl.textContent = String(flatVisitors.length).padStart(2, "0");
    }
    if (complaintCountEl) {
        complaintCountEl.textContent = String(complaints.length).padStart(2, "0");
    }
}


function handlePreapproveVisitor(e) {
    e.preventDefault();

    const name = document.getElementById("preName").value.trim();
    const phone = document.getElementById("prePhone").value.trim();
    const vehicle = document.getElementById("preVehicle").value.trim() || "Walking";
    const purpose = document.getElementById("prePurpose").value;

    if (!name) return;

    // Generate random 6-digit passcode for gate security
    const passCode = "#" + Math.floor(100000 + Math.random() * 900000);

    const newGuest = {
        id: "PRE-" + Math.floor(10 + Math.random() * 90),
        name: name,
        phone: phone || "+91 98XXX XXXXX",
        flat: "A-204",
        resident: "Aryan Sharma",
        vehicle: vehicle,
        purpose: purpose,
        passNumber: passCode
    };

    preapproved.unshift(newGuest);
    // Save to LocalStorage so Security Gate instantly receives it!
    saveToStorage(STORAGE_KEYS.PREAPPROVED, preapproved);

    renderExpectedVisitors();
    updateResidentStats();
    closeModal("preapproveModal");
    document.getElementById("preapproveForm").reset();

    playAudioChirp();
    showToast(`✓ Guest "${name}" pre-approved! Passcode: ${passCode} sent to Gate.`, "🔑");
}

function handleRaiseComplaint(e) {
    e.preventDefault();

    const category = document.getElementById("complaintCategory").value;
    const details = document.getElementById("complaintDetails").value.trim();

    if (!details) return;

    const newComplaint = {
        id: "CMP-" + Math.floor(100 + Math.random() * 900),
        category: category,
        details: details,
        date: "Just now",
        status: "In Review"
    };

    complaints.unshift(newComplaint);
    saveToStorage(STORAGE_KEYS.COMPLAINTS, complaints);

    updateResidentStats();
    closeModal("complaintModal");
    document.getElementById("complaintDetails").value = "";

    showToast("✓ Complaint ticket submitted! Maintenance team notified.", "✓");
}


function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add("show");
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove("show");
}

window.addEventListener("click", (e) => {
    if (e.target.classList && e.target.classList.contains("modal")) {
        e.target.classList.remove("show");
    }
});

function playAudioChirp() {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
}


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
    }, 3200);
}
