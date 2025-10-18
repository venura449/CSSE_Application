/**
 * Single Responsibility Principle (SRP)
 * ScheduleRepository is responsible only for schedule data operations
 */
import { Schedule } from "../models/Schedule.js";

export class ScheduleRepository {
  constructor(database) {
    this.database = database;
  }

  /**
   * Creates a new schedule
   * @param {Object} scheduleData Schedule data
   * @returns {Promise<Schedule>} Created schedule
   */
  async create(scheduleData) {
    const conn = await this.database.getConnection();
    try {
      await conn.query(
        "INSERT INTO schedules (id, user_id, type, scheduled_at, time_label, status, location_lat, location_lng, location_label) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          scheduleData.id,
          scheduleData.user_id,
          scheduleData.type,
          scheduleData.scheduled_at,
          scheduleData.time_label || null,
          scheduleData.status || 'Scheduled',
          scheduleData.location_lat || null,
          scheduleData.location_lng || null,
          scheduleData.location_label || null,
        ]
      );
      
      return new Schedule(scheduleData);
    } finally {
      conn.release();
    }
  }

  /**
   * Finds schedules by user ID
   * @param {number} userId User ID
   * @returns {Promise<Schedule[]>} Array of schedules
   */
  async findByUserId(userId) {
    const conn = await this.database.getConnection();
    try {
      const [rows] = await conn.query(
        "SELECT id, user_id, type, scheduled_at, time_label, status, location_lat, location_lng, location_label, created_at FROM schedules WHERE user_id = ? ORDER BY scheduled_at ASC",
        [userId]
      );
      
      return rows.map(row => new Schedule(row));
    } finally {
      conn.release();
    }
  }

  /**
   * Finds schedules by status
   * @param {string|string[]} status Status or array of statuses
   * @returns {Promise<Schedule[]>} Array of schedules
   */
  async findByStatus(status) {
    const conn = await this.database.getConnection();
    try {
      const statuses = Array.isArray(status) ? status : [status];
      const placeholders = statuses.map(() => '?').join(',');
      
      const [rows] = await conn.query(
        `SELECT id, user_id, type, scheduled_at, time_label, status, location_lat, location_lng, location_label, created_at FROM schedules WHERE status IN (${placeholders}) ORDER BY scheduled_at ASC`,
        statuses
      );
      
      return rows.map(row => new Schedule(row));
    } finally {
      conn.release();
    }
  }

  /**
   * Deletes a schedule
   * @param {string} id Schedule ID
   * @param {number} userId User ID (for authorization)
   * @returns {Promise<boolean>} Success status
   */
  async delete(id, userId) {
    const conn = await this.database.getConnection();
    try {
      const [result] = await conn.query(
        "DELETE FROM schedules WHERE id = ? AND user_id = ?",
        [id, userId]
      );
      
      return result.affectedRows > 0;
    } finally {
      conn.release();
    }
  }

  /**
   * Gets all schedules (for Authority role)
   * @returns {Promise<Schedule[]>} Array of schedules
   */
  async findAll() {
    const conn = await this.database.getConnection();
    try {
      const [rows] = await conn.query(
        "SELECT id, user_id, type, scheduled_at, time_label, status, location_lat, location_lng, location_label, created_at FROM schedules ORDER BY scheduled_at ASC"
      );
      
      return rows.map(row => new Schedule(row));
    } finally {
      conn.release();
    }
  }
}

