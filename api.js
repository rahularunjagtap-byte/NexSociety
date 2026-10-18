/**
 * NexSociety - Universal API & Backend Client
 * Connects frontend portals seamlessly to Node.js/PostgreSQL backend
 * Falls back gracefully to localStorage if backend is offline.
 */

const API_BASE_URL = window.location.origin.includes(":5000") 
    ? window.location.origin + "/api" 
    : "http://localhost:5000/api";

const NexAPI = {
    // Health Check
    async checkHealth() {
        try {
            const res = await fetch(`${API_BASE_URL}/health`);
            return await res.json();
        } catch (e) {
            return { status: "offline", error: e.message };
        }
    },

    // 1. Auth APIs
    async login(email, password, role) {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, role })
            });
            const data = await res.json();
            return data;
        } catch (e) {
            console.error("API login network error:", e);
            return { success: false, message: "Cannot reach NexSociety server. Check backend connection." };
        }
    },

    // 2. Visitors & Gate APIs
    async getVisitors(params = {}) {
        try {
            const query = new URLSearchParams(params).toString();
            const res = await fetch(`${API_BASE_URL}/visitors?${query}`);
            return await res.json();
        } catch (e) {
            return null;
        }
    },

    async checkInVisitor(visitorData) {
        try {
            const res = await fetch(`${API_BASE_URL}/visitors/check-in`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(visitorData)
            });
            return await res.json();
        } catch (e) {
            return null;
        }
    },

    async checkOutVisitor(id) {
        try {
            const res = await fetch(`${API_BASE_URL}/visitors/${id}/check-out`, { method: "PUT" });
            return await res.json();
        } catch (e) {
            return null;
        }
    },

    // Pre-approved passes
    async createPreapprovedPass(passData) {
        try {
            const res = await fetch(`${API_BASE_URL}/visitors/preapproved`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(passData)
            });
            return await res.json();
        } catch (e) {
            return null;
        }
    },

    async verifyPassOtp(otp) {
        try {
            const res = await fetch(`${API_BASE_URL}/visitors/preapproved/verify-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ otp })
            });
            return await res.json();
        } catch (e) {
            return null;
        }
    },

    // 3. Complaints APIs
    async getComplaints(params = {}) {
        try {
            const query = new URLSearchParams(params).toString();
            const res = await fetch(`${API_BASE_URL}/complaints?${query}`);
            return await res.json();
        } catch (e) {
            return null;
        }
    },

    async createComplaint(data) {
        try {
            const res = await fetch(`${API_BASE_URL}/complaints`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            return await res.json();
        } catch (e) {
            return null;
        }
    },

    async resolveComplaint(id) {
        try {
            const res = await fetch(`${API_BASE_URL}/complaints/${id}/resolve`, { method: "PUT" });
            return await res.json();
        } catch (e) {
            return null;
        }
    },

    // 4. Notices APIs
    async getNotices() {
        try {
            const res = await fetch(`${API_BASE_URL}/notices`);
            return await res.json();
        } catch (e) {
            return null;
        }
    },

    async publishNotice(noticeData) {
        try {
            const res = await fetch(`${API_BASE_URL}/notices`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(noticeData)
            });
            return await res.json();
        } catch (e) {
            return null;
        }
    },

    // 5. Maintenance Dues APIs
    async getFlatsDirectory(params = {}) {
        try {
            const query = new URLSearchParams(params).toString();
            const res = await fetch(`${API_BASE_URL}/dues/directory?${query}`);
            return await res.json();
        } catch (e) {
            return null;
        }
    },

    async payDues(flat_number, payment_mode = "UPI") {
        try {
            const res = await fetch(`${API_BASE_URL}/dues/pay`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ flat_number, payment_mode })
            });
            return await res.json();
        } catch (e) {
            return null;
        }
    },

    async addFlatResident(flatData) {
        try {
            const res = await fetch(`${API_BASE_URL}/dues/add-flat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(flatData)
            });
            return await res.json();
        } catch (e) {
            return null;
        }
    }
};

window.NexAPI = NexAPI;
