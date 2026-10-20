/**
 * NexSociety - Firebase Config & Modular Service Connector (firebase-config.js)
 * Provides seamless integration with Firebase Auth & Cloud Firestore.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a Project named "NexSociety"
 * 3. Add a Web App (</>) and copy your firebaseConfig keys below.
 * 4. Enable "Email/Password" in Firebase Authentication > Sign-in method.
 * 5. Create Cloud Firestore database in "Test Mode" (or allow read/write for auth users).
 */

const firebaseConfig = {
    apiKey: "AIzaSyBKL6qY4dffpgyMLzVZjwtQ1EZZ_aHsu8s",
    authDomain: "nexsociety-b4311.firebaseapp.com",
    databaseURL: "https://nexsociety-b4311-default-rtdb.firebaseio.com",
    projectId: "nexsociety-b4311",
    storageBucket: "nexsociety-b4311.firebasestorage.app",
    messagingSenderId: "625119396196",
    appId: "1:625119396196:web:e81eb22223a727d702ba71",
    measurementId: "G-Z3C5PBS814"
};

// Global Firebase Wrapper
window.NexFirebase = {
    isConfigured: false,
    app: null,
    auth: null,
    db: null,
    rtdb: null,

    // Initialize Firebase SDK
    init() {
        if (typeof firebase === "undefined") {
            console.info("Firebase SDK not loaded on this page.");
            return false;
        }

        // Check if user has pasted real config keys
        if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("YOUR_FIREBASE")) {
            console.info("Firebase: Ready to connect. Add your Firebase keys in firebase-config.js to activate cloud sync.");
            return false;
        }

        try {
            if (!firebase.apps.length) {
                this.app = firebase.initializeApp(firebaseConfig);
            } else {
                this.app = firebase.app();
            }
            if (firebase.auth) this.auth = firebase.auth();
            if (firebase.firestore) this.db = firebase.firestore();
            if (firebase.database) this.rtdb = firebase.database();
            this.isConfigured = true;
            console.log("✓ Firebase & Realtime Database successfully connected to NexSociety!");
            return true;
        } catch (err) {
            console.error("Firebase initialization failed:", err);
            return false;
        }
    },

    // ----------------------------------------------------
    // AUTHENTICATION
    // ----------------------------------------------------
    async login(email, password) {
        if (!this.isConfigured) return null;
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            return { success: true, user: userCredential.user };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    async register(email, password) {
        if (!this.isConfigured) return null;
        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            return { success: true, user: userCredential.user };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    async logout() {
        if (!this.isConfigured) return;
        return await this.auth.signOut();
    },

    // ----------------------------------------------------
    // FIRESTORE REALTIME SYNC (Visitors, Complaints, Notices)
    // ----------------------------------------------------

    // 1. Visitors Real-Time Listener
    listenToVisitors(onUpdate) {
        if (!this.isConfigured) return null;
        return this.db.collection("visitors")
            .orderBy("createdAt", "desc")
            .onSnapshot((snapshot) => {
                const list = [];
                snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
                if (typeof onUpdate === "function") onUpdate(list);
            }, (error) => console.warn("Firestore visitors listen error:", error));
    },

    async addVisitor(visitorData) {
        if (!this.isConfigured) return null;
        try {
            const docRef = await this.db.collection("visitors").add({
                ...visitorData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true, id: docRef.id };
        } catch (err) {
            console.error("Firestore addVisitor error:", err);
            return { success: false, error: err.message };
        }
    },

    // 2. Complaints Real-Time Listener
    listenToComplaints(onUpdate) {
        if (!this.isConfigured) return null;
        return this.db.collection("complaints")
            .orderBy("createdAt", "desc")
            .onSnapshot((snapshot) => {
                const list = [];
                snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
                if (typeof onUpdate === "function") onUpdate(list);
            }, (error) => console.warn("Firestore complaints listen error:", error));
    },

    async addComplaint(complaintData) {
        if (!this.isConfigured) return null;
        try {
            const docRef = await this.db.collection("complaints").add({
                ...complaintData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true, id: docRef.id };
        } catch (err) {
            console.error("Firestore addComplaint error:", err);
            return { success: false, error: err.message };
        }
    },

    // 3. Broadcast Notices Real-Time Listener
    listenToNotices(onUpdate) {
        if (!this.isConfigured) return null;
        return this.db.collection("notices")
            .orderBy("createdAt", "desc")
            .onSnapshot((snapshot) => {
                const list = [];
                snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
                if (typeof onUpdate === "function") onUpdate(list);
            }, (error) => console.warn("Firestore notices listen error:", error));
    },

    async publishNotice(noticeData) {
        if (!this.isConfigured) return null;
        try {
            const docRef = await this.db.collection("notices").add({
                ...noticeData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true, id: docRef.id };
        } catch (err) {
            console.error("Firestore publishNotice error:", err);
            return { success: false, error: err.message };
        }
    },

    // 4. Live Login Session Logger (Shows real-time in Firebase Console who logged in!)
    async logUserLogin(userEmail, userRole, extraInfo = {}) {
        if (!this.isConfigured) return;
        const now = new Date();
        const loginData = {
            user: userEmail,
            role: userRole,
            timestamp: now.toISOString(),
            timeFormatted: now.toLocaleTimeString("en-IN") + ", " + now.toLocaleDateString("en-IN"),
            userAgent: navigator.userAgent.substring(0, 100),
            status: "ONLINE",
            ...extraInfo
        };

        // Push to Realtime Database (Appears instantly at https://nexsociety-b4311-default-rtdb.firebaseio.com/logins)
        if (this.rtdb) {
            try {
                this.rtdb.ref("active_logins").push(loginData);
                // Also set current active user
                const safeKey = userEmail.replace(/[.#$[\]]/g, "_");
                this.rtdb.ref("current_sessions/" + safeKey).set({
                    ...loginData,
                    lastSeen: firebase.database.ServerValue.TIMESTAMP
                });
                console.log("✓ Live login logged to Firebase Realtime Database:", userEmail);
            } catch (e) {
                console.warn("RTDB login log error:", e);
            }
        }

        // Push to Firestore as audit trail
        if (this.db) {
            try {
                this.db.collection("user_logins").add({
                    ...loginData,
                    serverTime: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (e) {}
        }
    }
};

// Auto-run init if Firebase SDK is present on the page
document.addEventListener("DOMContentLoaded", () => {
    window.NexFirebase.init();
});
