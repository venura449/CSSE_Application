import { StrictMode, Component } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "leaflet/dist/leaflet.css";
import { Toaster } from "sonner";
import App from "./App.jsx";

// Simple Error Boundary to catch render errors and display a helpful message
class RootErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    // log to console for now
    console.error("Root render error:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
          <h2 style={{ color: "#b91c1c" }}>Application failed to render</h2>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "#fff3f2",
              padding: 12,
            }}
          >
            {String(
              this.state.error && this.state.error.stack
                ? this.state.error.stack
                : this.state.error
            )}
          </pre>
          <p>Open the devtools console for more details.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

if (import.meta && import.meta.env && import.meta.env.DEV) {
  try {

    console.log("App value at startup:", App, "typeof:", typeof App);
  } catch (e) {

  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
      <Toaster position="top-right" richColors expand={false} />
    </RootErrorBoundary>
  </StrictMode>
);
