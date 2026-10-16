const db = require("../config/db");

// Get complaints
exports.getComplaints = async (req, res) => {
    try {
        const { status, flat_number, category } = req.query;
        let sql = "SELECT * FROM complaints WHERE 1=1";
        const params = [];

        if (status && status !== "all") {
            params.push(status);
            sql += ` AND status = $${params.length}`;
        }

        if (flat_number) {
            params.push(`%${flat_number.trim()}%`);
            sql += ` AND flat_number ILIKE $${params.length}`;
        }

        if (category && category !== "all") {
            params.push(category);
            sql += ` AND category = $${params.length}`;
        }

        sql += " ORDER BY created_at DESC";

        const result = await db.query(sql, params);
        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (err) {
        console.error("Get complaints error:", err);
        res.status(500).json({ success: false, message: "Error fetching complaints." });
    }
};

// Create new complaint
exports.createComplaint = async (req, res) => {
    try {
        const { flat_number, resident_name, category, priority, details, photo_url } = req.body;

        if (!flat_number || !category || !details) {
            return res.status(400).json({ success: false, message: "Flat number, category, and details are required." });
        }

        const id = "CMP-" + Date.now().toString().slice(-6);

        const insert = await db.query(`
            INSERT INTO complaints (id, flat_number, resident_name, category, priority, details, photo_url, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'In Review')
            RETURNING *
        `, [
            id,
            flat_number.trim(),
            resident_name || "Resident",
            category,
            priority || "Medium",
            details.trim(),
            photo_url || null
        ]);

        res.status(201).json({
            success: true,
            message: `Ticket #${id} lodged successfully. Maintenance team notified.`,
            data: insert.rows[0]
        });
    } catch (err) {
        console.error("Create complaint error:", err);
        res.status(500).json({ success: false, message: "Error filing complaint." });
    }
};

// Mark complaint as resolved
exports.resolveComplaint = async (req, res) => {
    try {
        const { id } = req.params;

        const update = await db.query(`
            UPDATE complaints
            SET status = 'Resolved', resolved_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [id]);

        if (update.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Complaint ticket not found." });
        }

        res.json({
            success: true,
            message: `Complaint #${id} marked as Resolved!`,
            data: update.rows[0]
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Withdraw / Delete complaint
exports.deleteComplaint = async (req, res) => {
    try {
        const { id } = req.params;
        const del = await db.query("DELETE FROM complaints WHERE id = $1 RETURNING id", [id]);
        if (del.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Ticket not found." });
        }
        res.json({ success: true, message: `Ticket #${id} withdrawn successfully.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
