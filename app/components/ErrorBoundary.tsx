'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { errorHandler, ErrorType, ErrorLevel, AppError } from '@/lib/error-handler';

interface Props {
  children: ReactNode;
  fallback?: (error: AppError, reset: () => void) => ReactNode;
  context?: string;
}

interface State {
  hasError: boolean;
  error: AppError | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // エラーをAppErrorに変換
    const appError = errorHandler.handleError(
      error,
      'React Error Boundary',
      { component: 'ErrorBoundary' }
    );
    
    return {
      hasError: true,
      error: appError
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // エラーの詳細情報をログに記録
    const appError = new AppError(
      ErrorType.UNKNOWN_ERROR,
      error.message,
      ErrorLevel.ERROR,
      error,
      {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        context: this.props.context
      }
    );
    
    errorHandler.handleError(appError, this.props.context || 'Component Error');
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // カスタムフォールバックが提供されている場合
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      // デフォルトのエラー表示
      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-medium text-red-800">
                  エラーが発生しました
                </h3>
                <p className="mt-2 text-sm text-red-700">
                  {errorHandler.getUserFriendlyMessage(this.state.error)}
                </p>
                {process.env.NODE_ENV === 'development' && (
                  <details className="mt-4">
                    <summary className="text-sm text-red-600 cursor-pointer">
                      詳細情報（開発用）
                    </summary>
                    <pre className="mt-2 text-xs text-red-600 overflow-auto p-2 bg-red-100 rounded">
                      {JSON.stringify(
                        {
                          type: this.state.error.type,
                          message: this.state.error.message,
                          details: this.state.error.details
                        },
                        null,
                        2
                      )}
                    </pre>
                  </details>
                )}
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={this.resetError}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    再試行
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}