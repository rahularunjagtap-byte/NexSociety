const db = require("../config/db");

// ==========================================
// 1. GATE VISITORS LOG
// ==========================================

// Get all visitors with optional filter
exports.getVisitors = async (req, res) => {
    try {
        const { status, purpose, search } = req.query;
        let sql = "SELECT * FROM visitors WHERE 1=1";
        const params = [];

        if (status && status !== "all") {
            params.push(status);
            sql += ` AND status = $${params.length}`;
        }

        if (purpose && purpose !== "all") {
            params.push(purpose);
            sql += ` AND purpose = $${params.length}`;
        }

        if (search) {
            params.push(`%${search.trim()}%`);
            sql += ` AND (name ILIKE $${params.length} OR flat_number ILIKE $${params.length} OR vehicle_no ILIKE $${params.length} OR phone ILIKE $${params.length})`;
        }

        sql += " ORDER BY entry_time DESC";

        const result = await db.query(sql, params);
        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (err) {
        console.error("Get visitors error:", err);
        res.status(500).json({ success: false, message: "Error fetching visitors list." });
    }
};

// Check-in new visitor
exports.checkInVisitor = async (req, res) => {
    try {
        const { name, phone, flat_number, purpose, vehicle_no, photo_url, gate_number } = req.body;

        if (!name || !phone || !flat_number || !purpose) {
            return res.status(400).json({ success: false, message: "Name, phone, flat number, and purpose are required." });
        }

        const id = "VIS-" + Date.now().toString().slice(-6);

        const insert = await db.query(`
            INSERT INTO visitors (id, name, phone, flat_number, purpose, vehicle_no, photo_url, gate_number, status, entry_time)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'inside', NOW())
            RETURNING *
        `, [
            id,
            name.trim(),
            phone.trim(),
            flat_number.trim(),
            purpose.toLowerCase(),
            vehicle_no ? vehicle_no.trim().toUpperCase() : "None",
            photo_url || null,
            gate_number || "Gate 1"
        ]);

        res.status(201).json({
            success: true,
            message: `Visitor ${name} logged into ${flat_number} successfully!`,
            data: insert.rows[0]
        });
    } catch (err) {
        console.error("Check-in error:", err);
        res.status(500).json({ success: false, message: "Error logging visitor entry." });
    }
};

// Check-out visitor
exports.checkOutVisitor = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(`
            UPDATE visitors
            SET status = 'checked-out', exit_time = NOW()
            WHERE id = $1
            RETURNING *
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Visitor record not found." });
        }

        res.json({
            success: true,
            message: `Visitor ${result.rows[0].name} checked out successfully.`,
            data: result.rows[0]
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ==========================================
// 2. PRE-APPROVED VISITOR PASSES
// ==========================================

// Get pre-approved passes
exports.getPreapprovedPasses = async (req, res) => {
    try {
        const { flat_number, status } = req.query;
        let sql = "SELECT * FROM preapproved_passes WHERE 1=1";
        const params = [];

        if (flat_number) {
            params.push(flat_number);
            sql += ` AND flat_number = $${params.length}`;
        }

        if (status) {
            params.push(status);
            sql += ` AND status = $${params.length}`;
        }

        sql += " ORDER BY created_at DESC";

        const result = await db.query(sql, params);
        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Create pre-approved pass
exports.createPreapprovedPass = async (req, res) => {
    try {
        const { guest_name, guest_phone, flat_number, purpose, arrival_date, vehicle_no } = req.body;

        if (!guest_name || !guest_phone || !flat_number) {
            return res.status(400).json({ success: false, message: "Guest name, phone, and flat number are required." });
        }

        const id = "PRE-" + Date.now().toString().slice(-6);
        const pin_otp = Math.floor(1000 + Math.random() * 9000).toString();
        const pass_code = `NEX-PASS-${Date.now().toString().slice(-4)}`;

        const insert = await db.query(`
            INSERT INTO preapproved_passes (id, guest_name, guest_phone, flat_number, purpose, arrival_date, pin_otp, pass_code, vehicle_no, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
            RETURNING *
        `, [
            id,
            guest_name.trim(),
            guest_phone.trim(),
            flat_number.trim(),
            purpose || "Guest",
            arrival_date || new Date().toISOString().slice(0, 10),
            pin_otp,
            pass_code,
            vehicle_no ? vehicle_no.trim().toUpperCase() : "None"
        ]);

        res.status(201).json({
            success: true,
            message: "Pre-approved guest pass generated successfully!",
            data: insert.rows[0]
        });
    } catch (err) {
        console.error("Create pass error:", err);
        res.status(500).json({ success: false, message: "Error generating pre-approved pass." });
    }
};

// Verify OTP & Allow Entry at Security Gate
exports.verifyOtpAndAllow = async (req, res) => {
    try {
        const { otp } = req.body;

        if (!otp) {
            return res.status(400).json({ success: false, message: "Please provide 4-digit verification OTP." });
        }

        const passResult = await db.query(
            "SELECT * FROM preapproved_passes WHERE pin_otp = $1 AND status = 'active'",
            [otp.trim()]
        );

        if (passResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Invalid or already used OTP code." });
        }

        const pass = passResult.rows[0];

        // Mark pass as used
        await db.query("UPDATE preapproved_passes SET status = 'used' WHERE id = $1", [pass.id]);

        // Automatically log into visitors table
        const visId = "VIS-" + Date.now().toString().slice(-6);
        const visInsert = await db.query(`
            INSERT INTO visitors (id, name, phone, flat_number, purpose, vehicle_no, gate_number, status, entry_time)
            VALUES ($1, $2, $3, $4, $5, $6, 'Gate 1', 'inside', NOW())
            RETURNING *
        `, [
            visId,
            pass.guest_name,
            pass.guest_phone,
            pass.flat_number,
            pass.purpose,
            pass.vehicle_no || "None"
        ]);

        res.json({
            success: true,
            message: `OTP Verified! Authorized entry for ${pass.guest_name} to ${pass.flat_number}. Barrier opening.`,
            pass: pass,
            visitor: visInsert.rows[0]
        });
    } catch (err) {
        console.error("OTP verification error:", err);
        res.status(500).json({ success: false, message: "Error verifying pass OTP." });
    }
};

// Revoke pre-approved pass
exports.revokePass = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            "UPDATE preapproved_passes SET status = 'revoked' WHERE id = $1 RETURNING *",
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Pass not found." });
        }
        res.json({ success: true, message: "Pass revoked successfully.", data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
