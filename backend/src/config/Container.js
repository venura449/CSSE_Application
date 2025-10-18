/**
 * Dependency Inversion Principle (DIP)
 * Container manages dependency injection and inversion of control
 */
import { DatabaseRepository } from "../repositories/DatabaseRepository.js";
import { UserRepository } from "../repositories/UserRepository.js";
import { CollectionRequestRepository } from "../repositories/CollectionRequestRepository.js";
import { ScheduleRepository } from "../repositories/ScheduleRepository.js";
import { PaymentRepository } from "../repositories/PaymentRepository.js";
import { AuthService } from "../services/AuthService.js";
import { CollectionRequestService } from "../services/CollectionRequestService.js";
import { ScheduleService } from "../services/ScheduleService.js";
import { PaymentService } from "../services/PaymentService.js";
import { AuthController } from "../controllers/AuthController.js";
import { CollectionRequestController } from "../controllers/CollectionRequestController.js";
import { ScheduleController } from "../controllers/ScheduleController.js";
import { PaymentController } from "../controllers/PaymentController.js";
import { AuthMiddleware } from "../middleware/AuthMiddleware.js";

export class Container {
  constructor() {
    this.services = new Map();
    this.initializeServices();
  }

  /**
   * Initializes all services with proper dependency injection
   */
  initializeServices() {
    // Database layer
    this.services.set('database', new DatabaseRepository());
    
    // Repository layer
    this.services.set('userRepository', new UserRepository(this.services.get('database')));
    this.services.set('collectionRequestRepository', new CollectionRequestRepository(this.services.get('database')));
    this.services.set('scheduleRepository', new ScheduleRepository(this.services.get('database')));
    this.services.set('paymentRepository', new PaymentRepository(this.services.get('database')));
    
    // Service layer
    this.services.set('authService', new AuthService(this.services.get('userRepository')));
    this.services.set('collectionRequestService', new CollectionRequestService(
      this.services.get('collectionRequestRepository'),
      this.services.get('userRepository')
    ));
    this.services.set('scheduleService', new ScheduleService(this.services.get('scheduleRepository')));
    this.services.set('paymentService', new PaymentService(
      this.services.get('paymentRepository'),
      this.services.get('collectionRequestRepository'),
      this.services.get('scheduleRepository')
    ));
    
    // Controller layer
    this.services.set('authController', new AuthController(this.services.get('authService')));
    this.services.set('collectionRequestController', new CollectionRequestController(this.services.get('collectionRequestService')));
    this.services.set('scheduleController', new ScheduleController(this.services.get('scheduleService')));
    this.services.set('paymentController', new PaymentController(this.services.get('paymentService')));
    
    // Middleware layer
    this.services.set('authMiddleware', new AuthMiddleware(this.services.get('authService')));
  }

  /**
   * Gets a service by name
   * @param {string} serviceName Service name
   * @returns {Object} Service instance
   */
  get(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service '${serviceName}' not found`);
    }
    return service;
  }

  /**
   * Gets database instance
   * @returns {DatabaseRepository} Database instance
   */
  getDatabase() {
    return this.get('database');
  }

  /**
   * Gets auth controller
   * @returns {AuthController} Auth controller instance
   */
  getAuthController() {
    return this.get('authController');
  }

  /**
   * Gets collection request controller
   * @returns {CollectionRequestController} Collection request controller instance
   */
  getCollectionRequestController() {
    return this.get('collectionRequestController');
  }

  /**
   * Gets auth middleware
   * @returns {AuthMiddleware} Auth middleware instance
   */
  getAuthMiddleware() {
    return this.get('authMiddleware');
  }

  /**
   * Gets schedule controller
   * @returns {ScheduleController} Schedule controller instance
   */
  getScheduleController() {
    return this.get('scheduleController');
  }

  /**
   * Gets payment controller
   * @returns {PaymentController} Payment controller instance
   */
  getPaymentController() {
    return this.get('paymentController');
  }
}
