import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          height: "100vh", background: "var(--bg-main, #0C0A09)", color: "var(--text-primary, #E7E5E4)",
          fontFamily: "system-ui, -apple-system, sans-serif", padding: 24, textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>:(</div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ fontSize: 14, color: "var(--text-muted, #A8A29E)", marginBottom: 24, maxWidth: 400 }}>
            An unexpected error occurred. Your data is safe.
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.replace("/"); }}
            style={{
              padding: "10px 24px", borderRadius: 8, border: "1px solid var(--border, #292524)",
              background: "var(--bg-card, #1C1917)", color: "var(--text-primary, #E7E5E4)",
              fontSize: 14, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Reload app
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
