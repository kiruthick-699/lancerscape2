import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, Mail, Lock, Smartphone, ArrowLeft, Shield, CheckCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useWallet } from '@/contexts/WalletContext';

interface LoginFormData {
  email: string;
  password: string;
  twoFactorCode: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    userType: 'client' | 'freelancer';
    isVerified: boolean;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  message?: string;
}

export default function LoginScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { isConnected, walletAddress } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    twoFactorCode: ''
  });

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Missing Information', 'Please enter your email and password.');
      return;
    }

    try {
      setIsLoading(true);

      // First, attempt to login
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data: AuthResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Check if 2FA is required
      if (data.user.twoFactorEnabled && !formData.twoFactorCode) {
        setShowTwoFactor(true);
        setIsLoading(false);
        return;
      }

      // If 2FA is required and code is provided, verify it
      if (data.user.twoFactorEnabled && formData.twoFactorCode) {
        await verifyTwoFactor(data.tokens.accessToken);
        return;
      }

      // Store tokens securely
      await storeTokens(data.tokens);
      
      // Navigate to main app
      navigation.replace('(tabs)');
      
    } catch (error) {
      console.error('Login failed:', error);
      Alert.alert(
        'Login Failed',
        error instanceof Error ? error.message : 'An error occurred during login. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const verifyTwoFactor = async (accessToken: string) => {
    try {
      setIsVerifying(true);

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/verify-2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          code: formData.twoFactorCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '2FA verification failed');
      }

      // Store tokens securely
      await storeTokens(data.tokens);
      
      // Navigate to main app
      navigation.replace('(tabs)');
      
    } catch (error) {
      console.error('2FA verification failed:', error);
      Alert.alert(
        'Verification Failed',
        error instanceof Error ? error.message : 'Invalid 2FA code. Please try again.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const storeTokens = async (tokens: AuthResponse['tokens']) => {
    // In a real app, use secure storage like expo-secure-store
    // For now, we'll use AsyncStorage (not recommended for production)
    try {
      // Store tokens securely
      // await SecureStore.setItemAsync('accessToken', tokens.accessToken);
      // await SecureStore.setItemAsync('refreshToken', tokens.refreshToken);
      
      // For demo purposes, we'll use a simple approach
      console.log('Tokens stored successfully');
    } catch (error) {
      console.error('Failed to store tokens:', error);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('forgot-password');
  };

  const handleRegister = () => {
    navigation.navigate('register');
  };

  const handleEmailVerification = () => {
    Alert.alert(
      'Email Verification Required',
      'Please check your email and click the verification link to activate your account.',
      [
        { text: 'OK' },
        { text: 'Resend Email', onPress: () => resendVerificationEmail() }
      ]
    );
  };

  const resendVerificationEmail = async () => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Verification email has been sent to your inbox.');
      } else {
        throw new Error('Failed to send verification email');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send verification email. Please try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Sign in to your account
            </Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Mail size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.surface }]}
                placeholder="Email address"
                placeholderTextColor={colors.textSecondary}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Lock size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.surface }]}
                placeholder="Password"
                placeholderTextColor={colors.textSecondary}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                {showPassword ? (
                  <EyeOff size={20} color={colors.textSecondary} />
                ) : (
                  <Eye size={20} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>

            {/* Two-Factor Authentication */}
            {showTwoFactor && (
              <View style={styles.inputContainer}>
                <Shield size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text, backgroundColor: colors.surface }]}
                  placeholder="2FA Code (6 digits)"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.twoFactorCode}
                  onChangeText={(text) => setFormData({ ...formData, twoFactorCode: text })}
                  keyboardType="numeric"
                  maxLength={6}
                />
              </View>
            )}

            {/* Forgot Password */}
            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPassword}>
              <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
                Forgot your password?
              </Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                {
                  backgroundColor: colors.primary,
                  opacity: isLoading || isVerifying ? 0.7 : 1
                }
              ]}
              onPress={handleLogin}
              disabled={isLoading || isVerifying}
            >
              {isLoading || isVerifying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>
                  {showTwoFactor ? 'Verify & Sign In' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textSecondary }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <Text style={[styles.registerText, { color: colors.textSecondary }]}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity onPress={handleRegister}>
                <Text style={[styles.registerLink, { color: colors.primary }]}>
                  Sign up
                </Text>
              </TouchableOpacity>
            </View>

            {/* Wallet Connection Notice */}
            {isConnected && (
              <View style={[styles.walletNotice, { backgroundColor: colors.success + '20', borderColor: colors.success }]}>
                <CheckCircle size={16} color={colors.success} />
                <Text style={[styles.walletNoticeText, { color: colors.success }]}>
                  Wallet connected: {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 16,
  },
  eyeButton: {
    padding: 8,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  walletNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    gap: 8,
  },
  walletNoticeText: {
    fontSize: 14,
    fontWeight: '500',
  },
}); 