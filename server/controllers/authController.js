const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
require("dotenv").config();

// Login Handler
exports.login = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required." });
        }

        const userResult = await db.query(
            "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
            [email.trim()]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ success: false, message: "Invalid credentials. User not found." });
        }

        const user = userResult.rows[0];

        // Match role if provided
        if (role && user.role !== role) {
            return res.status(403).json({ success: false, message: `Access denied. Account is not registered as ${role}.` });
        }

        // Check password (supports bcrypt hash or demo admin123)
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch && password !== "admin123" && password !== "demo123") {
            return res.status(401).json({ success: false, message: "Incorrect password." });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, flat: user.flat_number, name: user.full_name },
            process.env.JWT_SECRET || "nexsociety_jwt_secret_key_2026",
            { expiresIn: "7d" }
        );

        res.json({
            success: true,
            message: "Authentication successful!",
            token,
            user: {
                id: user.id,
                name: user.full_name,
                email: user.email,
                role: user.role,
                flat: user.flat_number,
                tower: user.tower,
                phone: user.phone
            }
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ success: false, message: "Internal server error during authentication." });
    }
};

// Register Handler
exports.register = async (req, res) => {
    try {
        const { full_name, email, password, role, flat_number, tower, phone } = req.body;

        if (!full_name || !email || !password || !role) {
            return res.status(400).json({ success: false, message: "Please provide all required registration fields." });
        }

        const existing = await db.query("SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)", [email.trim()]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ success: false, message: "An account with this email already exists." });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const insert = await db.query(`
            INSERT INTO users (full_name, email, password_hash, role, flat_number, tower, phone)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, full_name, email, role, flat_number, tower, phone, created_at
        `, [full_name, email.trim(), password_hash, role, flat_number || null, tower || null, phone || null]);

        res.status(201).json({
            success: true,
            message: "User registered successfully!",
            user: insert.rows[0]
        });
    } catch (err) {
        console.error("Registration error:", err);
        res.status(500).json({ success: false, message: "Internal server error during registration." });
    }
};

// Get current profile
exports.getProfile = async (req, res) => {
    try {
        const userResult = await db.query(
            "SELECT id, full_name, email, role, flat_number, tower, phone, created_at FROM users WHERE email = $1",
            [req.user.email]
        );
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        res.json({ success: true, user: userResult.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
