const STORAGE_KEYS = {
    VISITORS: "nexSociety_visitors",
    PREAPPROVED: "nexSociety_preapproved",
    VEHICLES: "nexSociety_vehicles",
    INCIDENTS: "nexSociety_incidents"
};

const DEFAULT_VISITORS = [
    {
        id: "VIS-101",
        name: "Rahul Sharma",
        phone: "+91 98201 44521",
        flat: "A-204",
        resident: "Aryan Sharma",
        purpose: "guest",
        vehicle: "MH-02-CD-4421",
        inTime: "10:15 AM",
        outTime: "-",
        status: "inside",
        avatar: "RS",
        avatarClass: ""
    },
    {
        id: "VIS-102",
        name: "Swiggy Delivery (Karan)",
        phone: "+91 91234 56789",
        flat: "B-102",
        resident: "Neha Verma",
        purpose: "delivery",
        vehicle: "MH-02-EZ-8902",
        inTime: "10:28 AM",
        outTime: "-",
        status: "inside",
        avatar: "🍔",
        avatarClass: "delivery"
    },
    {
        id: "VIS-103",
        name: "Uber Auto (Sunil Yadav)",
        phone: "+91 99887 76655",
        flat: "C-404",
        resident: "Dr. K. Mehta",
        purpose: "cab",
        vehicle: "MH-03-TA-1120",
        inTime: "10:35 AM",
        outTime: "-",
        status: "inside",
        avatar: "🚖",
        avatarClass: "cab"
    },
    {
        id: "VIS-104",
        name: "Urban Company (Rajesh)",
        phone: "+91 98765 01234",
        flat: "A-501",
        resident: "Vikram Malhotra",
        purpose: "service",
        vehicle: "Walking",
        inTime: "09:40 AM",
        outTime: "10:30 AM",
        status: "checked-out",
        avatar: "🛠️",
        avatarClass: "service"
    },
    {
        id: "VIS-105",
        name: "Blinkit Grocery (Anand)",
        phone: "+91 90012 34567",
        flat: "B-303",
        resident: "Suresh Gupta",
        purpose: "delivery",
        vehicle: "MH-02-BQ-3312",
        inTime: "10:38 AM",
        outTime: "-",
        status: "inside",
        avatar: "⚡",
        avatarClass: "delivery"
    },
    {
        id: "VIS-106",
        name: "Priya Shah",
        phone: "+91 97654 32109",
        flat: "A-204",
        resident: "Aryan Sharma",
        purpose: "guest",
        vehicle: "MH-01-AX-9900",
        inTime: "08:50 AM",
        outTime: "10:10 AM",
        status: "checked-out",
        avatar: "PS",
        avatarClass: ""
    }
];

const DEFAULT_PREAPPROVED = [
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
    },
    {
        id: "PRE-03",
        name: "Amit Kumar (Electrician)",
        flat: "C-501",
        resident: "K. Rao",
        passNumber: "Service Pass",
        vehicle: "MH-04-E-1004"
    }
];

function loadFromStorage(key, fallback) {
    try {
        const item = localStorage.getItem(key);
        if (item) {
            return JSON.parse(item);
        }
    } catch (err) {
        console.warn(`Error reading "${key}" from localStorage:`, err);
    }
    saveToStorage(key, fallback);
    return JSON.parse(JSON.stringify(fallback));
}

function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
        console.error(`Error saving "${key}" to localStorage:`, err);
    }
}

// Global dashboard state
let visitors = loadFromStorage(STORAGE_KEYS.VISITORS, DEFAULT_VISITORS);
let preapproved = loadFromStorage(STORAGE_KEYS.PREAPPROVED, DEFAULT_PREAPPROVED);
let vehicles = loadFromStorage(STORAGE_KEYS.VEHICLES, []);
let incidents = loadFromStorage(STORAGE_KEYS.INCIDENTS, []);

let activeTabFilter = "all";
let searchFilterQuery = "";

document.addEventListener("DOMContentLoaded", () => {
    initLiveClock();
    renderGateTable();
    renderPreapprovedList();
    updateStatCounters();
    initSearchAndFilter();
    initOtpBoxes();
});

function initLiveClock() {
    const clockEl = document.getElementById("liveClock");
    if (!clockEl) return;

    function tick() {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
        });
    }

    tick();
    setInterval(tick, 1000);
}

