import React, { useState } from 'react';
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
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowLeft, Shield, CheckCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useWallet } from '@/contexts/WalletContext';

interface RegisterFormData {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
  phone: string;
  userType: 'client' | 'freelancer';
  agreeToTerms: boolean;
  agreeToPrivacy: boolean;
  marketingConsent: boolean;
}

export default function RegisterScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { isConnected, walletAddress } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    phone: '',
    userType: 'client',
    agreeToTerms: false,
    agreeToPrivacy: false,
    marketingConsent: false
  });

  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      errors.push('Please enter a valid email address');
    }

    // Username validation
    if (!formData.username || formData.username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }

    // Name validation
    if (!formData.firstName || formData.firstName.length < 2) {
      errors.push('First name must be at least 2 characters long');
    }

    if (!formData.lastName || formData.lastName.length < 2) {
      errors.push('Last name must be at least 2 characters long');
    }

    // Password validation
    if (!formData.password || formData.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(formData.password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(formData.password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(formData.password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(formData.password)) {
      errors.push('Password must contain at least one special character');
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      errors.push('Passwords do not match');
    }

    // Phone validation (optional)
    if (formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      errors.push('Please enter a valid phone number');
    }

    // Terms and privacy agreement
    if (!formData.agreeToTerms) {
      errors.push('You must agree to the Terms of Service');
    }

    if (!formData.agreeToPrivacy) {
      errors.push('You must agree to the Privacy Policy');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const handleRegister = async () => {
    const validation = validateForm();
    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          firstName: formData.firstName,
          lastName: formData.lastName,
          password: formData.password,
          phone: formData.phone || undefined,
          userType: formData.userType,
          walletAddress: walletAddress || undefined,
          metadata: {
            registrationSource: 'mobile',
            marketingConsent: formData.marketingConsent,
            termsAccepted: formData.agreeToTerms,
            privacyAccepted: formData.agreeToPrivacy
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      Alert.alert(
        'Registration Successful!',
        'Please check your email to verify your account before logging in.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('login')
          }
        ]
      );

    } catch (error) {
      console.error('Registration failed:', error);
      Alert.alert(
        'Registration Failed',
        error instanceof Error ? error.message : 'An error occurred during registration. Please try again.'
      );
    } finally {
      setIsLoading(false);
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
            <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Join Lancerscape2 today
            </Text>
          </View>

          {/* Registration Form */}
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

            {/* Username Input */}
            <View style={styles.inputContainer}>
              <User size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.surface }]}
                placeholder="Username"
                placeholderTextColor={colors.textSecondary}
                value={formData.username}
                onChangeText={(text) => setFormData({ ...formData, username: text })}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* First Name Input */}
            <View style={styles.inputContainer}>
              <User size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.surface }]}
                placeholder="First name"
                placeholderTextColor={colors.textSecondary}
                value={formData.firstName}
                onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            {/* Last Name Input */}
            <View style={styles.inputContainer}>
              <User size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.surface }]}
                placeholder="Last name"
                placeholderTextColor={colors.textSecondary}
                value={formData.lastName}
                onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            {/* Phone Input (Optional) */}
            <View style={styles.inputContainer}>
              <Phone size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.surface }]}
                placeholder="Phone number (optional)"
                placeholderTextColor={colors.textSecondary}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                keyboardType="phone-pad"
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

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Lock size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.surface }]}
                placeholder="Confirm password"
                placeholderTextColor={colors.textSecondary}
                value={formData.confirmPassword}
                onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} color={colors.textSecondary} />
                ) : (
                  <Eye size={20} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>

            {/* User Type Selection */}
            <View style={styles.userTypeContainer}>
              <Text style={[styles.userTypeLabel, { color: colors.text }]}>I want to:</Text>
              <View style={styles.userTypeButtons}>
                <TouchableOpacity
                  style={[
                    styles.userTypeButton,
                    {
                      backgroundColor: formData.userType === 'client' ? colors.primary : colors.surface,
                      borderColor: colors.border
                    }
                  ]}
                  onPress={() => setFormData({ ...formData, userType: 'client' })}
                >
                  <Text style={[
                    styles.userTypeButtonText,
                    { color: formData.userType === 'client' ? '#fff' : colors.text }
                  ]}>
                    Hire Freelancers
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.userTypeButton,
                    {
                      backgroundColor: formData.userType === 'freelancer' ? colors.primary : colors.surface,
                      borderColor: colors.border
                    }
                  ]}
                  onPress={() => setFormData({ ...formData, userType: 'freelancer' })}
                >
                  <Text style={[
                    styles.userTypeButtonText,
                    { color: formData.userType === 'freelancer' ? '#fff' : colors.text }
                  ]}>
                    Work as Freelancer
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Terms and Privacy */}
            <View style={styles.termsContainer}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setFormData({ ...formData, agreeToTerms: !formData.agreeToTerms })}
              >
                <View style={[
                  styles.checkbox,
                  {
                    backgroundColor: formData.agreeToTerms ? colors.primary : 'transparent',
                    borderColor: colors.border
                  }
                ]}>
                  {formData.agreeToTerms && <CheckCircle size={16} color="#fff" />}
                </View>
                <Text style={[styles.checkboxText, { color: colors.text }]}>
                  I agree to the{' '}
                  <Text style={[styles.link, { color: colors.primary }]}>Terms of Service</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setFormData({ ...formData, agreeToPrivacy: !formData.agreeToPrivacy })}
              >
                <View style={[
                  styles.checkbox,
                  {
                    backgroundColor: formData.agreeToPrivacy ? colors.primary : 'transparent',
                    borderColor: colors.border
                  }
                ]}>
                  {formData.agreeToPrivacy && <CheckCircle size={16} color="#fff" />}
                </View>
                <Text style={[styles.checkboxText, { color: colors.text }]}>
                  I agree to the{' '}
                  <Text style={[styles.link, { color: colors.primary }]}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setFormData({ ...formData, marketingConsent: !formData.marketingConsent })}
              >
                <View style={[
                  styles.checkbox,
                  {
                    backgroundColor: formData.marketingConsent ? colors.primary : 'transparent',
                    borderColor: colors.border
                  }
                ]}>
                  {formData.marketingConsent && <CheckCircle size={16} color="#fff" />}
                </View>
                <Text style={[styles.checkboxText, { color: colors.text }]}>
                  I want to receive marketing emails (optional)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[
                styles.registerButton,
                {
                  backgroundColor: colors.primary,
                  opacity: isLoading ? 0.7 : 1
                }
              ]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={[styles.loginText, { color: colors.textSecondary }]}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('login')}>
                <Text style={[styles.loginLink, { color: colors.primary }]}>
                  Sign in
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
  userTypeContainer: {
    marginBottom: 24,
  },
  userTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  userTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  userTypeButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  userTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  termsContainer: {
    marginBottom: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxText: {
    fontSize: 14,
    flex: 1,
  },
  link: {
    fontWeight: '600',
  },
  registerButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
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