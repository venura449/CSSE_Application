/**
 * Single Responsibility Principle (SRP)
 * ScheduleController is responsible only for handling schedule HTTP requests
 */
export class ScheduleController {
  constructor(scheduleService) {
    this.scheduleService = scheduleService;
  }

  /**
   * Handles creating a schedule
   * @param {Object} req Express request object
   * @param {Object} res Express response object
   */
  createSchedule = async (req, res) => {
    try {
      const { type, scheduled_at, time_label, location } = req.body;
      
      if (!type || !scheduled_at) {
        return res.status(400).json({ error: "type and scheduled_at required" });
      }

      const result = await this.scheduleService.createSchedule({
        type,
        scheduled_at,
        time_label,
        location
      }, req.user);
      
      return res.status(201).json(result);
    } catch (error) {
      if (error.message === "Collectors cannot create schedules") {
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes("Validation failed")) {
        return res.status(400).json({ error: error.message });
      }
      console.error("Create schedule error:", error);
      return res.status(500).json({ error: "Server error" });
    }
  };

  /**
   * Handles getting schedules
   * @param {Object} req Express request object
   * @param {Object} res Express response object
   */
  getSchedules = async (req, res) => {
    try {
      const schedules = await this.scheduleService.getSchedules(req.user);
      return res.json(schedules);
    } catch (error) {
      console.error("Get schedules error:", error);
      return res.status(500).json({ error: "Server error" });
    }
  };

  /**
   * Handles deleting a schedule
   * @param {Object} req Express request object
   * @param {Object} res Express response object
   */
  deleteSchedule = async (req, res) => {
    try {
      const { id } = req.params;
      const success = await this.scheduleService.deleteSchedule(id, req.user);
      
      if (!success) {
        return res.status(404).json({ error: "Not found" });
      }
      
      return res.json({ ok: true });
    } catch (error) {
      if (error.message === "Collectors cannot delete schedules") {
        return res.status(403).json({ error: error.message });
      }
      console.error("Delete schedule error:", error);
      return res.status(500).json({ error: "Server error" });
    }
  };
}

