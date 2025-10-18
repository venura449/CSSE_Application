/**
 * Single Responsibility Principle (SRP)
 * AuthController is responsible only for handling authentication HTTP requests
 */
export class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  /**
   * Handles user signup
   * @param {Object} req Express request object
   * @param {Object} res Express response object
   */
  signup = async (req, res) => {
    try {
      const { email, password, name } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const result = await this.authService.signup({ email, password, name });
      return res.status(201).json(result);
    } catch (error) {
      if (error.message === "Email already registered") {
        return res.status(409).json({ error: error.message });
      }
      if (error.message.includes("Validation failed")) {
        return res.status(400).json({ error: error.message });
      }
      console.error("Signup error:", error);
      return res.status(500).json({ error: "Server error" });
    }
  };

  /**
   * Handles user signin
   * @param {Object} req Express request object
   * @param {Object} res Express response object
   */
  signin = async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const result = await this.authService.signin(email, password);
      return res.json(result);
    } catch (error) {
      if (error.message === "Invalid credentials") {
        return res.status(401).json({ error: error.message });
      }
      console.error("Signin error:", error);
      return res.status(500).json({ error: "Server error" });
    }
  };

  /**
   * Handles protected route verification
   * @param {Object} req Express request object
   * @param {Object} res Express response object
   */
  protected = async (req, res) => {
    try {
      return res.json({ ok: true, user: req.user });
    } catch (error) {
      console.error("Protected route error:", error);
      return res.status(500).json({ error: "Server error" });
    }
  };
}

