/**
 * Single Responsibility Principle (SRP)
 * CollectionRequestService is responsible only for collection request business logic
 */
import { CollectionRequest } from "../models/CollectionRequest.js";

export class CollectionRequestService {
  constructor(collectionRequestRepository, userRepository) {
    this.collectionRequestRepository = collectionRequestRepository;
    this.userRepository = userRepository;
  }

  /**
   * Creates a new collection request
   * @param {Object} requestData Collection request data
   * @param {Object} user Current user
   * @returns {Promise<Object>} Created collection request
   */
  async createRequest(requestData, user) {
    // Validate request data
    const validation = CollectionRequest.validate(requestData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    // Check if user can create requests
    if (user.role === "Collector") {
      throw new Error("Collectors cannot create collection requests");
    }

    // Generate ID
    const id = CollectionRequest.generateId();
    
    // Determine payment requirement and status
    const payment_required = CollectionRequest.isPaymentRequired(requestData.estimated_cost);
    const status = CollectionRequest.getInitialStatus(payment_required);

    // Prepare request data
    const request = {
      id,
      user_id: user.id,
      item_type: requestData.item_type,
      preferred_datetime: requestData.preferred_date ? new Date(requestData.preferred_date) : null,
      preferred_time_label: requestData.preferred_time_label || null,
      photos: requestData.photos || null,
      estimated_cost: Number(requestData.estimated_cost) || 0,
      status,
      payment_required
    };

    // Create request
    const createdRequest = await this.collectionRequestRepository.create(request);
    
    return {
      id: createdRequest.id,
      status: createdRequest.status
    };
  }

  /**
   * Gets collection requests based on user role
   * @param {Object} user Current user
   * @returns {Promise<Object[]>} Array of collection requests
   */
  async getRequests(user) {
    let requests = [];

    if (user.role === "Collector") {
      // Collectors see assigned and scheduled requests
      requests = await this.collectionRequestRepository.findByStatus(['Scheduled', 'Assigned', 'Paid']);
    } else if (user.role === "Resident") {
      // Residents see only their own requests
      requests = await this.collectionRequestRepository.findByUserId(user.id);
    } else {
      // Authority sees all requests
      requests = await this.collectionRequestRepository.findAll();
    }

    return requests.map(request => request.toSafeObject());
  }

  /**
   * Updates a collection request
   * @param {string} id Collection request ID
   * @param {Object} requestData Updated request data
   * @param {Object} user Current user
   * @returns {Promise<boolean>} Success status
   */
  async updateRequest(id, requestData, user) {
    // Get existing request
    const existingRequest = await this.collectionRequestRepository.findById(id);
    if (!existingRequest) {
      throw new Error("Request not found");
    }

    // Check permissions
    if (user.role !== "Authority" && existingRequest.user_id !== user.id) {
      throw new Error("Forbidden");
    }

    // Check if request can be edited
    if (existingRequest.status === "Paid") {
      throw new Error("Cannot edit a paid request");
    }

    // Prepare update data
    const updateData = {};
    if (requestData.item_type !== undefined) updateData.item_type = requestData.item_type;
    if (requestData.preferred_date !== undefined) {
      updateData.preferred_datetime = requestData.preferred_date ? new Date(requestData.preferred_date) : null;
    }
    if (requestData.preferred_time_label !== undefined) {
      updateData.preferred_time_label = requestData.preferred_time_label;
    }
    if (requestData.photos !== undefined) updateData.photos = requestData.photos;
    if (requestData.estimated_cost !== undefined) {
      updateData.estimated_cost = Number(requestData.estimated_cost);
    }

    return await this.collectionRequestRepository.update(id, updateData);
  }

  /**
   * Deletes a collection request
   * @param {string} id Collection request ID
   * @param {Object} user Current user
   * @returns {Promise<boolean>} Success status
   */
  async deleteRequest(id, user) {
    // Get existing request
    const existingRequest = await this.collectionRequestRepository.findById(id);
    if (!existingRequest) {
      throw new Error("Request not found");
    }

    // Check permissions
    if (user.role !== "Authority" && existingRequest.user_id !== user.id) {
      throw new Error("Forbidden");
    }

    // Check if request can be deleted
    if (existingRequest.status === "Paid") {
      throw new Error("Cannot delete a paid request");
    }

    return await this.collectionRequestRepository.delete(id);
  }

  /**
   * Assigns a collector to a collection request
   * @param {string} id Collection request ID
   * @param {number} collectorId Collector ID
   * @param {Object} user Current user
   * @returns {Promise<boolean>} Success status
   */
  async assignCollector(id, collectorId, user) {
    // Check permissions
    if (!["Authority", "Admin"].includes(user.role)) {
      throw new Error("Forbidden");
    }

    // Verify request exists
    const request = await this.collectionRequestRepository.findById(id);
    if (!request) {
      throw new Error("Request not found");
    }

    // Verify collector exists
    const collector = await this.userRepository.findById(collectorId);
    if (!collector || collector.role !== "Collector") {
      throw new Error("Collector not found");
    }

    return await this.collectionRequestRepository.assignCollector(id, collectorId);
  }

  /**
   * Gets collectors list
   * @returns {Promise<Object[]>} Array of collectors
   */
  async getCollectors() {
    const collectors = await this.userRepository.findByRole("Collector");
    return collectors.map(collector => ({
      id: collector.id,
      email: collector.email,
      name: collector.name
    }));
  }
}

