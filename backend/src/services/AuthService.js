/**
 * Single Responsibility Principle (SRP)
 * AuthService is responsible only for authentication operations
 * Implements IAuthService interface
 */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { IAuthService } from "../interfaces/IAuthService.js";
import { User } from "../models/User.js";

export class AuthService extends IAuthService {
  constructor(userRepository) {
    super();
    this.userRepository = userRepository;
    this.jwtSecret = process.env.JWT_SECRET || "secret";
    this.jwtExpiry = "7d";
  }

  /**
   * Signs up a new user
   * @param {Object} userData User data
   * @returns {Promise<Object>} Signup result with token and user data
   */
  async signup(userData) {
    // Validate user data
    const validation = User.validate(userData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error("Email already registered");
    }

    // Determine role
    const role = User.determineRole(userData.email);
    
    // Hash password
    const password_hash = await this.hashPassword(userData.password);

    // Create user
    const user = await this.userRepository.create({
      email: userData.email,
      name: userData.name,
      role,
      password_hash
    });

    // Generate token
    const token = this.generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    return {
      token,
      user: user.toSafeObject()
    };
  }

  /**
   * Signs in a user
   * @param {string} email User email
   * @param {string} password User password
   * @returns {Promise<Object>} Signin result with token and user data
   */
  async signin(email, password) {
    if (!email || !password) {
      throw new Error("Email and password required");
    }

    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error("Invalid credentials");
    }

    // Verify password
    const isValidPassword = await this.comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error("Invalid credentials");
    }

    // Generate token
    const token = this.generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    return {
      token,
      user: user.toSafeObject()
    };
  }

  /**
   * Verifies JWT token
   * @param {string} token JWT token
   * @returns {Promise<Object>} Token payload
   */
  async verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error("Invalid token");
    }
  }

  /**
   * Hashes a password
   * @param {string} password Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  /**
   * Compares password with hash
   * @param {string} password Plain text password
   * @param {string} hash Hashed password
   * @returns {Promise<boolean>} Password match result
   */
  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generates JWT token
   * @param {Object} payload Token payload
   * @returns {string} JWT token
   */
  generateToken(payload) {
    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiry });
  }
}

