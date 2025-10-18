/**
 * New server file implementing SOLID principles
 * This replaces the monolithic Server.js with a clean, maintainable architecture
 */
import { App } from "./src/app.js";

// Start the application
if (process.env.NODE_ENV !== "test") {
  const app = new App();
  app.start();
}

// Export for testing
export { App };

