import { Component } from 'react';
import type { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// ErrorBoundary (Day 19 spec) — catches render crashes per route section.
// ---------------------------------------------------------------------------

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(err: unknown): State {
    return {
      hasError: true,
      message: err instanceof Error ? err.message : 'Something went wrong.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="alert alert-danger" role="alert">
          <strong>Something went wrong.</strong>
          <div className="small mt-1">{this.state.message}</div>
          <button
            className="btn btn-sm btn-outline-danger mt-2"
            onClick={() => this.setState({ hasError: false, message: '' })}
          >
            Dismiss
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
