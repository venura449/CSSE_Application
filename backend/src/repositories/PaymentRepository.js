/**
 * Single Responsibility Principle (SRP)
 * PaymentRepository is responsible only for payment data operations
 */
export class PaymentRepository {
  constructor(database) {
    this.database = database;
  }

  /**
   * Creates a new payment
   * @param {Object} paymentData Payment data
   * @returns {Promise<Object>} Created payment with ID
   */
  async create(paymentData) {
    const conn = await this.database.getConnection();
    try {
      const [result] = await conn.query(
        "INSERT INTO payments (request_id, user_id, collector_id, amount, currency, status, details) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          paymentData.request_id,
          paymentData.user_id,
          paymentData.collector_id || null,
          Number(paymentData.amount),
          paymentData.currency || 'USD',
          paymentData.status || 'Completed',
          paymentData.details ? JSON.stringify(paymentData.details) : null,
        ]
      );
      
      return {
        id: result.insertId,
        ...paymentData
      };
    } finally {
      conn.release();
    }
  }

  /**
   * Finds payments by user ID
   * @param {number} userId User ID
   * @returns {Promise<Object[]>} Array of payments
   */
  async findByUserId(userId) {
    const conn = await this.database.getConnection();
    try {
      const [rows] = await conn.query(
        "SELECT id, request_id, user_id, collector_id, amount, currency, status, details, created_at FROM payments WHERE user_id = ? ORDER BY created_at DESC",
        [userId]
      );
      
      return rows;
    } finally {
      conn.release();
    }
  }

  /**
   * Finds payments by collector ID
   * @param {number} collectorId Collector ID
   * @returns {Promise<Object[]>} Array of payments
   */
  async findByCollectorId(collectorId) {
    const conn = await this.database.getConnection();
    try {
      const [rows] = await conn.query(
        "SELECT id, request_id, user_id, collector_id, amount, currency, status, details, created_at FROM payments WHERE collector_id = ? ORDER BY created_at DESC",
        [collectorId]
      );
      
      return rows;
    } finally {
      conn.release();
    }
  }

  /**
   * Gets all payments (for Authority role)
   * @returns {Promise<Object[]>} Array of payments
   */
  async findAll() {
    const conn = await this.database.getConnection();
    try {
      const [rows] = await conn.query(
        "SELECT id, request_id, user_id, collector_id, amount, currency, status, details, created_at FROM payments ORDER BY created_at DESC"
      );
      
      return rows;
    } finally {
      conn.release();
    }
  }

  /**
   * Checks if payments table exists
   * @returns {Promise<boolean>} Table existence status
   */
  async tableExists() {
    const conn = await this.database.getConnection();
    try {
      const [tables] = await conn.query(
        "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'payments'",
        [this.database.config.getDatabaseName()]
      );
      
      return tables && tables.length > 0;
    } finally {
      conn.release();
    }
  }
}

