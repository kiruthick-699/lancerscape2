import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { X, Send } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useWallet } from '@/contexts/WalletContext';
import web3Service from '@/services/web3Service';
import { JobFormData } from '@/types';

interface JobPostingFormProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (jobId: number) => void;
}

const categories = [
  { id: 0, name: 'Design', icon: '🎨' },
  { id: 1, name: 'Development', icon: '💻' },
  { id: 2, name: 'Writing', icon: '✍️' },
  { id: 3, name: 'Marketing', icon: '📢' },
  { id: 4, name: 'Other', icon: '🔧' },
];

export default function JobPostingForm({ visible, onClose, onSuccess }: JobPostingFormProps) {
  const { colors } = useTheme();
  const { isConnected, walletAddress } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    description: '',
    budget: '',
    deadline: '',
    category: 0,
    isRemote: false,
  });

  const handleSubmit = async () => {
    if (!isConnected) {
      Alert.alert('Wallet Required', 'Please connect your wallet to post a job.');
      return;
    }

    if (!formData.title || !formData.description || !formData.budget || !formData.deadline) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    // Validate budget
    const budget = parseFloat(formData.budget);
    if (isNaN(budget) || budget <= 0) {
      Alert.alert('Invalid Budget', 'Budget must be a positive number.');
      return;
    }

    // Validate deadline
    const deadline = new Date(formData.deadline);
    const now = new Date();
    if (isNaN(deadline.getTime()) || deadline <= now) {
      Alert.alert('Invalid Deadline', 'Deadline must be a valid future date.');
      return;
    }

    try {
      setIsSubmitting(true);

      const jobId = await web3Service.postJob(
        formData.title,
        formData.description,
        formData.budget,
        deadline.getTime(),
        formData.category,
        formData.isRemote
      );

      // Show success message
      Alert.alert(
        'Success!',
        `Job posted successfully with ID: ${jobId}`,
        [
          {
            text: 'OK',
            onPress: () => {
              onSuccess(jobId);
              handleClose();
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert(
        'Job Posting Failed',
        error instanceof Error ? error.message : 'Failed to post job. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      // Reset form
      setFormData({
        title: '',
        description: '',
        budget: '',
        deadline: '',
        category: 0,
        isRemote: false,
      });
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Post a Job</Text>
          <TouchableOpacity onPress={handleClose} disabled={isSubmitting}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Job Title *</Text>
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder="Enter job title"
                placeholderTextColor={colors.textSecondary}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Description *</Text>
              <TextInput
                style={[styles.textArea, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder="Describe the job requirements, deliverables, and expectations..."
                placeholderTextColor={colors.textSecondary}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Budget ($) *</Text>
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder="Enter budget amount"
                placeholderTextColor={colors.textSecondary}
                value={formData.budget}
                onChangeText={(text) => setFormData({ ...formData, budget: text })}
                keyboardType="numeric"
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Deadline *</Text>
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
                value={formData.deadline}
                onChangeText={(text) => setFormData({ ...formData, deadline: text })}
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Category</Text>
              <View style={styles.categoryContainer}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryButton,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      formData.category === category.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    onPress={() => setFormData({ ...formData, category: category.id })}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                    <Text style={[
                      styles.categoryText,
                      { color: formData.category === category.id ? '#fff' : colors.text }
                    ]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <TouchableOpacity
                style={styles.remoteToggle}
                onPress={() => setFormData({ ...formData, isRemote: !formData.isRemote })}
                disabled={isSubmitting}
              >
                <View style={[
                  styles.toggle,
                  { backgroundColor: formData.isRemote ? colors.primary : colors.border }
                ]}>
                  <View style={[
                    styles.toggleThumb,
                    { backgroundColor: '#fff', transform: [{ translateX: formData.isRemote ? 20 : 0 }] }
                  ]} />
                </View>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>Remote Work</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={handleClose}
            disabled={isSubmitting}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Send size={16} color="#fff" />
                <Text style={styles.submitButtonText}>Post Job</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  textArea: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 120,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  remoteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
}); 