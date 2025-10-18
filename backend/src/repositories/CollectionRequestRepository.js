/**
 * Single Responsibility Principle (SRP)
 * CollectionRequestRepository is responsible only for collection request data operations
 * Implements ICollectionRequestRepository interface
 */
import { ICollectionRequestRepository } from "../interfaces/ICollectionRequestRepository.js";
import { CollectionRequest } from "../models/CollectionRequest.js";

export class CollectionRequestRepository extends ICollectionRequestRepository {
  constructor(database) {
    super();
    this.database = database;
  }

  /**
   * Creates a new collection request
   * @param {Object} requestData Collection request data
   * @returns {Promise<CollectionRequest>} Created collection request
   */
  async create(requestData) {
    const conn = await this.database.getConnection();
    try {
      await conn.query(
        "INSERT INTO collection_requests (id, user_id, item_type, preferred_datetime, preferred_time_label, photos, estimated_cost, status, payment_required) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          requestData.id,
          requestData.user_id,
          requestData.item_type,
          requestData.preferred_datetime,
          requestData.preferred_time_label || null,
          requestData.photos ? JSON.stringify(requestData.photos) : null,
          Number(requestData.estimated_cost) || 0,
          requestData.status,
          requestData.payment_required ? 1 : 0,
        ]
      );
      
      return new CollectionRequest(requestData);
    } finally {
      conn.release();
    }
  }

  /**
   * Finds collection request by ID
   * @param {string} id Collection request ID
   * @returns {Promise<CollectionRequest|null>} Collection request or null if not found
   */
  async findById(id) {
    const conn = await this.database.getConnection();
    try {
      const [rows] = await conn.query(
        "SELECT id, user_id, item_type, preferred_datetime, preferred_time_label, photos, estimated_cost, status, payment_required, payment_id, assigned_collector_id, created_at, paid_at FROM collection_requests WHERE id = ?",
        [id]
      );
      
      if (rows.length === 0) return null;
      
      return new CollectionRequest(rows[0]);
    } finally {
      conn.release();
    }
  }

  /**
   * Finds collection requests by user ID
   * @param {number} userId User ID
   * @returns {Promise<CollectionRequest[]>} Array of collection requests
   */
  async findByUserId(userId) {
    const conn = await this.database.getConnection();
    try {
      const [rows] = await conn.query(
        "SELECT id, user_id, item_type, preferred_datetime, preferred_time_label, photos, estimated_cost, status, payment_required, payment_id, assigned_collector_id, created_at, paid_at FROM collection_requests WHERE user_id = ? ORDER BY created_at DESC",
        [userId]
      );
      
      return rows.map(row => new CollectionRequest(row));
    } finally {
      conn.release();
    }
  }

  /**
   * Finds collection requests by status
   * @param {string|string[]} status Status or array of statuses
   * @returns {Promise<CollectionRequest[]>} Array of collection requests
   */
  async findByStatus(status) {
    const conn = await this.database.getConnection();
    try {
      const statuses = Array.isArray(status) ? status : [status];
      const placeholders = statuses.map(() => '?').join(',');
      
      const [rows] = await conn.query(
        `SELECT id, user_id, item_type, preferred_datetime, preferred_time_label, photos, estimated_cost, status, payment_required, payment_id, assigned_collector_id, created_at, paid_at FROM collection_requests WHERE status IN (${placeholders}) ORDER BY created_at DESC`,
        statuses
      );
      
      return rows.map(row => new CollectionRequest(row));
    } finally {
      conn.release();
    }
  }

  /**
   * Finds collection requests by collector ID
   * @param {number} collectorId Collector ID
   * @returns {Promise<CollectionRequest[]>} Array of collection requests
   */
  async findByCollectorId(collectorId) {
    const conn = await this.database.getConnection();
    try {
      const [rows] = await conn.query(
        "SELECT id, user_id, item_type, preferred_datetime, preferred_time_label, photos, estimated_cost, status, payment_required, payment_id, assigned_collector_id, created_at, paid_at FROM collection_requests WHERE assigned_collector_id = ? ORDER BY created_at DESC",
        [collectorId]
      );
      
      return rows.map(row => new CollectionRequest(row));
    } finally {
      conn.release();
    }
  }

  /**
   * Updates collection request
   * @param {string} id Collection request ID
   * @param {Object} requestData Collection request data to update
   * @returns {Promise<boolean>} Success status
   */
  async update(id, requestData) {
    const conn = await this.database.getConnection();
    try {
      const updateFields = [];
      const values = [];
      
      if (requestData.item_type !== undefined) {
        updateFields.push("item_type = ?");
        values.push(requestData.item_type);
      }
      if (requestData.preferred_datetime !== undefined) {
        updateFields.push("preferred_datetime = ?");
        values.push(requestData.preferred_datetime);
      }
      if (requestData.preferred_time_label !== undefined) {
        updateFields.push("preferred_time_label = ?");
        values.push(requestData.preferred_time_label);
      }
      if (requestData.photos !== undefined) {
        updateFields.push("photos = ?");
        values.push(requestData.photos ? JSON.stringify(requestData.photos) : null);
      }
      if (requestData.estimated_cost !== undefined) {
        updateFields.push("estimated_cost = ?");
        values.push(Number(requestData.estimated_cost));
      }
      if (requestData.status !== undefined) {
        updateFields.push("status = ?");
        values.push(requestData.status);
      }
      if (requestData.payment_required !== undefined) {
        updateFields.push("payment_required = ?");
        values.push(requestData.payment_required ? 1 : 0);
      }
      if (requestData.payment_id !== undefined) {
        updateFields.push("payment_id = ?");
        values.push(requestData.payment_id);
      }
      if (requestData.assigned_collector_id !== undefined) {
        updateFields.push("assigned_collector_id = ?");
        values.push(requestData.assigned_collector_id);
      }
      if (requestData.paid_at !== undefined) {
        updateFields.push("paid_at = ?");
        values.push(requestData.paid_at);
      }
      
      if (updateFields.length === 0) return false;
      
      values.push(id);
      
      const [result] = await conn.query(
        `UPDATE collection_requests SET ${updateFields.join(", ")} WHERE id = ?`,
        values
      );
      
      return result.affectedRows > 0;
    } finally {
      conn.release();
    }
  }

  /**
   * Deletes collection request
   * @param {string} id Collection request ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    const conn = await this.database.getConnection();
    try {
      const [result] = await conn.query("DELETE FROM collection_requests WHERE id = ?", [id]);
      return result.affectedRows > 0;
    } finally {
      conn.release();
    }
  }

  /**
   * Assigns collector to collection request
   * @param {string} id Collection request ID
   * @param {number} collectorId Collector ID
   * @returns {Promise<boolean>} Success status
   */
  async assignCollector(id, collectorId) {
    const conn = await this.database.getConnection();
    try {
      const [result] = await conn.query(
        "UPDATE collection_requests SET assigned_collector_id = ?, status = ? WHERE id = ?",
        [collectorId, "Assigned", id]
      );
      
      return result.affectedRows > 0;
    } finally {
      conn.release();
    }
  }

  /**
   * Gets all collection requests (for Authority role)
   * @returns {Promise<CollectionRequest[]>} Array of collection requests
   */
  async findAll() {
    const conn = await this.database.getConnection();
    try {
      const [rows] = await conn.query(
        "SELECT id, user_id, item_type, preferred_datetime, preferred_time_label, photos, estimated_cost, status, payment_required, payment_id, assigned_collector_id, created_at, paid_at FROM collection_requests ORDER BY created_at DESC"
      );
      
      return rows.map(row => new CollectionRequest(row));
    } finally {
      conn.release();
    }
  }
}