// Table Rendering & Filters
// ========================================================
function renderGateTable() {
    const tbody = document.getElementById("gateTableBody");
    if (!tbody) return;

    // Apply active filters
    const filtered = visitors.filter(entry => {
        // Tab condition
        let matchTab = true;
        if (activeTabFilter === "inside") {
            matchTab = (entry.status === "inside");
        } else if (activeTabFilter === "delivery") {
            matchTab = (entry.purpose === "delivery");
        } else if (activeTabFilter === "cab") {
            matchTab = (entry.purpose === "cab");
        } else if (activeTabFilter === "checked-out") {
            matchTab = (entry.status === "checked-out");
        }

        // Search condition
        let matchSearch = true;
        if (searchFilterQuery.trim() !== "") {
            const query = searchFilterQuery.toLowerCase().trim();
            matchSearch = (
                (entry.name && entry.name.toLowerCase().includes(query)) ||
                (entry.flat && entry.flat.toLowerCase().includes(query)) ||
                (entry.phone && entry.phone.toLowerCase().includes(query)) ||
                (entry.vehicle && entry.vehicle.toLowerCase().includes(query)) ||
                (entry.resident && entry.resident.toLowerCase().includes(query))
            );
        }

        return matchTab && matchSearch;
    });

    tbody.innerHTML = "";

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 36px 16px; color: var(--text-muted);">
                    <div style="font-size: 24px; margin-bottom: 6px;">🔍</div>
                    <strong>No gate entries match your filter</strong>
                    <p style="font-size: 11px; margin-top: 4px;">Try searching for a different name, flat, or resetting the filter.</p>
                </td>
            </tr>
        `;
        updateTableFooterText(0, visitors.length);
        return;
    }

    filtered.forEach(item => {
        const tr = document.createElement("tr");

        let actionHtml = "";
        if (item.status === "inside") {
            actionHtml = `
                <div class="row-actions">
                    <button type="button" class="btn-out" onclick="checkoutVisitor('${item.id}')" title="Check Out">
                        Out ↗
                    </button>
                    <button type="button" class="btn-icon-sm" onclick="callResident('${item.flat}', '${item.resident}')" title="Call Flat">
                        📞
                    </button>
                    <button type="button" class="btn-icon-sm delete" onclick="deleteVisitorEntry('${item.id}')" title="Delete Entry" style="color: var(--danger);">
                        🗑️
                    </button>
                </div>
            `;
        } else {
            actionHtml = `
                <div class="row-actions">
                    <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Left at ${item.outTime}</span>
                    <button type="button" class="btn-icon-sm delete" onclick="deleteVisitorEntry('${item.id}')" title="Delete Entry" style="color: var(--danger); margin-left: 6px;">
                        🗑️
                    </button>
                </div>
            `;
        }

        tr.innerHTML = `
            <td>
                <div class="visitor-cell">
                    <div class="visitor-avatar ${item.avatarClass || ''}">
                        ${item.avatar || 'VIS'}
                    </div>
                    <div class="visitor-info">
                        <strong>${item.name}</strong>
                        <span>${item.phone || 'Phone not given'}</span>
                    </div>
                </div>
            </td>
            <td>
                <div class="visitor-info">
                    <strong>${item.flat}</strong>
                    <span>${item.resident || 'Resident'}</span>
                </div>
            </td>
            <td>
                <span class="purpose-badge ${item.purpose}">
                    ${(item.purpose || 'guest').toUpperCase()}
                </span>
            </td>
            <td>
                <strong style="font-size: 12px; font-family: monospace;">${item.vehicle || 'Walking'}</strong>
            </td>
            <td>
                <div class="visitor-info">
                    <strong>${item.inTime}</strong>
                    <span>Gate 1</span>
                </div>
            </td>
            <td>
                <span class="status-badge ${item.status}">
                    ${item.status === 'inside' ? 'Inside' : 'Checked Out'}
                </span>
            </td>
            <td>
                ${actionHtml}
            </td>
        `;

        tbody.appendChild(tr);
    });

    updateTableFooterText(filtered.length, visitors.length);
}

function updateTableFooterText(shown, total) {
    const footerText = document.getElementById("showingEntriesText");
    if (footerText) {
        footerText.textContent = `Showing ${shown} of ${total} total gate entries (Stored in LocalStorage)`;
    }
}

function renderPreapprovedList() {
    const container = document.getElementById("preapprovedListContainer");
    const countBadge = document.getElementById("preapprovedCount");
    const statPreapproved = document.getElementById("statPreapproved");
    const navBadge = document.getElementById("preapprovedBadge");

    if (countBadge) countBadge.textContent = preapproved.length;
    if (navBadge) navBadge.textContent = preapproved.length;
    if (statPreapproved) statPreapproved.textContent = String(preapproved.length).padStart(2, "0");

    if (!container) return;
    container.innerHTML = "";

    if (preapproved.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 12px;">
                <p>✓ All pre-approved visitors have arrived</p>
            </div>
        `;
        return;
    }

    preapproved.forEach(item => {
        const div = document.createElement("div");
        div.className = "preapproved-item";
        div.innerHTML = `
            <div class="pre-info">
                <strong>${item.name}</strong>
                <small>Flat ${item.flat} (${item.resident}) • ${item.passNumber}</small>
            </div>
            <button type="button" class="btn-allow" onclick="allowPreapproved('${item.name.replace(/'/g, "\\'")}', '${item.flat}', '${item.vehicle || 'Walking'}', '${item.id}')">
                Allow In
            </button>
        `;
        container.appendChild(div);
    });
}

