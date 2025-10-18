/**
 * Single Responsibility Principle (SRP)
 * DatabaseConfig is responsible only for database configuration
 */
import mysql from "mysql2/promise";

export class DatabaseConfig {
  constructor() {
    this.DB_HOST = process.env.DB_HOST || "127.0.0.1";
    this.DB_PORT = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
    this.DB_USER = process.env.DB_USER || "root";
    this.DB_PASSWORD = process.env.DB_PASSWORD || "";
    this.DB_NAME = process.env.DB_NAME || "csse_app";
  }

  /**
   * Creates database connection configuration
   * @returns {Object}
   */
  getConnectionConfig() {
    return {
      host: this.DB_HOST,
      port: this.DB_PORT,
      user: this.DB_USER,
      password: this.DB_PASSWORD,
    };
  }

  /**
   * Creates database pool configuration
   * @returns {Object}
   */
  getPoolConfig() {
    return {
      ...this.getConnectionConfig(),
      database: this.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };
  }

  /**
   * Gets database name
   * @returns {string}
   */
  getDatabaseName() {
    return this.DB_NAME;
  }
}

