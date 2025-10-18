/**
 * Single Responsibility Principle (SRP)
 * Schedule model is responsible only for schedule data structure and validation
 */
export class Schedule {
  constructor({
    id,
    user_id,
    type,
    scheduled_at,
    time_label,
    status,
    location_lat,
    location_lng,
    location_label,
    created_at
  }) {
    this.id = id;
    this.user_id = user_id;
    this.type = type;
    this.scheduled_at = scheduled_at;
    this.time_label = time_label;
    this.status = status || 'Scheduled';
    this.location_lat = location_lat;
    this.location_lng = location_lng;
    this.location_label = location_label;
    this.created_at = created_at;
  }

  /**
   * Validates schedule data
   * @param {Object} scheduleData 
   * @returns {Object} validation result
   */
  static validate(scheduleData) {
    const errors = [];
    
    if (!scheduleData.type) {
      errors.push("Type is required");
    }
    
    if (!scheduleData.scheduled_at) {
      errors.push("Scheduled date is required");
    } else if (new Date(scheduleData.scheduled_at) < new Date()) {
      errors.push("Scheduled date cannot be in the past");
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generates a unique ID for schedule
   * @returns {string}
   */
  static generateId() {
    return `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  /**
   * Returns schedule data in a safe format
   * @returns {Object}
   */
  toSafeObject() {
    return {
      id: this.id,
      user_id: this.user_id,
      type: this.type,
      scheduled_at: this.scheduled_at,
      time_label: this.time_label,
      status: this.status,
      location: this.location_lat ? {
        lat: Number(this.location_lat),
        lng: Number(this.location_lng),
        label: this.location_label
      } : null,
      created_at: this.created_at
    };
  }
}