function updateStatCounters() {
    const insideCount = visitors.filter(v => v.status === "inside").length;
    const totalCount = visitors.length;
    const deliveriesCount = visitors.filter(v => v.purpose === "delivery" || v.purpose === "cab").length;

    const statInside = document.getElementById("statInside");
    const statTotal = document.getElementById("statTotal");
    const statDeliveries = document.getElementById("statDeliveries");
    const activeVisitorCount = document.getElementById("activeVisitorCount");
    const incidentBadge = document.getElementById("incidentCountBadge");

    if (statInside) statInside.textContent = insideCount;
    if (statTotal) statTotal.textContent = totalCount;
    if (statDeliveries) statDeliveries.textContent = deliveriesCount;
    if (activeVisitorCount) activeVisitorCount.textContent = insideCount;
    if (incidentBadge) incidentBadge.textContent = incidents.length;
}

function initSearchAndFilter() {
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            searchFilterQuery = e.target.value;
            renderGateTable();
        });
    }

    const tabs = document.querySelectorAll(".filter-tab");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            activeTabFilter = tab.dataset.filter || "all";
            renderGateTable();
        });
    });
}

function setTabFilter(filterName) {
    const tab = document.querySelector(`.filter-tab[data-filter="${filterName}"]`);
    if (tab) tab.click();
}

function checkoutVisitor(id) {
    const visitor = visitors.find(v => v.id === id);
    if (!visitor) return;

    const now = new Date();
    visitor.status = "checked-out";
    visitor.outTime = now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });

    saveToStorage(STORAGE_KEYS.VISITORS, visitors);
    renderGateTable();
    updateStatCounters();
    showToast(`✓ ${visitor.name} marked as exited at ${visitor.outTime}`, "✓");
}

function deleteVisitorEntry(id) {
    const visitor = visitors.find(v => v.id === id);
    const visitorName = visitor ? visitor.name : "Visitor";

    if (!confirm(`Are you sure you want to remove the record for "${visitorName}" from LocalStorage?`)) {
        return;
    }

    visitors = visitors.filter(v => v.id !== id);
    saveToStorage(STORAGE_KEYS.VISITORS, visitors);
    renderGateTable();
    updateStatCounters();
    showToast(`🗑️ ${visitorName} removed from LocalStore.`, "ℹ️");
}

function allowPreapproved(name, flat, vehicle, preId) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    const initials = name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();

    const newEntry = {
        id: "VIS-" + Math.floor(100 + Math.random() * 900),
        name: name,
        phone: "+91 98XXX XXXXX",
        flat: flat,
        resident: "Resident",
        purpose: "guest",
        vehicle: vehicle || "Walking",
        inTime: timeStr,
        outTime: "-",
        status: "inside",
        avatar: initials,
        avatarClass: ""
    };

    visitors.unshift(newEntry);
    saveToStorage(STORAGE_KEYS.VISITORS, visitors);

    if (preId) {
        preapproved = preapproved.filter(p => p.id !== preId);
        saveToStorage(STORAGE_KEYS.PREAPPROVED, preapproved);
        renderPreapprovedList();
    }

    renderGateTable();
    updateStatCounters();
    playTerminalSound("success");
    showToast(`✓ Pre-approved visitor ${name} allowed inside (${flat})`, "✓");
}

function callResident(flat, resident) {
    showToast(`📞 Calling resident ${resident || 'Host'} (${flat}) via gate intercom...`, "📞");
}

