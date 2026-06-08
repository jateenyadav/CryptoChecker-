import { Component } from "react";

/** Catches render errors anywhere below it so a single failure can't blank the app. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // In a real app this would go to Sentry/LogRocket.
    console.error("Render error:", error, info);
  }

  handleReset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error.message}</p>
          <button className="btn" onClick={this.handleReset}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
