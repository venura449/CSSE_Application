/**
 * Single Responsibility Principle (SRP)
 * CollectionRequest model is responsible only for collection request data structure and validation
 */
export class CollectionRequest {
  constructor({
    id,
    user_id,
    item_type,
    preferred_datetime,
    preferred_time_label,
    photos,
    estimated_cost,
    status,
    payment_required,
    payment_id,
    assigned_collector_id,
    created_at,
    paid_at
  }) {
    this.id = id;
    this.user_id = user_id;
    this.item_type = item_type;
    this.preferred_datetime = preferred_datetime;
    this.preferred_time_label = preferred_time_label;
    this.photos = photos;
    this.estimated_cost = estimated_cost || 0;
    this.status = status || 'PendingPayment';
    this.payment_required = payment_required || false;
    this.payment_id = payment_id;
    this.assigned_collector_id = assigned_collector_id;
    this.created_at = created_at;
    this.paid_at = paid_at;
  }

  /**
   * Validates collection request data
   * @param {Object} requestData 
   * @returns {Object} validation result
   */
  static validate(requestData) {
    const errors = [];
    
    if (!requestData.item_type) {
      errors.push("Item type is required");
    }
    
    if (requestData.estimated_cost !== undefined && requestData.estimated_cost < 0) {
      errors.push("Estimated cost cannot be negative");
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Determines if payment is required based on estimated cost
   * @param {number} estimatedCost 
   * @returns {boolean}
   */
  static isPaymentRequired(estimatedCost) {
    return (Number(estimatedCost) || 0) > 0;
  }

  /**
   * Determines initial status based on payment requirement
   * @param {boolean} paymentRequired 
   * @returns {string}
   */
  static getInitialStatus(paymentRequired) {
    return paymentRequired ? 'PendingPayment' : 'Scheduled';
  }

  /**
   * Generates a unique ID for collection request
   * @returns {string}
   */
  static generateId() {
    return `cr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  /**
   * Returns collection request data in a safe format
   * @returns {Object}
   */
  toSafeObject() {
    return {
      id: this.id,
      user_id: this.user_id,
      item_type: this.item_type,
      preferred_datetime: this.preferred_datetime,
      preferred_time_label: this.preferred_time_label,
      photos: this.photos ? JSON.parse(this.photos) : null,
      estimated_cost: Number(this.estimated_cost),
      status: this.status,
      payment_required: !!this.payment_required,
      assigned_collector_id: this.assigned_collector_id,
      created_at: this.created_at,
      paid_at: this.paid_at
    };
  }
}

