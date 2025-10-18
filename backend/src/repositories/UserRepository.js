/**
 * Single Responsibility Principle (SRP)
 * UserRepository is responsible only for user data operations
 * Implements IUserRepository interface
 */
import { IUserRepository } from "../interfaces/IUserRepository.js";
import { User } from "../models/User.js";

export class UserRepository extends IUserRepository {
  constructor(database) {
    super();
    this.database = database;
  }

  /**
   * Creates a new user
   * @param {Object} userData User data
   * @returns {Promise<User>} Created user
   */
  async create(userData) {
    const conn = await this.database.getConnection();
    try {
      const [result] = await conn.query(
        "INSERT INTO users (email, name, role, password_hash) VALUES (?, ?, ?, ?)",
        [userData.email, userData.name || null, userData.role, userData.password_hash]
      );
      
      return new User({
        id: result.insertId,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        password_hash: userData.password_hash,
        created_at: new Date()
      });
    } finally {
      conn.release();
    }
  }

  /**
   * Finds user by email
   * @param {string} email User email
   * @returns {Promise<User|null>} User or null if not found
   */
  async findByEmail(email) {
    const conn = await this.database.getConnection();
    try {
      const [rows] = await conn.query(
        "SELECT id, email, name, role, password_hash, created_at FROM users WHERE email = ?",
        [email]
      );
      
      if (rows.length === 0) return null;
      
      return new User(rows[0]);
    } finally {
      conn.release();
    }
  }

  /**
   * Finds user by ID
   * @param {number} id User ID
   * @returns {Promise<User|null>} User or null if not found
   */
  async findById(id) {
    const conn = await this.database.getConnection();
    try {
      const [rows] = await conn.query(
        "SELECT id, email, name, role, password_hash, created_at FROM users WHERE id = ?",
        [id]
      );
      
      if (rows.length === 0) return null;
      
      return new User(rows[0]);
    } finally {
      conn.release();
    }
  }

  /**
   * Finds users by role
   * @param {string} role User role
   * @returns {Promise<User[]>} Array of users
   */
  async findByRole(role) {
    const conn = await this.database.getConnection();
    try {
      const [rows] = await conn.query(
        "SELECT id, email, name, role, password_hash, created_at FROM users WHERE role = ? ORDER BY name ASC",
        [role]
      );
      
      return rows.map(row => new User(row));
    } finally {
      conn.release();
    }
  }

  /**
   * Updates user data
   * @param {number} id User ID
   * @param {Object} userData User data to update
   * @returns {Promise<boolean>} Success status
   */
  async update(id, userData) {
    const conn = await this.database.getConnection();
    try {
      const updateFields = [];
      const values = [];
      
      if (userData.email !== undefined) {
        updateFields.push("email = ?");
        values.push(userData.email);
      }
      if (userData.name !== undefined) {
        updateFields.push("name = ?");
        values.push(userData.name);
      }
      if (userData.role !== undefined) {
        updateFields.push("role = ?");
        values.push(userData.role);
      }
      if (userData.password_hash !== undefined) {
        updateFields.push("password_hash = ?");
        values.push(userData.password_hash);
      }
      
      if (updateFields.length === 0) return false;
      
      values.push(id);
      
      const [result] = await conn.query(
        `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`,
        values
      );
      
      return result.affectedRows > 0;
    } finally {
      conn.release();
    }
  }

  /**
   * Deletes user
   * @param {number} id User ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    const conn = await this.database.getConnection();
    try {
      const [result] = await conn.query("DELETE FROM users WHERE id = ?", [id]);
      return result.affectedRows > 0;
    } finally {
      conn.release();
    }
  }
}

