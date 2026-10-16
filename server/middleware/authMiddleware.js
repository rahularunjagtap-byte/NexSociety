const jwt = require("jsonwebtoken");
require("dotenv").config();

function verifyToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        // Allow unauthenticated fallback for development convenience if no auth header
        req.user = { role: req.headers["x-user-role"] || "resident", email: req.headers["x-user-email"] || "aryan@nexsociety.in" };
        return next();
    }

    jwt.verify(token, process.env.JWT_SECRET || "nexsociety_jwt_secret_key_2026", (err, decoded) => {
        if (err) {
            return res.status(403).json({ success: false, message: "Invalid or expired authorization token." });
        }
        req.user = decoded;
        next();
    });
}

module.exports = { verifyToken };
