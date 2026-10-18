import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
  /** Clears a caught error when it changes, e.g. the current path after navigating away. */
  resetKey?: string;
}

interface State {
  error: Error | null;
}

/**
 * Catches render errors below it and shows a friendly fallback instead of a blank page.
 * The nav stays usable because the boundary only wraps the page content.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled error while rendering the page', error, info.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="empty" role="alert">
        <h1>Something went wrong</h1>
        <p className="muted">
          This page hit an unexpected problem. Try again, or head back to the catalog.
        </p>
        <div className="actions center">
          <button type="button" className="btn" onClick={this.reset}>
            Try again
          </button>
          <Link to="/" className="btn btn-ghost">
            Browse bookings
          </Link>
        </div>
      </section>
    );
  }
}
