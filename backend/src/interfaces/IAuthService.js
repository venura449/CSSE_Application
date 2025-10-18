
export class IAuthService {
  async signup(userData) {
    throw new Error("Method must be implemented");
  }
  
  async signin(email, password) {
    throw new Error("Method must be implemented");
  }
  
  async verifyToken(token) {
    throw new Error("Method must be implemented");
  }
  
  async hashPassword(password) {
    throw new Error("Method must be implemented");
  }
  
  async comparePassword(password, hash) {
    throw new Error("Method must be implemented");
  }
  
  generateToken(payload) {
    throw new Error("Method must be implemented");
  }
}

