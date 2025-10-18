/**
 * Single Responsibility Principle (SRP)
 * DatabaseRepository is responsible only for database operations
 * Implements IDatabase interface
 */
import mysql from "mysql2/promise";
import { IDatabase } from "../interfaces/IDatabase.js";
import { DatabaseConfig } from "../config/DatabaseConfig.js";

export class DatabaseRepository extends IDatabase {
  constructor() {
    super();
    this.config = new DatabaseConfig();
    this.pool = null;
  }

  /**
   * Creates database and tables if they don't exist
   * @returns {Promise<Object>} Database pool
   */
  async initialize() {
    // Create database if not exists
    const adminConn = await mysql.createConnection(this.config.getConnectionConfig());
    try {
      await adminConn.query(
        `CREATE DATABASE IF NOT EXISTS \`${this.config.getDatabaseName()}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
    } finally {
      await adminConn.end();
    }

    // Create pool
    this.pool = mysql.createPool(this.config.getPoolConfig());

    // Create tables
    await this.createTables();
    
    return this.pool;
  }

  /**
   * Creates all necessary tables
   * @returns {Promise<void>}
   */
  async createTables() {
    const conn = await this.pool.getConnection();
    try {
      // Create users table
      await conn.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          name VARCHAR(255),
          role VARCHAR(50) NOT NULL DEFAULT 'Resident',
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
      `);

      // Create collection_requests table
      await conn.query(`
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
      `);

      // Create payments table
      await conn.query(`
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
      `);

      // Create schedules table
      await conn.query(`
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
      `);

      // Ensure role column exists (for backward compatibility)
      await this.ensureColumnExists(conn, 'users', 'role', 'VARCHAR(50) NOT NULL DEFAULT \'Resident\'');
      
      // Ensure assigned_collector_id column exists (for backward compatibility)
      await this.ensureColumnExists(conn, 'collection_requests', 'assigned_collector_id', 'INT NULL');

    } finally {
      conn.release();
    }
  }

  /**
   * Ensures a column exists in a table (for backward compatibility)
   * @param {Object} conn Database connection
   * @param {string} tableName Table name
   * @param {string} columnName Column name
   * @param {string} columnDefinition Column definition
   * @returns {Promise<void>}
   */
  async ensureColumnExists(conn, tableName, columnName, columnDefinition) {
    try {
      await conn.query(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${columnDefinition}`);
    } catch (e) {
      try {
        const [cols] = await conn.query(
          "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?",
          [this.config.getDatabaseName(), tableName, columnName]
        );
        if (!cols || cols.length === 0) {
          await conn.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
        }
      } catch (ee) {
        console.warn(`Could not ensure ${columnName} column exists:`, ee.message || ee);
      }
    }
  }

  /**
   * Gets a connection from the pool
   * @returns {Promise<Object>} Database connection
   */
  async getConnection() {
    if (!this.pool) {
      throw new Error("Database not initialized");
    }
    return await this.pool.getConnection();
  }

  /**
   * Executes a query
   * @param {string} sql SQL query
   * @param {Array} params Query parameters
   * @returns {Promise<Array>} Query results
   */
  async query(sql, params = []) {
    if (!this.pool) {
      throw new Error("Database not initialized");
    }
    return await this.pool.query(sql, params);
  }

  /**
   * Closes the database pool
   * @returns {Promise<void>}
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

