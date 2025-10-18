/**
 * Interface Segregation Principle (ISP)
 * Defines a focused interface for database operations
 */
export class IDatabase {
  async getConnection() {
    throw new Error("Method must be implemented");
  }
  
  async query(sql, params = []) {
    throw new Error("Method must be implemented");
  }
  
  async close() {
    throw new Error("Method must be implemented");
  }
}