function quickDeliveryCheckin(provider) {
    const flat = prompt(`Enter destination flat number for ${provider}:`, "A-204");
    if (!flat) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

    let emoji = "📦";
    let avatarClass = "delivery";
    let purpose = "delivery";

    if (provider.toLowerCase().includes("uber") || provider.toLowerCase().includes("cab") || provider.toLowerCase().includes("ola")) {
        emoji = "🚖";
        avatarClass = "cab";
        purpose = "cab";
    }

    const newEntry = {
        id: "VIS-" + Math.floor(100 + Math.random() * 900),
        name: `${provider} Agent`,
        phone: "+91 Partner Delivery",
        flat: flat.toUpperCase().trim(),
        resident: "Resident",
        purpose: purpose,
        vehicle: "2-Wheeler",
        inTime: timeStr,
        outTime: "-",
        status: "inside",
        avatar: emoji,
        avatarClass: avatarClass
    };

    visitors.unshift(newEntry);
    saveToStorage(STORAGE_KEYS.VISITORS, visitors);
    renderGateTable();
    updateStatCounters();
    playTerminalSound("success");
    showToast(`⚡ ${provider} pass issued for Flat ${flat.toUpperCase()}`, "✓");
}

function handleNewVisitor(e) {
    e.preventDefault();

    const name = document.getElementById("visitorName").value.trim();
    const phone = document.getElementById("visitorPhone").value.trim();
    const flat = document.getElementById("visitorFlat").value.trim();
    const purpose = document.getElementById("visitorPurposeSelect").value;
    const vehicle = document.getElementById("visitorVehicle").value.trim() || "Walking";

    if (!name || !flat) {
        showToast("Please enter visitor name and flat number.", "⚠️");
        return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

    let avatar = name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
    let avatarClass = "";

    if (purpose === "delivery") { avatar = "📦"; avatarClass = "delivery"; }
    else if (purpose === "cab") { avatar = "🚖"; avatarClass = "cab"; }
    else if (purpose === "service") { avatar = "🛠️"; avatarClass = "service"; }

    const entry = {
        id: "VIS-" + Math.floor(100 + Math.random() * 900),
        name: name,
        phone: phone || "+91 Not Provided",
        flat: flat.toUpperCase(),
        resident: "Resident",
        purpose: purpose,
        vehicle: vehicle,
        inTime: timeStr,
        outTime: "-",
        status: "inside",
        avatar: avatar,
        avatarClass: avatarClass
    };

    visitors.unshift(entry);
    saveToStorage(STORAGE_KEYS.VISITORS, visitors);

    renderGateTable();
    updateStatCounters();
    closeModal("newVisitorModal");
    document.getElementById("newVisitorForm").reset();
    playTerminalSound("success");
    showToast(`✓ Visitor ${name} recorded & saved in LocalStore!`, "✓");
}

function handleVehicleLog(e) {
    e.preventDefault();

    const plate = document.getElementById("vehiclePlateInput").value.trim().toUpperCase();
    const type = document.getElementById("vehicleTypeSelect").value;
    const flat = document.getElementById("vehicleFlatInput").value.trim().toUpperCase();

    if (!plate || !flat) return;

    const bay = `Bay P-${Math.floor(10 + Math.random() * 40)}`;
    const record = {
        id: "VEH-" + Math.floor(100 + Math.random() * 900),
        plate: plate,
        type: type,
        flat: flat,
        bay: bay,
        time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
    };

    vehicles.unshift(record);
    saveToStorage(STORAGE_KEYS.VEHICLES, vehicles);

    closeModal("vehicleModal");
    document.getElementById("vehiclePlateInput").value = "";
    document.getElementById("vehicleFlatInput").value = "";
    showToast(`🚗 Vehicle ${plate} allocated ${bay} (Saved in LocalStore)`, "✓");
}

function handleIncidentReport(e) {
    e.preventDefault();

    const type = document.getElementById("incidentType").value;
    const location = document.getElementById("incidentLocation").value.trim() || "Gate 1";
    const details = document.getElementById("incidentDetails").value.trim();

    if (!details) return;

    const record = {
        id: "INC-" + Math.floor(100 + Math.random() * 900),
        type: type,
        location: location,
        details: details,
        time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
    };

    incidents.unshift(record);
    saveToStorage(STORAGE_KEYS.INCIDENTS, incidents);

    updateStatCounters();
    closeModal("incidentModal");
    document.getElementById("incidentDetails").value = "";
    showToast("⚠️ Security incident reported and saved in LocalStorage.", "⚠️");
}

function initOtpBoxes() {
    const container = document.getElementById("quickOtpInputs");
    if (!container) return;

    const inputs = container.querySelectorAll(".otp-input");
    inputs.forEach((input, index) => {
        input.addEventListener("input", () => {
            if (input.value.length === 1 && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });

        input.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && !input.value && index > 0) {
                inputs[index - 1].focus();
            }
        });
    });

    const verifyBtn = document.getElementById("verifyOtpBtn");
    if (verifyBtn) {
        verifyBtn.addEventListener("click", () => {
            let code = "";
            inputs.forEach(i => code += i.value);

            if (code.length < 6) {
                showToast("Please enter all 6 digits of the passcode.", "⚠️");
                return;
            }

            // Check if matches any pre-approved pass
            const match = preapproved.find(p => (p.passNumber || "").includes(code));
            if (match) {
                allowPreapproved(match.name, match.flat, match.vehicle, match.id);
            } else {
                playTerminalSound("success");
                showToast(`✓ Passcode #${code} verified! Boom barrier opening.`, "✓");
            }

            inputs.forEach(i => i.value = "");
            inputs[0].focus();
        });
    }
}

