import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Simple health
app.get("/", (req, res) => res.send("Auth server is running"));

const DB_HOST = process.env.DB_HOST || "127.0.0.1";
const DB_PORT = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "csse_app";

let pool;

function getPool(req) {
  return req && req.dbPool ? req.dbPool : pool;
}

async function createPoolAndEnsure() {
  // connect without database to create it if missing
  const adminConn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
  });
  try {
    await adminConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await adminConn.end();
  }

  const pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  // Create users table if not exists
  const createSql = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255),
      role VARCHAR(50) NOT NULL DEFAULT 'Resident',
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `;
  const conn = await pool.getConnection();
  try {
    await conn.query(createSql);
    // Create collection_requests table for special collection requests
    const createCollectionRequests = `
      CREATE TABLE IF NOT EXISTS collection_requests (
        id VARCHAR(64) PRIMARY KEY,
        user_id INT NOT NULL,
        item_type VARCHAR(128) NOT NULL,
        preferred_datetime DATETIME NULL,
        preferred_time_label VARCHAR(64),
        photos TEXT,
        estimated_cost DECIMAL(10,2) DEFAULT 0,
          status VARCHAR(64) DEFAULT 'PendingPayment',
        payment_required TINYINT(1) DEFAULT 1,
        payment_id INT NULL,
          assigned_collector_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        paid_at DATETIME NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `;
    await conn.query(createCollectionRequests);

    // Create payments table
    const createPayments = `
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        request_id VARCHAR(64) NULL,
        user_id INT NULL,
        collector_id INT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(8) DEFAULT 'USD',
        status VARCHAR(64) DEFAULT 'Completed',
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await conn.query(createPayments);
    // Ensure existing installations get the 'role' column if it was added later
    try {
      await conn.query(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'Resident'"
      );
    } catch (e) {
      // some MySQL versions might not support IF NOT EXISTS for ADD COLUMN
      // attempt a safer ALTER only if column missing by checking information_schema
      try {
        const [cols] = await conn.query(
          "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'",
          [DB_NAME]
        );
        if (!cols || cols.length === 0) {
          await conn.query(
            "ALTER TABLE users ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'Resident'"
          );
        }
      } catch (ee) {
        // log and continue; role detection will still work for new signups
        console.warn("Could not ensure role column exists:", ee.message || ee);
      }
    }
    // Ensure collection_requests has assigned_collector_id column for older databases
    try {
      await conn.query(
        "ALTER TABLE collection_requests ADD COLUMN IF NOT EXISTS assigned_collector_id INT NULL"
      );
    } catch (e) {
      try {
        const [cols] = await conn.query(
          "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'collection_requests' AND COLUMN_NAME = 'assigned_collector_id'",
          [DB_NAME]
        );
        if (!cols || cols.length === 0) {
          await conn.query(
            "ALTER TABLE collection_requests ADD COLUMN assigned_collector_id INT NULL"
          );
        }
      } catch (ee) {
        console.warn(
          "Could not ensure assigned_collector_id column exists:",
          ee.message || ee
        );
      }
    }
    // create schedules table
    const createSchedules = `
      CREATE TABLE IF NOT EXISTS schedules (
        id VARCHAR(64) PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        scheduled_at DATETIME NOT NULL,
        time_label VARCHAR(64),
        status VARCHAR(50) DEFAULT 'Scheduled',
        location_lat DOUBLE NULL,
        location_lng DOUBLE NULL,
        location_label VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `;
    await conn.query(createSchedules);
  } finally {
    conn.release();
  }

  return pool;
}

