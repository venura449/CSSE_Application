/**
 * Interface Segregation Principle (ISP)
 * Defines a focused interface for collection request data operations
 */
export class ICollectionRequestRepository {
  async create(requestData) {
    throw new Error("Method must be implemented");
  }
  
  async findById(id) {
    throw new Error("Method must be implemented");
  }
  
  async findByUserId(userId) {
    throw new Error("Method must be implemented");
  }
  
  async findByStatus(status) {
    throw new Error("Method must be implemented");
  }
  
  async findByCollectorId(collectorId) {
    throw new Error("Method must be implemented");
  }
  
  async update(id, requestData) {
    throw new Error("Method must be implemented");
  }
  
  async delete(id) {
    throw new Error("Method must be implemented");
  }
  
  async assignCollector(id, collectorId) {
    throw new Error("Method must be implemented");
  }
}

