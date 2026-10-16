const { Pool } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || "nexsociety",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
    console.error("Unexpected error on idle PostgreSQL client:", err.message);
});

async function query(text, params) {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== "production") {
        console.log("Executed query:", { text: text.trim().slice(0, 80), duration: `${duration}ms`, rows: res.rowCount });
    }
    return res;
}

async function testConnection() {
    try {
        const res = await pool.query("SELECT NOW() as current_time, current_database() as db_name");
        console.log(`✓ PostgreSQL Connected Successfully! Database: [${res.rows[0].db_name}] at ${res.rows[0].current_time}`);
        return true;
    } catch (err) {
        console.error("✗ PostgreSQL Connection Failed:", err.message);
        return false;
    }
}

module.exports = {
    pool,
    query,
    testConnection
};