// Signup
app.post("/api/auth/signup", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });
  try {
    const password_hash = await bcrypt.hash(password, 10);
    // determine role by email domain (simple rule): @admin.com -> Authority, @collector.com -> Collector, otherwise Resident
    let role = "Resident";
    const e = (email || "").toLowerCase();
    if (e.endsWith("@admin.com")) role = "Authority";
    else if (e.endsWith("@collector.com")) role = "Collector";

    const conn = await getPool(req).getConnection();
    try {
      const [result] = await conn.query(
        "INSERT INTO users (email, name, role, password_hash) VALUES (?, ?, ?, ?)",
        [email, name || null, role, password_hash]
      );
      const userId = result.insertId;
      const token = jwt.sign(
        { id: userId, email, role },
        process.env.JWT_SECRET || "secret",
        { expiresIn: "7d" }
      );
      return res
        .status(201)
        .json({ token, user: { id: userId, email, name, role } });
    } finally {
      conn.release();
    }
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY")
      return res.status(409).json({ error: "Email already registered" });
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Signin
app.post("/api/auth/signin", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });
  try {
    const conn = await getPool(req).getConnection();
    try {
      const [rows] = await conn.query(
        "SELECT id, email, name, role, password_hash FROM users WHERE email = ?",
        [email]
      );
      const user = rows[0];
      if (!user) return res.status(401).json({ error: "Invalid credentials" });
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return res.status(401).json({ error: "Invalid credentials" });
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || "secret",
        { expiresIn: "7d" }
      );
      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Protected example
app.get("/api/protected", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Missing token" });
  const token = auth.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "secret");
    return res.json({ ok: true, user: payload });
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
});

// JWT middleware
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Missing token" });
  const token = auth.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "secret");
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// role check helper: require a specific role (accepts string or array)
function ensureRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Missing token" });
    const allowed = Array.isArray(role) ? role : [role];
    if (!allowed.includes(req.user.role))
      return res.status(403).json({ error: "Forbidden" });
    return next();
  };
}

// role check helper: allow any of the listed roles
function ensureAnyRole(roles = []) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Missing token" });
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: "Forbidden" });
    return next();
  };
}

