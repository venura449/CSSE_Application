/**
 * Single Responsibility Principle (SRP)
 * CollectionRequestController is responsible only for handling collection request HTTP requests
 */
export class CollectionRequestController {
  constructor(collectionRequestService) {
    this.collectionRequestService = collectionRequestService;
  }

  /**
   * Handles creating a collection request
   * @param {Object} req Express request object
   * @param {Object} res Express response object
   */
  createRequest = async (req, res) => {
    try {
      const result = await this.collectionRequestService.createRequest(req.body, req.user);
      return res.status(201).json(result);
    } catch (error) {
      if (error.message === "Collectors cannot create collection requests") {
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes("Validation failed")) {
        return res.status(400).json({ error: error.message });
      }
      console.error("Create request error:", error);
      return res.status(500).json({ error: "Server error" });
    }
  };

  /**
   * Handles getting collection requests
   * @param {Object} req Express request object
   * @param {Object} res Express response object
   */
  getRequests = async (req, res) => {
    try {
      const requests = await this.collectionRequestService.getRequests(req.user);
      return res.json(requests);
    } catch (error) {
      console.error("Get requests error:", error);
      return res.status(500).json({ error: "Server error" });
    }
  };

  /**
   * Handles updating a collection request
   * @param {Object} req Express request object
   * @param {Object} res Express response object
   */
  updateRequest = async (req, res) => {
    try {
      const { id } = req.params;
      const success = await this.collectionRequestService.updateRequest(id, req.body, req.user);
      
      if (!success) {
        return res.status(404).json({ error: "Request not found" });
      }
      
      return res.json({ ok: true });
    } catch (error) {
      if (error.message === "Request not found") {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === "Forbidden") {
        return res.status(403).json({ error: error.message });
      }
      if (error.message === "Cannot edit a paid request") {
        return res.status(400).json({ error: error.message });
      }
      console.error("Update request error:", error);
      return res.status(500).json({ error: "Server error" });
    }
  };

  /**
   * Handles deleting a collection request
   * @param {Object} req Express request object
   * @param {Object} res Express response object
   */
  deleteRequest = async (req, res) => {
    try {
      const { id } = req.params;
      const success = await this.collectionRequestService.deleteRequest(id, req.user);
      
      if (!success) {
        return res.status(404).json({ error: "Request not found" });
      }
      
      return res.json({ ok: true });
    } catch (error) {
      if (error.message === "Request not found") {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === "Forbidden") {
        return res.status(403).json({ error: error.message });
      }
      if (error.message === "Cannot delete a paid request") {
        return res.status(400).json({ error: error.message });
      }
      console.error("Delete request error:", error);
      return res.status(500).json({ error: "Server error" });
    }
  };

  /**
   * Handles assigning a collector to a collection request
   * @param {Object} req Express request object
   * @param {Object} res Express response object
   */
  assignCollector = async (req, res) => {
    try {
      const { id } = req.params;
      const { collector_id } = req.body;
      
      if (!collector_id) {
        return res.status(400).json({ error: "collector_id required" });
      }

      const success = await this.collectionRequestService.assignCollector(id, collector_id, req.user);
      
      if (!success) {
        return res.status(404).json({ error: "Request not found" });
      }
      
      return res.json({ ok: true });
    } catch (error) {
      if (error.message === "Request not found" || error.message === "Collector not found") {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === "Forbidden") {
        return res.status(403).json({ error: error.message });
      }
      console.error("Assign collector error:", error);
      return res.status(500).json({ error: "Server error" });
    }
  };

  /**
   * Handles getting collectors list
   * @param {Object} req Express request object
   * @param {Object} res Express response object
   */
  getCollectors = async (req, res) => {
    try {
      const collectors = await this.collectionRequestService.getCollectors();
      return res.json(collectors);
    } catch (error) {
      console.error("Get collectors error:", error);
      return res.status(500).json({ error: "Server error" });
    }
  };
}

