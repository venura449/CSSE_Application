/**
 * Single Responsibility Principle (SRP)
 * PaymentService is responsible only for payment business logic
 */
export class PaymentService {
  constructor(paymentRepository, collectionRequestRepository, scheduleRepository) {
    this.paymentRepository = paymentRepository;
    this.collectionRequestRepository = collectionRequestRepository;
    this.scheduleRepository = scheduleRepository;
  }

  /**
   * Creates a payment for a collection request
   * @param {Object} paymentData Payment data
   * @param {Object} user Current user
   * @returns {Promise<Object>} Payment result
   */
  async createPayment(paymentData, user) {
    const { request_id, amount, currency } = paymentData;

    if (!request_id || !amount) {
      throw new Error("request_id and amount required");
    }

    // Get collection request
    const request = await this.collectionRequestRepository.findById(request_id);
    if (!request) {
      throw new Error("Request not found");
    }

    // Check permissions
    if (user.role === "Resident" && request.user_id !== user.id) {
      throw new Error("Cannot pay for another user's request");
    }

    // Create payment
    const payment = await this.paymentRepository.create({
      request_id,
      user_id: request.user_id,
      amount,
      currency: currency || 'USD',
      status: 'Completed',
      details: { by: user.id }
    });

    // Update collection request status
    await this.collectionRequestRepository.update(request_id, {
      status: 'Paid',
      payment_id: payment.id,
      paid_at: new Date()
    });

    // Create schedule entry
    const scheduleId = `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const scheduledAt = request.preferred_datetime ? new Date(request.preferred_datetime) : new Date();
    
    await this.scheduleRepository.create({
      id: scheduleId,
      user_id: request.user_id,
      type: `Special: ${request.item_type}`,
      scheduled_at: scheduledAt,
      time_label: request.preferred_time_label,
      status: 'Scheduled'
    });

    return {
      paymentId: payment.id,
      scheduleId: scheduleId
    };
  }

  /**
   * Gets payments based on user role
   * @param {Object} user Current user
   * @returns {Promise<Object[]>} Array of payments
   */
  async getPayments(user) {
    // Check if payments table exists
    const tableExists = await this.paymentRepository.tableExists();
    if (!tableExists) {
      return [];
    }

    let payments = [];

    if (user.role === "Collector") {
      payments = await this.paymentRepository.findByCollectorId(user.id);
    } else if (user.role === "Resident") {
      payments = await this.paymentRepository.findByUserId(user.id);
    } else {
      payments = await this.paymentRepository.findAll();
    }

    return payments;
  }
}