// Create schedule
app.post("/api/schedules", authMiddleware, async (req, res) => {
  const { type, scheduled_at, time_label, location } = req.body; // location: { lat, lng, label }
  if (!type || !scheduled_at)
    return res.status(400).json({ error: "type and scheduled_at required" });
  // collectors are not allowed to create schedules via this endpoint
  if (req.user.role === "Collector")
    return res
      .status(403)
      .json({ error: "Collectors cannot create schedules" });
  try {
    const id = `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const conn = await getPool(req).getConnection();
    try {
      await conn.query(
        "INSERT INTO schedules (id, user_id, type, scheduled_at, time_label, location_lat, location_lng, location_label) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          id,
          req.user.id,
          type,
          new Date(scheduled_at),
          time_label || null,
          location?.lat || null,
          location?.lng || null,
          location?.label || null,
        ]
      );
      return res.status(201).json({ id });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Create a special collection request (Resident or Authority)
app.post("/api/collections/request", authMiddleware, async (req, res) => {
  const {
    item_type,
    preferred_date,
    preferred_time_label,
    photos,
    estimated_cost,
  } = req.body;
  // only Residents and Authority can create requests; collectors should not create requests
  if (req.user.role === "Collector")
    return res
      .status(403)
      .json({ error: "Collectors cannot create collection requests" });
  if (!item_type) return res.status(400).json({ error: "item_type required" });
  try {
    const id = `cr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const conn = await getPool(req).getConnection();
    try {
      const preferred_dt = preferred_date ? new Date(preferred_date) : null;
      const payment_required = (Number(estimated_cost) || 0) > 0 ? 1 : 0;
      const status = payment_required ? "PendingPayment" : "Scheduled";
      await conn.query(
        "INSERT INTO collection_requests (id, user_id, item_type, preferred_datetime, preferred_time_label, photos, estimated_cost, status, payment_required) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          id,
          req.user.id,
          item_type,
          preferred_dt,
          preferred_time_label || null,
          photos ? JSON.stringify(photos) : null,
          Number(estimated_cost) || 0,
          status,
          payment_required,
        ]
      );
      return res.status(201).json({ id, status });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// List special collection requests for current user (Residents) or all (Authority/Admin) or assigned (Collector)
app.get("/api/collections/requests", authMiddleware, async (req, res) => {
  try {
    const conn = await getPool(req).getConnection();
    try {
      if (req.user.role === "Collector") {
        // collectors see scheduled/assigned/paid requests (they perform collection)
        const sqlWith = `SELECT id, user_id, item_type, preferred_datetime, preferred_time_label, photos, estimated_cost, status, payment_required, assigned_collector_id, created_at, paid_at FROM collection_requests WHERE status IN ('Scheduled','Assigned','Paid') ORDER BY created_at DESC`;
        const sqlWithout = `SELECT id, user_id, item_type, preferred_datetime, preferred_time_label, photos, estimated_cost, status, payment_required, created_at, paid_at FROM collection_requests WHERE status IN ('Scheduled','Assigned','Paid') ORDER BY created_at DESC`;
        let rows;
        try {
          [rows] = await conn.query(sqlWith);
        } catch (err) {
          if (
            err &&
            (err.code === "ER_BAD_FIELD_ERROR" || err.errno === 1054) &&
            String(err.sqlMessage || "").includes("assigned_collector_id")
          ) {
            console.warn(
              "assigned_collector_id missing, falling back to query without that column for collectors"
            );
            [rows] = await conn.query(sqlWithout);
          } else throw err;
        }
        return res.json(
          rows.map((r) => ({
            id: r.id,
            user_id: r.user_id,
            item_type: r.item_type,
            preferred_datetime: r.preferred_datetime,
            preferred_time_label: r.preferred_time_label,
            photos: r.photos ? JSON.parse(r.photos) : null,
            estimated_cost: Number(r.estimated_cost),
            status: r.status,
            payment_required: !!r.payment_required,
            assigned_collector_id: r.assigned_collector_id || null,
            created_at: r.created_at,
            paid_at: r.paid_at,
          }))
        );
      }
      if (req.user.role === "Resident") {
        const [rows] = await conn.query(
          "SELECT id, item_type, preferred_datetime, preferred_time_label, photos, estimated_cost, status, payment_required, created_at, paid_at FROM collection_requests WHERE user_id = ? ORDER BY created_at DESC",
          [req.user.id]
        );
        return res.json(
          rows.map((r) => ({
            id: r.id,
            item_type: r.item_type,
            preferred_datetime: r.preferred_datetime,
            preferred_time_label: r.preferred_time_label,
            photos: r.photos ? JSON.parse(r.photos) : null,
            estimated_cost: Number(r.estimated_cost),
            status: r.status,
            payment_required: !!r.payment_required,
            created_at: r.created_at,
            paid_at: r.paid_at,
          }))
        );
      }
      // Authority/Admin: see all
      const sqlWithAll = `SELECT id, user_id, item_type, preferred_datetime, preferred_time_label, photos, estimated_cost, status, payment_required, assigned_collector_id, created_at, paid_at FROM collection_requests ORDER BY created_at DESC`;
      const sqlWithoutAll = `SELECT id, user_id, item_type, preferred_datetime, preferred_time_label, photos, estimated_cost, status, payment_required, created_at, paid_at FROM collection_requests ORDER BY created_at DESC`;
      let rowsAll;
      try {
        [rowsAll] = await conn.query(sqlWithAll);
      } catch (err) {
        if (
          err &&
          (err.code === "ER_BAD_FIELD_ERROR" || err.errno === 1054) &&
          String(err.sqlMessage || "").includes("assigned_collector_id")
        ) {
          console.warn(
            "assigned_collector_id missing, falling back to authority query without that column"
          );
          [rowsAll] = await conn.query(sqlWithoutAll);
        } else throw err;
      }
      return res.json(
        rowsAll.map((r) => ({
          id: r.id,
          user_id: r.user_id,
          item_type: r.item_type,
          preferred_datetime: r.preferred_datetime,
          preferred_time_label: r.preferred_time_label,
          photos: r.photos ? JSON.parse(r.photos) : null,
          estimated_cost: Number(r.estimated_cost),
          status: r.status,
          payment_required: !!r.payment_required,
          assigned_collector_id: r.assigned_collector_id || null,
          created_at: r.created_at,
          paid_at: r.paid_at,
        }))
      );
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// List collectors (users with role = 'Collector')
app.get(
  "/api/collectors",
  authMiddleware,
  ensureAnyRole(["Authority", "Admin", "Collector"]),
  async (req, res) => {
    try {
      const conn = await getPool(req).getConnection();
      try {
        const [rows] = await conn.query(
          "SELECT id, email, name FROM users WHERE role = ? ORDER BY name ASC",
          ["Collector"]
        );
        return res.json(
          rows.map((r) => ({ id: r.id, email: r.email, name: r.name }))
        );
      } finally {
        conn.release();
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

// Assign a collector to a collection request (Authority/Admin only)
app.post(
  "/api/collections/request/:id/assign",
  authMiddleware,
  ensureRole(["Authority", "Admin"]),
  async (req, res) => {
    const id = req.params.id;
    const { collector_id } = req.body;
    if (!collector_id)
      return res.status(400).json({ error: "collector_id required" });
    try {
      const conn = await getPool(req).getConnection();
      try {
        // ensure request exists
        const [rows] = await conn.query(
          "SELECT id FROM collection_requests WHERE id = ?",
          [id]
        );
        if (!rows || rows.length === 0)
          return res.status(404).json({ error: "Request not found" });
        // ensure collector exists
        const [crows] = await conn.query(
          "SELECT id FROM users WHERE id = ? AND role = ?",
          [collector_id, "Collector"]
        );
        if (!crows || crows.length === 0)
          return res.status(400).json({ error: "Collector not found" });
        await conn.query(
          "UPDATE collection_requests SET assigned_collector_id = ?, status = ? WHERE id = ?",
          [collector_id, "Assigned", id]
        );
        return res.json({ ok: true });
      } finally {
        conn.release();
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

// Update a collection request (owner or Authority). Cannot edit if already Paid
app.put("/api/collections/request/:id", authMiddleware, async (req, res) => {
  const id = req.params.id;
  const {
    item_type,
    preferred_date,
    preferred_time_label,
    photos,
    estimated_cost,
  } = req.body;
  try {
    const conn = await getPool(req).getConnection();
    try {
      const [rows] = await conn.query(
        "SELECT id, user_id, status FROM collection_requests WHERE id = ?",
        [id]
      );
      const r = rows[0];
      if (!r) return res.status(404).json({ error: "Request not found" });
      if (req.user.role !== "Authority" && r.user_id !== req.user.id)
        return res.status(403).json({ error: "Forbidden" });
      if (r.status === "Paid")
        return res.status(400).json({ error: "Cannot edit a paid request" });

      const prefDt = preferred_date ? new Date(preferred_date) : null;
      await conn.query(
        "UPDATE collection_requests SET item_type = COALESCE(?, item_type), preferred_datetime = COALESCE(?, preferred_datetime), preferred_time_label = COALESCE(?, preferred_time_label), photos = COALESCE(?, photos), estimated_cost = COALESCE(?, estimated_cost) WHERE id = ?",
        [
          item_type || null,
          prefDt,
          preferred_time_label || null,
          photos ? JSON.stringify(photos) : null,
          estimated_cost !== undefined ? Number(estimated_cost) : null,
          id,
        ]
      );
      return res.json({ ok: true });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Delete a collection request (owner or Authority). If already paid, prevent deletion.
app.delete("/api/collections/request/:id", authMiddleware, async (req, res) => {
  const id = req.params.id;
  try {
    const conn = await getPool(req).getConnection();
    try {
      const [rows] = await conn.query(
        "SELECT id, user_id, status FROM collection_requests WHERE id = ?",
        [id]
      );
      const r = rows[0];
      if (!r) return res.status(404).json({ error: "Request not found" });
      if (req.user.role !== "Authority" && r.user_id !== req.user.id)
        return res.status(403).json({ error: "Forbidden" });
      if (r.status === "Paid")
        return res.status(400).json({ error: "Cannot delete a paid request" });
      await conn.query("DELETE FROM collection_requests WHERE id = ?", [id]);
      return res.json({ ok: true });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Create a payment for a request (simulate payment) - marks request paid and creates schedule if applicable
app.post("/api/payments", authMiddleware, async (req, res) => {
  const { request_id, amount, currency } = req.body;
  if (!request_id || !amount)
    return res.status(400).json({ error: "request_id and amount required" });
  try {
    const conn = await getPool(req).getConnection();
    try {
      // check request exists and belongs to user (or Authority)
      const [rows] = await conn.query(
        "SELECT id, user_id, preferred_datetime, preferred_time_label, estimated_cost, status FROM collection_requests WHERE id = ?",
        [request_id]
      );
      const reqRow = rows[0];
      if (!reqRow) return res.status(404).json({ error: "Request not found" });
      if (req.user.role === "Resident" && reqRow.user_id !== req.user.id)
        return res
          .status(403)
          .json({ error: "Cannot pay for another user's request" });

      // insert payment
      const [presult] = await conn.query(
        "INSERT INTO payments (request_id, user_id, amount, currency, status, details) VALUES (?, ?, ?, ?, ?, ?)",
        [
          request_id,
          reqRow.user_id,
          Number(amount),
          currency || "USD",
          "Completed",
          JSON.stringify({ by: req.user.id }),
        ]
      );
      const paymentId = presult.insertId;

      // update collection_requests to mark as paid and link payment
      await conn.query(
        "UPDATE collection_requests SET status = ?, payment_id = ?, paid_at = ? WHERE id = ?",
        ["Paid", paymentId, new Date(), request_id]
      );

      // create schedule entry so it appears on collections schedule
      const scheduleId = `s-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`;
      const scheduledAt = reqRow.preferred_datetime
        ? new Date(reqRow.preferred_datetime)
        : new Date();
      await conn.query(
        "INSERT INTO schedules (id, user_id, type, scheduled_at, time_label, status, location_lat, location_lng, location_label) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          scheduleId,
          reqRow.user_id,
          `Special: ${reqRow.item_type}`,
          scheduledAt,
          reqRow.preferred_time_label || null,
          "Scheduled",
          null,
          null,
          null,
        ]
      );

      return res.status(201).json({ paymentId, scheduleId });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// List schedules for current user
app.get("/api/schedules", authMiddleware, async (req, res) => {
  try {
    const conn = await getPool(req).getConnection();
    try {
      const [rows] = await conn.query(
        "SELECT id, type, scheduled_at, time_label, status, location_lat, location_lng, location_label FROM schedules WHERE user_id = ? ORDER BY scheduled_at ASC",
        [req.user.id]
      );
      // map rows to client-friendly format
      const items = rows.map((r) => ({
        id: r.id,
        type: r.type,
        date: r.scheduled_at,
        time: r.time_label,
        status: r.status,
        location: r.location_lat
          ? {
              lat: Number(r.location_lat),
              lng: Number(r.location_lng),
              label: r.location_label,
            }
          : null,
      }));
      return res.json(items);
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Delete schedule (owner only)
app.delete("/api/schedules/:id", authMiddleware, async (req, res) => {
  const id = req.params.id;
  try {
    const conn = await getPool(req).getConnection();
    try {
      // collectors cannot delete schedules
      if (req.user.role === "Collector")
        return res
          .status(403)
          .json({ error: "Collectors cannot delete schedules" });
      const [result] = await conn.query(
        "DELETE FROM schedules WHERE id = ? AND user_id = ?",
        [id, req.user.id]
      );
      if (result.affectedRows === 0)
        return res.status(404).json({ error: "Not found" });
      return res.json({ ok: true });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/collections", authMiddleware, async (req, res) => {
  try {
    const conn = await getPool(req).getConnection();
    try {
      if (req.user.role === "Collector") {
        const [rows] = await conn.query(
          "SELECT id, user_id, type, scheduled_at, status, location_lat, location_lng, location_label FROM schedules WHERE status IN ('Assigned','InProgress','Collected') ORDER BY scheduled_at ASC"
        );
        return res.json(
          rows.map((r) => ({
            id: r.id,
            user_id: r.user_id,
            type: r.type,
            scheduled_at: r.scheduled_at,
            status: r.status,
            location: r.location_lat
              ? {
                  lat: Number(r.location_lat),
                  lng: Number(r.location_lng),
                  label: r.location_label,
                }
              : null,
          }))
        );
      }

      if (req.user.role === "Resident") {
        const [rows] = await conn.query(
          "SELECT id, type, scheduled_at, status, location_lat, location_lng, location_label FROM schedules WHERE user_id = ? ORDER BY scheduled_at ASC",
          [req.user.id]
        );
        return res.json(
          rows.map((r) => ({
            id: r.id,
            type: r.type,
            scheduled_at: r.scheduled_at,
            status: r.status,
            location: r.location_lat
              ? {
                  lat: Number(r.location_lat),
                  lng: Number(r.location_lng),
                  label: r.location_label,
                }
              : null,
          }))
        );
      }
      const [rows] = await conn.query(
        "SELECT id, user_id, type, scheduled_at, status, location_lat, location_lng, location_label FROM schedules ORDER BY scheduled_at ASC"
      );
      return res.json(
        rows.map((r) => ({
          id: r.id,
          user_id: r.user_id,
          type: r.type,
          scheduled_at: r.scheduled_at,
          status: r.status,
          location: r.location_lat
            ? {
                lat: Number(r.location_lat),
                lng: Number(r.location_lng),
                label: r.location_label,
              }
            : null,
        }))
      );
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/payments", authMiddleware, async (req, res) => {
  try {
    const conn = await getPool(req).getConnection();
    try {
      const [tables] = await conn.query(
        "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'payments'",
        [DB_NAME]
      );
      if (!tables || tables.length === 0) return res.json([]);
      if (req.user.role === "Collector") {
        const [rows] = await conn.query(
          "SELECT id, amount, currency, status, created_at FROM payments WHERE collector_id = ? ORDER BY created_at DESC",
          [req.user.id]
        );
        return res.json(rows);
      }
      if (req.user.role === "Resident") {
        const [rows] = await conn.query(
          "SELECT id, amount, currency, status, created_at FROM payments WHERE user_id = ? ORDER BY created_at DESC",
          [req.user.id]
        );
        return res.json(rows);
      }

      const [rows] = await conn.query(
        "SELECT id, user_id, collector_id, amount, currency, status, created_at FROM payments ORDER BY created_at DESC"
      );
      return res.json(rows);
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Start
if (process.env.NODE_ENV !== "test") {
  createPoolAndEnsure()
    .then((p) => {
      global.__DB_POOL = p;
      app.use((req, res, next) => {
        req.dbPool = p;
        next();
      });

      pool = p; // eslint-disable-line no-global-assign
      app.listen(port, () =>
        console.log(`Auth server running on port ${port}`)
      );
    })
    .catch((err) => {
      console.error("Failed to ensure database & users table", err);
      process.exit(1);
    });
}

function __setTestPool(p) {
  pool = p; // eslint-disable-line no-global-assign
  app.use((req, res, next) => {
    req.dbPool = p;
    next();
  });
}

export { app, createPoolAndEnsure, __setTestPool };
