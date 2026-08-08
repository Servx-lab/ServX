import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class SplineErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SplineErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="w-full h-full flex items-center justify-center bg-gray-900/50 text-gray-500 text-xs rounded-2xl border border-gray-800/50 p-4 text-center">
          <div>
            <span className="block font-bold text-gray-400 mb-1">3D Scene Unavailable</span>
            <span className="text-[10px]">Cannot load the 3D interactive model due to a WebGL/Spline runtime incompatibility on this device.</span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