function handleModalOtp(e) {
    e.preventDefault();
    const code = document.getElementById("modalOtpInput").value.trim();
    if (code.length < 6) {
        showToast("Enter a valid 6-digit code.", "⚠️");
        return;
    }

    closeModal("otpModal");
    document.getElementById("modalOtpInput").value = "";

    // Check if matches any pre-approved pass
    const match = preapproved.find(p => (p.passNumber || "").replace("#", "").includes(code.replace("#", "")));
    if (match) {
        allowPreapproved(match.name, match.flat, match.vehicle, match.id);
    } else {
        playTerminalSound("success");
        showToast(`✓ Invitation Code #${code} verified! Boom barrier opening.`, "✓");
    }
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

function triggerSosModal() {
    const confirmed = confirm("🚨 ATTENTION: Sound the Gate Emergency Alarm and notify security supervisor?");
    if (confirmed) {
        const sosRecord = {
            id: "SOS-" + Date.now(),
            type: "Emergency SOS Alarm",
            location: "Gate 1 Terminal",
            details: "Security guard triggered emergency panic button.",
            time: new Date().toLocaleTimeString("en-IN")
        };
        incidents.unshift(sosRecord);
        saveToStorage(STORAGE_KEYS.INCIDENTS, incidents);
        updateStatCounters();
        playTerminalSound("alarm");
        showToast("🚨 EMERGENCY ALARM TRIGGERED! Alert logged in LocalStore.", "🚨");
    }
}

function exportGateLog() {
    if (!visitors || visitors.length === 0) {
        showToast("No entries available to export.", "ℹ️");
        return;
    }

    const headers = ["Entry ID", "Visitor Name", "Phone", "Flat", "Resident Host", "Purpose", "Vehicle", "Entry Time", "Exit Time", "Status"];
    const rows = visitors.map(v => [
        `"${v.id || ''}"`,
        `"${v.name || ''}"`,
        `"${v.phone || ''}"`,
        `"${v.flat || ''}"`,
        `"${v.resident || ''}"`,
        `"${v.purpose || ''}"`,
        `"${v.vehicle || ''}"`,
        `"${v.inTime || ''}"`,
        `"${v.outTime || ''}"`,
        `"${v.status || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encoded = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encoded);
    link.setAttribute("download", `NexSociety_GateLog_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("📄 Exported Gate Log CSV successfully from LocalStore!", "✓");
}

window.NexSocietyStorage = {
    addVisitor(data) {
        const id = data.id || "VIS-" + Math.floor(100 + Math.random() * 900);
        const entry = {
            id: id,
            name: data.name || "Guest",
            phone: data.phone || "+91 Not Provided",
            flat: (data.flat || "A-101").toUpperCase(),
            resident: data.resident || "Resident",
            purpose: data.purpose || "guest",
            vehicle: data.vehicle || "Walking",
            inTime: data.inTime || new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
            outTime: data.outTime || "-",
            status: data.status || "inside",
            avatar: data.avatar || (data.name ? data.name.substring(0, 2).toUpperCase() : "VI"),
            avatarClass: data.avatarClass || ""
        };
        visitors.unshift(entry);
        saveToStorage(STORAGE_KEYS.VISITORS, visitors);
        renderGateTable();
        updateStatCounters();
        return entry;
    },
    getAllData() {
        return {
            visitors: visitors,
            preapproved: preapproved,
            vehicles: vehicles,
            incidents: incidents
        };
    }
};

function playTerminalSound(type = "success") {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        const audioCtx = new AudioContextClass();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === "success") {
            // Futuristic double authorization chirp
            osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
            osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.08); // A5
            gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.28);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.28);
        } else if (type === "alarm") {
            // Siren alarm beep
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(440, audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(880, audioCtx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.4);
        }
    } catch (e) {
        // Fallback silently if audio context blocked
    }
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
    }, 2800);
}
