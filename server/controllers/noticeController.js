const db = require("../config/db");

// Get all notices
exports.getNotices = async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM notices ORDER BY created_at DESC");
        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (err) {
        console.error("Get notices error:", err);
        res.status(500).json({ success: false, message: "Error fetching circulars." });
    }
};

// Publish notice
exports.publishNotice = async (req, res) => {
    try {
        const { headline, category, content, published_by } = req.body;

        if (!headline || !content) {
            return res.status(400).json({ success: false, message: "Notice headline and content are required." });
        }

        const id = "NOT-" + Date.now().toString().slice(-6);

        const insert = await db.query(`
            INSERT INTO notices (id, headline, category, content, published_by, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            RETURNING *
        `, [
            id,
            headline.trim(),
            category || "General",
            content.trim(),
            published_by || "Hon. Society Secretary"
        ]);

        res.status(201).json({
            success: true,
            message: `Notice '${headline}' published to all residents!`,
            data: insert.rows[0]
        });
    } catch (err) {
        console.error("Publish notice error:", err);
        res.status(500).json({ success: false, message: "Error publishing notice." });
    }
};

// Delete notice
exports.deleteNotice = async (req, res) => {
    try {
        const { id } = req.params;
        const del = await db.query("DELETE FROM notices WHERE id = $1 RETURNING id", [id]);
        if (del.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Notice not found." });
        }
        res.json({ success: true, message: "Notice deleted successfully." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
