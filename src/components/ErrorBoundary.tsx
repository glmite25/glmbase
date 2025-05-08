import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Application Error</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="mb-2">Something went wrong with the application.</p>
                <p className="text-sm mb-4 whitespace-pre-wrap">
                  {this.state.error?.message || "Unknown error"}
                </p>
                <div className="flex gap-2">
                  <Button onClick={this.handleReload} variant="outline">
                    Reload Application
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
            <div className="text-sm text-gray-500 mt-4">
              <p>If the problem persists, please try the following:</p>
              <ul className="list-disc pl-5 mt-2">
                <li>Clear your browser cache and cookies</li>
                <li>Check your internet connection</li>
                <li>Make sure your Supabase credentials are correct</li>
                <li>Contact support if the issue continues</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
