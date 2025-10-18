/**
 * Single Responsibility Principle (SRP)
 * PaymentController is responsible only for handling payment HTTP requests
 */
export class PaymentController {
  constructor(paymentService) {
    this.paymentService = paymentService;
  }

  /**
   * Handles creating a payment
   * @param {Object} req Express request object
   * @param {Object} res Express response object
   */
  createPayment = async (req, res) => {
    try {
      const { request_id, amount, currency } = req.body;
      
      if (!request_id || !amount) {
        return res.status(400).json({ error: "request_id and amount required" });
      }

      const result = await this.paymentService.createPayment({
        request_id,
        amount,
        currency
      }, req.user);
      
      return res.status(201).json(result);
    } catch (error) {
      if (error.message === "Request not found") {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === "Cannot pay for another user's request") {
        return res.status(403).json({ error: error.message });
      }
      console.error("Create payment error:", error);
      return res.status(500).json({ error: "Server error" });
    }
  };

  /**
   * Handles getting payments
   * @param {Object} req Express request object
   * @param {Object} res Express response object
   */
  getPayments = async (req, res) => {
    try {
      const payments = await this.paymentService.getPayments(req.user);
      return res.json(payments);
    } catch (error) {
      console.error("Get payments error:", error);
      return res.status(500).json({ error: "Server error" });
    }
  };
}

