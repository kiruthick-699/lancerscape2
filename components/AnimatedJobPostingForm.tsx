import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { 
  Plus, 
  X, 
  DollarSign, 
  Calendar, 
  MapPin, 
  Tag, 
  FileText,
  Send,
  CheckCircle
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { JobFormData } from '@/types';

const { width: screenWidth } = Dimensions.get('window');

interface AnimatedJobPostingFormProps {
  onSubmit: (data: JobFormData) => void;
  onCancel?: () => void;
  initialData?: Partial<JobFormData>;
}

export default function AnimatedJobPostingForm({ 
  onSubmit, 
  onCancel, 
  initialData 
}: AnimatedJobPostingFormProps) {
  const { colors } = useTheme();
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    description: '',
    budget: '',
    deadline: '',
    category: 0,
    isRemote: false,
    requirements: [],
    skills: [],
    ...initialData
  });

  const [currentRequirement, setCurrentRequirement] = useState('');
  const [currentSkill, setCurrentSkill] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);

  // Animation values
  const formSlide = useRef(new Animated.Value(screenWidth)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const submitButtonScale = useRef(new Animated.Value(1)).current;
  const submitButtonRotation = useRef(new Animated.Value(0)).current;
  const fieldFocusAnim = useRef(new Animated.Value(0)).current;
  const successCheckmark = useRef(new Animated.Value(0)).current;

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(formSlide, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(formOpacity, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start();
  }, [formSlide, formOpacity]);

  // Field focus animation
  const handleFieldFocus = (fieldName: string) => {
    setActiveField(fieldName);
    Animated.spring(fieldFocusAnim, {
      toValue: 1,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handleFieldBlur = () => {
    setActiveField(null);
    Animated.spring(fieldFocusAnim, {
      toValue: 0,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  // Add requirement
  const addRequirement = () => {
    if (currentRequirement.trim() && !formData.requirements.includes(currentRequirement.trim())) {
      setFormData(prev => ({
        ...prev,
        requirements: [...prev.requirements, currentRequirement.trim()]
      }));
      setCurrentRequirement('');
    }
  };

  // Remove requirement
  const removeRequirement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }));
  };

  // Add skill
  const addSkill = () => {
    if (currentSkill.trim() && !formData.skills.includes(currentSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, currentSkill.trim()]
      }));
      setCurrentSkill('');
    }
  };

  // Remove skill
  const removeSkill = (index: number) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  // Submit form with animation
  const handleSubmit = async () => {
    if (!formData.title || !formData.description || !formData.budget) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    // Submit button animation
    Animated.sequence([
      Animated.parallel([
        Animated.spring(submitButtonScale, {
          toValue: 0.95,
          useNativeDriver: true,
          tension: 200,
          friction: 5,
        }),
        Animated.timing(submitButtonRotation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(submitButtonScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 5,
      }),
    ]).start();

    try {
      await onSubmit(formData);
      
      // Success animation
      Animated.spring(successCheckmark, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();

      // Reset form after success
      setTimeout(() => {
        setFormData({
          title: '',
          description: '',
          budget: '',
          deadline: '',
          category: 0,
          isRemote: false,
          requirements: [],
          skills: [],
        });
        setIsSubmitting(false);
        successCheckmark.setValue(0);
      }, 2000);

    } catch (error) {
      Alert.alert('Error', 'Failed to submit job. Please try again.');
      setIsSubmitting(false);
    }
  };

  const submitButtonRotationInterpolate = submitButtonRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const successCheckmarkScale = successCheckmark.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const successCheckmarkOpacity = successCheckmark.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Animated.View
        style={[
          styles.formContainer,
          {
            transform: [{ translateX: formSlide }],
            opacity: formOpacity,
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Post a New Job
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Find the perfect freelancer for your project
            </Text>
          </View>

          {/* Job Title */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Job Title *
            </Text>
            <Animated.View
              style={[
                styles.inputContainer,
                {
                  borderColor: activeField === 'title' ? colors.primary : colors.border,
                  borderWidth: activeField === 'title' ? 2 : 1,
                  backgroundColor: colors.background,
                  transform: [{
                    scale: activeField === 'title' ? 1.02 : 1
                  }],
                },
              ]}
            >
              <FileText size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                placeholder="e.g., React Developer Needed"
                placeholderTextColor={colors.textTertiary}
                onFocus={() => handleFieldFocus('title')}
                onBlur={handleFieldBlur}
                accessibilityLabel="Job title input"
              />
            </Animated.View>
          </View>

          {/* Job Description */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Description *
            </Text>
            <Animated.View
              style={[
                styles.textAreaContainer,
                {
                  borderColor: activeField === 'description' ? colors.primary : colors.border,
                  borderWidth: activeField === 'description' ? 2 : 1,
                  backgroundColor: colors.background,
                  transform: [{
                    scale: activeField === 'description' ? 1.02 : 1
                  }],
                },
              ]}
            >
              <TextInput
                style={[styles.textArea, { color: colors.text }]}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder="Describe your project requirements, timeline, and expectations..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                onFocus={() => handleFieldFocus('description')}
                onBlur={handleFieldBlur}
                accessibilityLabel="Job description input"
              />
            </Animated.View>
          </View>

          {/* Budget and Deadline Row */}
          <View style={styles.row}>
            <View style={[styles.fieldContainer, styles.halfWidth]}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Budget *
              </Text>
              <Animated.View
                style={[
                  styles.inputContainer,
                  {
                    borderColor: activeField === 'budget' ? colors.primary : colors.border,
                    borderWidth: activeField === 'budget' ? 2 : 1,
                    backgroundColor: colors.background,
                    transform: [{
                      scale: activeField === 'budget' ? 1.02 : 1
                    }],
                  },
                ]}
              >
                <DollarSign size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={formData.budget}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, budget: text }))}
                  placeholder="500"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                  onFocus={() => handleFieldFocus('budget')}
                  onBlur={handleFieldBlur}
                  accessibilityLabel="Budget input"
                />
              </Animated.View>
            </View>

            <View style={[styles.fieldContainer, styles.halfWidth]}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Deadline
              </Text>
              <Animated.View
                style={[
                  styles.inputContainer,
                  {
                    borderColor: activeField === 'deadline' ? colors.primary : colors.border,
                    borderWidth: activeField === 'deadline' ? 2 : 1,
                    backgroundColor: colors.background,
                    transform: [{
                      scale: activeField === 'deadline' ? 1.02 : 1
                    }],
                  },
                ]}
              >
                <Calendar size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={formData.deadline}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, deadline: text }))}
                  placeholder="2024-12-31"
                  placeholderTextColor={colors.textTertiary}
                  onFocus={() => handleFieldFocus('deadline')}
                  onBlur={handleFieldBlur}
                  accessibilityLabel="Deadline input"
                />
              </Animated.View>
            </View>
          </View>

          {/* Category and Remote Toggle */}
          <View style={styles.row}>
            <View style={[styles.fieldContainer, styles.halfWidth]}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Category
              </Text>
              <View style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Tag size={20} color={colors.textSecondary} />
                <View style={styles.picker}>
                  {['Design', 'Development', 'Writing', 'Marketing', 'Other'].map((cat, index) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryOption,
                        {
                          backgroundColor: formData.category === index ? colors.primary : 'transparent',
                        },
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, category: index }))}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${cat} category`}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          {
                            color: formData.category === index ? 'white' : colors.text,
                          },
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={[styles.fieldContainer, styles.halfWidth]}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Location
              </Text>
              <TouchableOpacity
                style={[
                  styles.toggleContainer,
                  {
                    backgroundColor: formData.isRemote ? colors.primary : colors.background,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setFormData(prev => ({ ...prev, isRemote: !prev.isRemote }))}
                accessibilityRole="button"
                accessibilityLabel={`Toggle remote work: ${formData.isRemote ? 'enabled' : 'disabled'}`}
              >
                <MapPin size={20} color={formData.isRemote ? 'white' : colors.textSecondary} />
                <Text
                  style={[
                    styles.toggleText,
                    {
                      color: formData.isRemote ? 'white' : colors.text,
                    },
                  ]}
                >
                  {formData.isRemote ? 'Remote' : 'On-site'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Requirements */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Requirements
            </Text>
            <View style={styles.addItemContainer}>
              <Animated.View
                style={[
                  styles.inputContainer,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    flex: 1,
                  },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={currentRequirement}
                  onChangeText={setCurrentRequirement}
                  placeholder="Add a requirement..."
                  placeholderTextColor={colors.textTertiary}
                  onSubmitEditing={addRequirement}
                  accessibilityLabel="Add requirement input"
                />
              </Animated.View>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={addRequirement}
                accessibilityRole="button"
                accessibilityLabel="Add requirement"
              >
                <Plus size={20} color="white" />
              </TouchableOpacity>
            </View>
            
            {formData.requirements.length > 0 && (
              <View style={styles.tagsContainer}>
                {formData.requirements.map((req, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.tagText, { color: colors.primary }]}>{req}</Text>
                    <TouchableOpacity
                      onPress={() => removeRequirement(index)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove requirement: ${req}`}
                    >
                      <X size={14} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Skills */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Required Skills
            </Text>
            <View style={styles.addItemContainer}>
              <Animated.View
                style={[
                  styles.inputContainer,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    flex: 1,
                  },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={currentSkill}
                  onChangeText={setCurrentSkill}
                  placeholder="Add a skill..."
                  placeholderTextColor={colors.textTertiary}
                  onSubmitEditing={addSkill}
                  accessibilityLabel="Add skill input"
                />
              </Animated.View>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={addSkill}
                accessibilityRole="button"
                accessibilityLabel="Add skill"
              >
                <Plus size={20} color="white" />
              </TouchableOpacity>
            </View>
            
            {formData.skills.length > 0 && (
              <View style={styles.tagsContainer}>
                {formData.skills.map((skill, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: colors.success + '20' }]}>
                    <Text style={[styles.tagText, { color: colors.success }]}>{skill}</Text>
                    <TouchableOpacity
                      onPress={() => removeSkill(index)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove skill: ${skill}`}
                    >
                      <X size={14} color={colors.success} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Submit Button */}
          <View style={styles.submitContainer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor: isSubmitting ? colors.success : colors.primary,
                  transform: [{ scale: submitButtonScale }],
                },
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel={isSubmitting ? "Submitting job" : "Submit job posting"}
            >
              <Animated.View style={{ transform: [{ rotate: submitButtonRotationInterpolate }] }}>
                {isSubmitting ? (
                  <CheckCircle size={20} color="white" />
                ) : (
                  <Send size={20} color="white" />
                )}
              </Animated.View>
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Posting Job...' : 'Post Job'}
              </Text>
            </TouchableOpacity>

            {/* Success Checkmark */}
            <Animated.View
              style={[
                styles.successContainer,
                {
                  opacity: successCheckmarkOpacity,
                  transform: [{ scale: successCheckmarkScale }],
                },
              ]}
            >
              <CheckCircle size={24} color={colors.success} />
              <Text style={[styles.successText, { color: colors.success }]}>
                Job Posted Successfully!
              </Text>
            </Animated.View>
          </View>

          {/* Cancel Button */}
          {onCancel && (
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancel job posting"
            >
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    margin: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  textAreaContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
  },
  textArea: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    padding: 0,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  halfWidth: {
    flex: 1,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  picker: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  addItemContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  submitContainer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 24,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
    minWidth: 200,
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
