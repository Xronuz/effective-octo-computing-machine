import React, { Component, type ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Fonts, FontSizes, FontWeights, Spacing, Radius, Shadows } from '../theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Keyinchalik Sentry ga yuborish mumkin
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <View style={styles.container}>
          <View style={styles.iconBox}>
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color={Colors.danger} />
          </View>
          <Text style={styles.title}>Kutilmagan xatolik yuz berdi</Text>
          <Text style={styles.subtitle}>
            Ilovani qayta ishga tushiring yoki keyinroq urinib ko‘ring.
          </Text>
          {this.state.error && <Text style={styles.errorText}>{this.state.error.message}</Text>}
          <TouchableOpacity style={styles.button} onPress={this.handleReset} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Qayta urinish</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.dangerSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  errorText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.mono ?? Fonts.body,
    color: Colors.danger,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.dangerSurface,
    borderRadius: Radius.md,
    width: '100%',
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    ...Shadows.sm,
  },
  buttonText: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    fontFamily: Fonts.heading,
    color: Colors.textInverse,
  },
});
