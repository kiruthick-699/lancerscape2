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
import { ProposalFormData } from '@/types';

interface ProposalFormProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (proposalId: number) => void;
  jobId: number;
  jobTitle: string;
  jobBudget: string;
}

export default function ProposalForm({ 
  visible, 
  onClose, 
  onSuccess, 
  jobId, 
  jobTitle, 
  jobBudget 
}: ProposalFormProps) {
  const { colors } = useTheme();
  const { isConnected, walletAddress } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ProposalFormData>({
    proposedAmount: '',
    coverLetter: '',
    deliveryTime: '',
  });

  const handleSubmit = async () => {
    if (!isConnected) {
      Alert.alert('Wallet Required', 'Please connect your wallet to submit a proposal.');
      return;
    }

    if (!formData.proposedAmount || !formData.coverLetter || !formData.deliveryTime) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    // Validate proposed amount
    const proposedAmount = parseFloat(formData.proposedAmount);
    const jobBudgetAmount = parseFloat(jobBudget);
    
    if (proposedAmount > jobBudgetAmount) {
      Alert.alert('Invalid Amount', 'Your proposed amount cannot exceed the job budget.');
      return;
    }

    if (proposedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Proposed amount must be greater than 0.');
      return;
    }

    // Validate delivery time
    const deliveryTimeDays = parseInt(formData.deliveryTime);
    if (deliveryTimeDays <= 0 || deliveryTimeDays > 365) {
      Alert.alert('Invalid Delivery Time', 'Delivery time must be between 1 and 365 days.');
      return;
    }

    try {
      setIsSubmitting(true);

      const proposalId = await web3Service.submitProposal(
        jobId,
        formData.proposedAmount,
        formData.coverLetter,
        deliveryTimeDays * 24 * 60 * 60 * 1000 // Convert days to milliseconds
      );

      onSuccess(proposalId);
      
      // Reset form
      setFormData({
        proposedAmount: '',
        coverLetter: '',
        deliveryTime: '',
      });
    } catch (error) {
      Alert.alert(
        'Submission Failed',
        error instanceof Error ? error.message : 'Failed to submit proposal. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        proposedAmount: '',
        coverLetter: '',
        deliveryTime: '',
      });
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Submit Proposal</Text>
          <TouchableOpacity onPress={handleClose} disabled={isSubmitting}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.jobInfo}>
            <Text style={[styles.jobTitle, { color: colors.text }]}>{jobTitle}</Text>
            <Text style={[styles.jobBudget, { color: colors.success }]}>
              Budget: ${parseInt(jobBudget).toLocaleString()}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Proposed Amount ($)</Text>
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder="Enter your proposed amount"
                placeholderTextColor={colors.textSecondary}
                value={formData.proposedAmount}
                onChangeText={(text) => setFormData({ ...formData, proposedAmount: text })}
                keyboardType="numeric"
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Cover Letter</Text>
              <TextInput
                style={[styles.textArea, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder="Describe your approach, experience, and why you're the best fit for this job..."
                placeholderTextColor={colors.textSecondary}
                value={formData.coverLetter}
                onChangeText={(text) => setFormData({ ...formData, coverLetter: text })}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Delivery Time (days)</Text>
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder="How many days will you need?"
                placeholderTextColor={colors.textSecondary}
                value={formData.deliveryTime}
                onChangeText={(text) => setFormData({ ...formData, deliveryTime: text })}
                keyboardType="numeric"
                editable={!isSubmitting}
              />
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
                <Text style={styles.submitButtonText}>Submit Proposal</Text>
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
  jobInfo: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  jobBudget: {
    fontSize: 14,
    fontWeight: '500',
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