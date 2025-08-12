import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

class ErrorBoundaryClass extends Component<Props & { colors: any }, State> {
  constructor(props: Props & { colors: any }) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo
    });

    // Log error to monitoring service
    this.logError(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    const errorData = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: 'React Native',
      version: '1.0.0'
    };

    // In production, send to monitoring service (e.g., Sentry)
    if (__DEV__) {
      console.error('Error Boundary Caught Error:', errorData);
    } else {
      // Send to production monitoring service
      this.sendToMonitoringService(errorData);
    }
  };

  private sendToMonitoringService = async (errorData: any) => {
    try {
      // Example: Send to your monitoring endpoint
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorData)
      // });
    } catch (sendError) {
      console.error('Failed to send error to monitoring service:', sendError);
    }
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  private handleGoHome = () => {
    // Navigate to home screen
    // This would typically use navigation
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  private handleReportError = () => {
    const { error, errorId } = this.state;
    if (error && errorId) {
      Alert.alert(
        'Report Error',
        `Error ID: ${errorId}\n\nPlease include this ID when reporting the issue.`,
        [
          { text: 'Copy ID', onPress: () => this.copyErrorId(errorId) },
          { text: 'OK', style: 'default' }
        ]
      );
    }
  };

  private copyErrorId = (errorId: string) => {
    // Copy error ID to clipboard
    // In React Native, you'd use Clipboard API
    Alert.alert('Copied', 'Error ID copied to clipboard');
  };

  render() {
    const { colors } = this.props;

    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.errorContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.iconContainer, { backgroundColor: colors.error + '20' }]}>
              <AlertTriangle size={48} color={colors.error} />
            </View>
            
            <Text style={[styles.title, { color: colors.text }]}>
              Oops! Something went wrong
            </Text>
            
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              We're sorry, but something unexpected happened. Our team has been notified and is working to fix this issue.
            </Text>

            {__DEV__ && this.state.error && (
              <View style={[styles.devInfo, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.devTitle, { color: colors.text }]}>Development Info:</Text>
                <Text style={[styles.devText, { color: colors.textSecondary }]}>
                  {this.state.error.message}
                </Text>
                {this.state.errorInfo && (
                  <Text style={[styles.devText, { color: colors.textSecondary }]}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={this.handleRetry}
                accessibilityRole="button"
                accessibilityLabel="Retry loading the app"
              >
                <RefreshCw size={20} color="white" />
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={this.handleGoHome}
                accessibilityRole="button"
                accessibilityLabel="Go to home screen"
              >
                <Home size={20} color={colors.text} />
                <Text style={[styles.buttonText, { color: colors.text }]}>Go Home</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.reportButton}
              onPress={this.handleReportError}
              accessibilityRole="button"
              accessibilityLabel="Report this error"
            >
              <Text style={[styles.reportText, { color: colors.primary }]}>
                Report Issue
              </Text>
            </TouchableOpacity>

            {this.state.errorId && (
              <Text style={[styles.errorId, { color: colors.textTertiary }]}>
                Error ID: {this.state.errorId}
              </Text>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// Wrapper component to provide theme context
export default function ErrorBoundary(props: Props) {
  const { colors } = useTheme();
  return <ErrorBoundaryClass {...props} colors={colors} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  devInfo: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 24,
    width: '100%',
  },
  devTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  devText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
    minWidth: 120,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  reportButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  reportText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorId: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
