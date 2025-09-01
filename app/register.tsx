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
  ScrollView,
} from 'react-native';
import { Eye, EyeOff, Mail, Lock, User, Briefcase, AlertCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

interface RegisterFormData {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
  userType: 'client' | 'freelancer';
}

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { register, isLoading } = useAuth();
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    userType: 'freelancer',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!formData.email || !formData.email.includes('@')) {
      errors.push('Please enter a valid email address');
    }

    if (!formData.username || formData.username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }

    if (!formData.firstName || formData.firstName.trim().length === 0) {
      errors.push('First name is required');
    }

    if (!formData.lastName || formData.lastName.trim().length === 0) {
      errors.push('Last name is required');
    }

    if (!formData.password || formData.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (formData.password !== formData.confirmPassword) {
      errors.push('Passwords do not match');
    }

    return errors;
  };

  const handleRegister = async () => {
    const errors = validateForm();
    
    if (errors.length > 0) {
      Alert.alert('Validation Error', errors.join('\n'));
      return;
    }

    try {
      setIsSubmitting(true);
      await register({
        email: formData.email.trim(),
        username: formData.username.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        password: formData.password,
        userType: formData.userType,
      });
      
      // Show success message
      Alert.alert(
        'Registration Successful!',
        'Your account has been created. Please check your email for verification.',
        [{ text: 'OK', onPress: () => router.push('/login') }]
      );
    } catch (error) {
      Alert.alert(
        'Registration Failed',
        'An error occurred during registration. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = () => {
    router.push('/login');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoidingView}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: '#1E3A8A' }]}>
              Create Account
            </Text>
            <Text style={[styles.subtitle, { color: '#1F2937' }]}>
              Join Lancerscape2 and start your freelancing journey
            </Text>
          </View>

          {/* Registration Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Mail size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { 
                  color: colors.text, 
                  borderColor: colors.border,
                  backgroundColor: colors.surface 
                }]}
                placeholder="Email Address"
                placeholderTextColor={colors.textSecondary}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />
            </View>

            {/* Username Input */}
            <View style={styles.inputContainer}>
              <User size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { 
                  color: colors.text, 
                  borderColor: colors.border,
                  backgroundColor: colors.surface 
                }]}
                placeholder="Username"
                placeholderTextColor={colors.textSecondary}
                value={formData.username}
                onChangeText={(text) => setFormData({ ...formData, username: text })}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
              />
            </View>

            {/* First Name Input */}
            <View style={styles.inputContainer}>
              <User size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { 
                  color: colors.text, 
                  borderColor: colors.border,
                  backgroundColor: colors.surface 
                }]}
                placeholder="First Name"
                placeholderTextColor={colors.textSecondary}
                value={formData.firstName}
                onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                autoCapitalize="words"
                autoCorrect={false}
                autoComplete="given-name"
              />
            </View>

            {/* Last Name Input */}
            <View style={styles.inputContainer}>
              <User size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { 
                  color: colors.text, 
                  borderColor: colors.border,
                  backgroundColor: colors.surface 
                }]}
                placeholder="Last Name"
                placeholderTextColor={colors.textSecondary}
                value={formData.lastName}
                onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                autoCapitalize="words"
                autoCorrect={false}
                autoComplete="family-name"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Lock size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { 
                  color: colors.text, 
                  borderColor: colors.border,
                  backgroundColor: colors.surface 
                }]}
                placeholder="Password"
                placeholderTextColor={colors.textSecondary}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
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
                style={[styles.input, { 
                  color: colors.text, 
                  borderColor: colors.border,
                  backgroundColor: colors.surface 
                }]}
                placeholder="Confirm Password"
                placeholderTextColor={colors.textSecondary}
                value={formData.confirmPassword}
                onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
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
              <Text style={[styles.userTypeLabel, { color: colors.textSecondary }]}>
                I want to:
              </Text>
              <View style={styles.userTypeButtons}>
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
                  <Briefcase size={20} color={formData.userType === 'freelancer' ? '#fff' : colors.text} />
                  <Text style={[
                    styles.userTypeButtonText,
                    { color: formData.userType === 'freelancer' ? '#fff' : colors.text }
                  ]}>
                    Work as Freelancer
                  </Text>
                </TouchableOpacity>
                
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
                  <User size={20} color={formData.userType === 'client' ? '#fff' : colors.text} />
                  <Text style={[
                    styles.userTypeButtonText,
                    { color: formData.userType === 'client' ? '#fff' : colors.text }
                  ]}>
                    Hire Freelancers
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[
                styles.registerButton,
                { backgroundColor: colors.primary },
                (isSubmitting || isLoading) && { opacity: 0.7 }
              ]}
              onPress={handleRegister}
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting || isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textSecondary }]}>
                or
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                { borderColor: colors.border, backgroundColor: colors.surface }
              ]}
              onPress={handleLogin}
            >
              <Text style={[styles.loginButtonText, { color: colors.text }]}>
                Already have an account? Sign In
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              By creating an account, you agree to our{' '}
              <Text style={{ color: colors.primary }}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={{ color: colors.primary }}>Privacy Policy</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    top: 16,
    zIndex: 1,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 48,
    fontSize: 16,
    paddingVertical: 16,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 1,
  },
  userTypeContainer: {
    marginBottom: 32,
  },
  userTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  userTypeButtons: {
    gap: 12,
  },
  userTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  userTypeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  registerButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  loginButton: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
}); 