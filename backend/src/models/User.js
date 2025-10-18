/**
 * Single Responsibility Principle (SRP)
 * User model is responsible only for user data structure and validation
 */
export class User {
  constructor({ id, email, name, role, password_hash, created_at }) {
    this.id = id;
    this.email = email;
    this.name = name;
    this.role = role || 'Resident';
    this.password_hash = password_hash;
    this.created_at = created_at;
  }

  /**
   * Determines user role based on email domain
   * @param {string} email 
   * @returns {string}
   */
  static determineRole(email) {
    const e = (email || "").toLowerCase();
    if (e.endsWith("@admin.com")) return "Authority";
    if (e.endsWith("@collector.com")) return "Collector";
    return "Resident";
  }

  /**
   * Validates user data
   * @param {Object} userData 
   * @returns {Object} validation result
   */
  static validate(userData) {
    const errors = [];
    
    if (!userData.email) {
      errors.push("Email is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.push("Invalid email format");
    }
    
    if (!userData.password) {
      errors.push("Password is required");
    } else if (userData.password.length < 6) {
      errors.push("Password must be at least 6 characters");
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Returns user data without sensitive information
   * @returns {Object}
   */
  toSafeObject() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      role: this.role,
      created_at: this.created_at
    };
  }
}

