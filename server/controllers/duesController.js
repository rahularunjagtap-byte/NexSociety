const db = require("../config/db");

// Get all flats directory with dues status
exports.getFlatsDirectory = async (req, res) => {
    try {
        const { search, status } = req.query;
        let sql = "SELECT * FROM maintenance_dues WHERE 1=1";
        const params = [];

        if (status && status !== "all") {
            params.push(status);
            sql += ` AND status = $${params.length}`;
        }

        if (search) {
            params.push(`%${search.trim()}%`);
            sql += ` AND (flat_number ILIKE $${params.length} OR resident_name ILIKE $${params.length} OR phone ILIKE $${params.length} OR bay_number ILIKE $${params.length})`;
        }

        sql += " ORDER BY flat_number ASC";

        const result = await db.query(sql, params);
        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (err) {
        console.error("Get directory error:", err);
        res.status(500).json({ success: false, message: "Error fetching flats directory." });
    }
};

// Get dues for a specific flat
exports.getFlatDues = async (req, res) => {
    try {
        const { flat_number } = req.params;
        const result = await db.query(
            "SELECT * FROM maintenance_dues WHERE UPPER(flat_number) = UPPER($1)",
            [flat_number.trim()]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Flat records not found." });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Record payment
exports.payDues = async (req, res) => {
    try {
        const { flat_number, payment_mode } = req.body;

        if (!flat_number) {
            return res.status(400).json({ success: false, message: "Flat number is required." });
        }

        const txnId = "TXN-" + Date.now().toString().slice(-6);

        const update = await db.query(`
            UPDATE maintenance_dues
            SET status = 'paid', transaction_id = $1, payment_mode = $2, paid_at = NOW()
            WHERE UPPER(flat_number) = UPPER($3)
            RETURNING *
        `, [txnId, payment_mode || "UPI", flat_number.trim()]);

        if (update.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Flat dues record not found." });
        }

        res.json({
            success: true,
            message: `Payment of ₹${update.rows[0].amount} recorded for ${flat_number}!`,
            receipt: {
                transactionId: txnId,
                flat: flat_number,
                amount: update.rows[0].amount,
                mode: payment_mode || "UPI",
                date: new Date().toISOString()
            },
            data: update.rows[0]
        });
    } catch (err) {
        console.error("Pay dues error:", err);
        res.status(500).json({ success: false, message: "Error recording maintenance payment." });
    }
};

// Financial summary stats
exports.getFinancialSummary = async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT
                COUNT(*) as total_flats,
                COUNT(*) FILTER (WHERE status = 'paid') as paid_flats,
                COUNT(*) FILTER (WHERE status != 'paid') as pending_flats,
                COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as total_collected,
                COALESCE(SUM(amount) FILTER (WHERE status != 'paid'), 0) as total_pending
            FROM maintenance_dues
        `);

        res.json({ success: true, summary: stats.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
