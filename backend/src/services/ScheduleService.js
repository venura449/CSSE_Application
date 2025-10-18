/**
 * Single Responsibility Principle (SRP)
 * ScheduleService is responsible only for schedule business logic
 */
import { Schedule } from "../models/Schedule.js";

export class ScheduleService {
  constructor(scheduleRepository) {
    this.scheduleRepository = scheduleRepository;
  }

  /**
   * Creates a new schedule
   * @param {Object} scheduleData Schedule data
   * @param {Object} user Current user
   * @returns {Promise<Object>} Created schedule
   */
  async createSchedule(scheduleData, user) {
    // Validate schedule data
    const validation = Schedule.validate(scheduleData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    // Check if user can create schedules
    if (user.role === "Collector") {
      throw new Error("Collectors cannot create schedules");
    }

    // Generate ID
    const id = Schedule.generateId();
    
    // Prepare schedule data
    const schedule = {
      id,
      user_id: user.id,
      type: scheduleData.type,
      scheduled_at: new Date(scheduleData.scheduled_at),
      time_label: scheduleData.time_label || null,
      status: 'Scheduled',
      location_lat: scheduleData.location?.lat || null,
      location_lng: scheduleData.location?.lng || null,
      location_label: scheduleData.location?.label || null,
    };

    // Create schedule
    const createdSchedule = await this.scheduleRepository.create(schedule);
    
    return {
      id: createdSchedule.id
    };
  }

  /**
   * Gets schedules based on user role
   * @param {Object} user Current user
   * @returns {Promise<Object[]>} Array of schedules
   */
  async getSchedules(user) {
    let schedules = [];

    if (user.role === "Collector") {
      // Collectors see assigned and in-progress schedules
      schedules = await this.scheduleRepository.findByStatus(['Assigned', 'InProgress', 'Collected']);
    } else if (user.role === "Resident") {
      // Residents see only their own schedules
      schedules = await this.scheduleRepository.findByUserId(user.id);
    } else {
      // Authority sees all schedules
      schedules = await this.scheduleRepository.findAll();
    }

    return schedules.map(schedule => schedule.toSafeObject());
  }

  /**
   * Deletes a schedule
   * @param {string} id Schedule ID
   * @param {Object} user Current user
   * @returns {Promise<boolean>} Success status
   */
  async deleteSchedule(id, user) {
    // Check if user can delete schedules
    if (user.role === "Collector") {
      throw new Error("Collectors cannot delete schedules");
    }

    return await this.scheduleRepository.delete(id, user.id);
  }
}

