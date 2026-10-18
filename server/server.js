const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
require("dotenv").config();

const { testConnection } = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const visitorRoutes = require("./routes/visitorRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const noticeRoutes = require("./routes/noticeRoutes");
const duesRoutes = require("./routes/duesRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-user-role", "x-user-email"]
}));

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Private-Network", "true");
    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }
    next();
});

app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve frontend static files from project root
const frontendPath = path.join(__dirname, "..");
app.use(express.static(frontendPath));

// API Health Check
app.get("/api/health", async (req, res) => {
    const dbConnected = await testConnection();
    res.json({
        status: "online",
        service: "NexSociety Backend API",
        version: "1.0.0",
        database: dbConnected ? "connected" : "disconnected",
        timestamp: new Date().toISOString()
    });
});

// Mount API Routes
app.use("/api/auth", authRoutes);
app.use("/api/visitors", visitorRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/dues", duesRoutes);

// Fallback to index.html for unknown non-API routes
app.use((req, res) => {
    if (req.path.startsWith("/api")) {
        return res.status(404).json({ success: false, message: `API route '${req.originalUrl}' not found.` });
    }
    res.sendFile(path.join(frontendPath, "index.html"));
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Unhandled Server Error:", err.stack);
    res.status(500).json({
        success: false,
        message: "Internal server error occurred.",
        error: process.env.NODE_ENV === "production" ? undefined : err.message
    });
});

// Start Server
app.listen(PORT, async () => {
    console.log(`\n========================================================`);
    console.log(`🚀 NexSociety Server running on http://localhost:${PORT}`);
    console.log(`📡 API Endpoints live at http://localhost:${PORT}/api/health`);
    console.log(`💻 Serving Frontend directly from ${frontendPath}`);
    console.log(`========================================================\n`);

    // Verify DB connection on startup
    await testConnection();
});
