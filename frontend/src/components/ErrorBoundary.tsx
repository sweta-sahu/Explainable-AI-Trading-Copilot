import React, { Component } from 'react';

type ReactNode = React.ReactNode;
type ErrorInfo = React.ErrorInfo;

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-gray-900/50 p-6 shadow-2xl shadow-black/40 backdrop-blur-lg">
                    <div className="text-center space-y-4">
                        <div className="rounded-full bg-red-500/10 p-3 mx-auto w-fit">
                            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2">Something went wrong</h3>
                            <p className="text-sm text-white/70 mb-4">
                                An unexpected error occurred. Please refresh the page to try again.
                            </p>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
                        >
                            Refresh Page
                        </button>
                    </div>
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <details className="mt-6 w-full max-w-2xl">
                            <summary className="cursor-pointer text-sm text-white/60 hover:text-white/80">
                                Error Details (Development)
                            </summary>
                            <pre className="mt-2 overflow-auto rounded bg-red-900/20 p-3 text-xs text-red-300">
                                {this.state.error.toString()}
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}