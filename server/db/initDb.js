const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function initDatabase() {
    const config = {
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "postgres",
    };

    const targetDb = process.env.DB_NAME || "nexsociety";

    console.log(`\n========================================`);
    console.log(`Initializing NexSociety PostgreSQL Backend`);
    console.log(`Host: ${config.host}:${config.port} | User: ${config.user} | DB: ${targetDb}`);
    console.log(`========================================\n`);

    // Step 1: Connect to default postgres DB to create database if not exists
    const rootClient = new Client({ ...config, database: "postgres" });
    try {
        await rootClient.connect();
        const checkDb = await rootClient.query(
            "SELECT 1 FROM pg_database WHERE datname = $1",
            [targetDb]
        );
        if (checkDb.rows.length === 0) {
            console.log(`Database '${targetDb}' does not exist. Creating now...`);
            await rootClient.query(`CREATE DATABASE ${targetDb}`);
            console.log(`✓ Database '${targetDb}' created successfully!`);
        } else {
            console.log(`✓ Database '${targetDb}' already exists.`);
        }
    } catch (err) {
        console.error("✗ Failed to connect or create database:", err.message);
        throw err;
    } finally {
        await rootClient.end();
    }

    // Step 2: Connect to target nexsociety database
    const appClient = new Client({ ...config, database: targetDb });
    try {
        await appClient.connect();

        // Step 3: Run schema.sql
        const schemaPath = path.join(__dirname, "schema.sql");
        const schemaSql = fs.readFileSync(schemaPath, "utf8");
        console.log("Applying database schema tables and indexes...");
        await appClient.query(schemaSql);
        console.log("✓ Schema applied successfully!");

        // Step 4: Seed default users if empty
        const userCheck = await appClient.query("SELECT COUNT(*) FROM users");
        if (parseInt(userCheck.rows[0].count, 10) === 0) {
            console.log("Seeding initial users and credentials...");
            const salt = await bcrypt.genSalt(10);
            const passHash = await bcrypt.hash("admin123", salt);

            await appClient.query(`
                INSERT INTO users (full_name, email, password_hash, role, flat_number, tower, phone)
                VALUES 
                ('Lead Guard Vikram Singh', 'guard@nexsociety.in', $1, 'security', 'Gate 1 Office', 'Gate', '+91 98200 11001'),
                ('Aryan Sharma', 'aryan@nexsociety.in', $1, 'resident', 'A-204', 'Tower A', '+91 98201 44521'),
                ('Dr. S. Rao (Secretary)', 'admin@nexsociety.in', $1, 'admin', 'C-101', 'Tower C', '+91 98200 99009')
            `, [passHash]);
            console.log("✓ Initial users seeded (guard@, aryan@, admin@ / password: admin123)!");
        }

        // Step 5: Seed default flats maintenance dues roster
        const duesCheck = await appClient.query("SELECT COUNT(*) FROM maintenance_dues");
        if (parseInt(duesCheck.rows[0].count, 10) === 0) {
            console.log("Seeding society flats maintenance roster...");
            await appClient.query(`
                INSERT INTO maintenance_dues (id, flat_number, resident_name, tower, phone, bay_number, amount, month, status, transaction_id, payment_mode, paid_at)
                VALUES
                ('DUE-A101', 'A-101', 'Ramesh Patel', 'Tower A', '+91 98201 11201', 'Bay A-01', 4250.00, 'October 2026', 'paid', 'TXN-984021', 'UPI', NOW()),
                ('DUE-A102', 'A-102', 'Sunita Deshmukh', 'Tower A', '+91 98201 22302', 'Bay A-02', 4250.00, 'October 2026', 'paid', 'TXN-984033', 'NetBanking', NOW()),
                ('DUE-A204', 'A-204', 'Aryan Sharma', 'Tower A', '+91 98201 44521', 'Bay B-12', 4250.00, 'October 2026', 'paid', 'TXN-984112', 'UPI', NOW()),
                ('DUE-A301', 'A-301', 'Deepak Chopra', 'Tower A', '+91 98201 55603', 'Bay A-15', 4250.00, 'October 2026', 'pending', NULL, NULL, NULL),
                ('DUE-B102', 'B-102', 'Neha Verma', 'Tower B', '+91 91234 56789', 'Bay B-04', 4250.00, 'October 2026', 'paid', 'TXN-984155', 'Credit Card', NOW()),
                ('DUE-B201', 'B-201', 'Sanjay Singhania', 'Tower B', '+91 98202 77805', 'Bay B-08', 4250.00, 'October 2026', 'paid', 'TXN-984201', 'UPI', NOW()),
                ('DUE-B303', 'B-303', 'Suresh Gupta', 'Tower B', '+91 90012 34567', 'Bay B-19', 4250.00, 'October 2026', 'paid', 'TXN-984250', 'Debit Card', NOW()),
                ('DUE-C404', 'C-404', 'Dr. K. Mehta', 'Tower C', '+91 99887 76655', 'Bay C-10', 4250.00, 'October 2026', 'paid', 'TXN-984299', 'NetBanking', NOW()),
                ('DUE-C501', 'C-501', 'Vikram Malhotra', 'Tower C', '+91 98765 01234', 'Bay C-22', 4250.00, 'October 2026', 'pending', NULL, NULL, NULL)
            `);
            console.log("✓ Flats roster seeded!");
        }

        // Step 6: Seed default complaints
        const complaintCheck = await appClient.query("SELECT COUNT(*) FROM complaints");
        if (parseInt(complaintCheck.rows[0].count, 10) === 0) {
            console.log("Seeding initial society complaints...");
            await appClient.query(`
                INSERT INTO complaints (id, flat_number, resident_name, category, priority, details, status)
                VALUES
                ('CMP-101', 'A-204', 'Aryan Sharma', 'Plumbing', 'Medium', 'Low water pressure in kitchen sink tap.', 'In Review'),
                ('CMP-102', 'B-303', 'Suresh Gupta', 'Electrical', 'High', 'Corridor light flickering outside 3rd floor lift lobby.', 'In Review'),
                ('CMP-103', 'Tower C', 'Society Area', 'Elevator', 'High', 'Lift car jerk during 4th floor floor alignment.', 'In Review'),
                ('CMP-104', 'Clubhouse', 'Common Area', 'Carpentry', 'Low', 'Main glass door hydraulic latch loose.', 'Resolved')
            `);
            console.log("✓ Initial complaints seeded!");
        }

        // Step 7: Seed default notices
        const noticeCheck = await appClient.query("SELECT COUNT(*) FROM notices");
        if (parseInt(noticeCheck.rows[0].count, 10) === 0) {
            console.log("Seeding society notices...");
            await appClient.query(`
                INSERT INTO notices (id, headline, category, content, published_by)
                VALUES
                ('NOT-1', 'Borewell & Water Tank Deep Cleaning', 'Maintenance', 'Overhead tanks cleaning on Saturday 9 AM to 2 PM. Low pressure expected.', 'Managing Committee'),
                ('NOT-2', 'Annual General Body Meeting (AGM) Notice', 'AGM', 'All flat owners are invited for AGM on Sunday 25th Oct at 11:00 AM in Clubhouse.', 'Hon. Secretary'),
                ('NOT-3', 'Diwali Society Cultural Night Registration', 'Celebration', 'Diwali Milan and rangoli competition registration open at desk.', 'Cultural Committee')
            `);
            console.log("✓ Initial notices seeded!");
        }

        console.log("\n========================================");
        console.log("🎉 Database initialization completed successfully!");
        console.log("========================================\n");
    } catch (err) {
        console.error("✗ Database setup error:", err.message);
        throw err;
    } finally {
        await appClient.end();
    }
}

if (require.main === module) {
    initDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = initDatabase;
