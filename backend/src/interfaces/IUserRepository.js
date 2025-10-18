/**
 * Interface Segregation Principle (ISP)
 * Defines a focused interface for user data operations
 */
export class IUserRepository {
  async create(userData) {
    throw new Error("Method must be implemented");
  }
  
  async findByEmail(email) {
    throw new Error("Method must be implemented");
  }
  
  async findById(id) {
    throw new Error("Method must be implemented");
  }
  
  async findByRole(role) {
    throw new Error("Method must be implemented");
  }
  
  async update(id, userData) {
    throw new Error("Method must be implemented");
  }
  
  async delete(id) {
    throw new Error("Method must be implemented");
  }
}

