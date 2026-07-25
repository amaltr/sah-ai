/**
 * Error Boundary — catches React render errors in each flow.
 *
 * SAFETY INVARIANT (SAFETY.md §6):
 * - If a React component crashes, the user still sees crisis
 *   hotline information — never a blank white screen.
 * - The HotlineFooter is rendered in layout.tsx (outside this boundary)
 *   so it survives even if the main content errors.
 *
 * @module components/error-boundary
 */

"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import { ErrorState } from "./error-state";

interface Props {
  children: ReactNode;
  /** Label for logging — identifies which flow errored. */
  flowName?: string;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(
      `[ErrorBoundary:${this.props.flowName ?? "unknown"}]`,
      error,
      errorInfo
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          message={`Something went wrong${
            this.props.flowName ? ` in ${this.props.flowName}` : ""
          }. Help is still available below.`}
        />
      );
    }

    return this.props.children;
  }
}
