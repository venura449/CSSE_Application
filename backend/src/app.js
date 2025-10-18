/**
 * Main application file implementing SOLID principles
 * This file orchestrates all components following dependency injection
 */
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Container } from "./config/Container.js";

dotenv.config();

export class App {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.container = new Container();
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Sets up middleware
   */
  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
  }

  /**
   * Sets up all routes following Single Responsibility Principle
   */
  setupRoutes() {
    const authController = this.container.getAuthController();
    const collectionRequestController = this.container.getCollectionRequestController();
    const scheduleController = this.container.getScheduleController();
    const paymentController = this.container.getPaymentController();
    const authMiddleware = this.container.getAuthMiddleware();

    // Health check
    this.app.get("/", (req, res) => res.send("Auth server is running"));

    // Authentication routes
    this.app.post("/api/auth/signup", authController.signup);
    this.app.post("/api/auth/signin", authController.signin);
    this.app.get("/api/protected", authMiddleware.authenticate, authController.protected);

    // Collection request routes
    this.app.post("/api/collections/request", 
      authMiddleware.authenticate, 
      collectionRequestController.createRequest
    );
    
    this.app.get("/api/collections/requests", 
      authMiddleware.authenticate, 
      collectionRequestController.getRequests
    );
    
    this.app.put("/api/collections/request/:id", 
      authMiddleware.authenticate, 
      collectionRequestController.updateRequest
    );
    
    this.app.delete("/api/collections/request/:id", 
      authMiddleware.authenticate, 
      collectionRequestController.deleteRequest
    );
    
    this.app.post("/api/collections/request/:id/assign", 
      authMiddleware.authenticate, 
      authMiddleware.requireRole(["Authority", "Admin"]), 
      collectionRequestController.assignCollector
    );
    
    this.app.get("/api/collectors", 
      authMiddleware.authenticate, 
      authMiddleware.requireAnyRole(["Authority", "Admin", "Collector"]), 
      collectionRequestController.getCollectors
    );

    // Schedule routes
    this.app.post("/api/schedules", 
      authMiddleware.authenticate, 
      scheduleController.createSchedule
    );
    
    this.app.get("/api/schedules", 
      authMiddleware.authenticate, 
      scheduleController.getSchedules
    );
    
    this.app.delete("/api/schedules/:id", 
      authMiddleware.authenticate, 
      scheduleController.deleteSchedule
    );

    // Payment routes
    this.app.post("/api/payments", 
      authMiddleware.authenticate, 
      paymentController.createPayment
    );
    
    this.app.get("/api/payments", 
      authMiddleware.authenticate, 
      paymentController.getPayments
    );

    // Collections route (for backward compatibility)
    this.app.get("/api/collections", 
      authMiddleware.authenticate, 
      scheduleController.getSchedules
    );
  }

  /**
   * Initializes the application
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      const database = this.container.getDatabase();
      await database.initialize();
      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw error;
    }
  }

  /**
   * Starts the server
   * @returns {Promise<void>}
   */
  async start() {
    try {
      await this.initialize();
      
      this.app.listen(this.port, () => {
        console.log(`Auth server running on port ${this.port}`);
      });
    } catch (error) {
      console.error("Failed to start server:", error);
      process.exit(1);
    }
  }

  /**
   * Gets the Express app instance (for testing)
   * @returns {Object} Express app
   */
  getApp() {
    return this.app;
  }

  /**
   * Gets the container instance (for testing)
   * @returns {Container} Container instance
   */
  getContainer() {
    return this.container;
  }
}
