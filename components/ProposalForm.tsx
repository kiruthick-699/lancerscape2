import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { X, DollarSign, Clock, FileText, User } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useWallet } from '@/contexts/WalletContext';
import web3Service from '@/services/web3Service';

interface ProposalFormProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (proposalId: number) => void;
  jobId: number;
  jobTitle: string;
  jobBudget: string;
}

interface ProposalFormData {
  proposedAmount: string;
  coverLetter: string;
  deliveryTime: string;
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

    try {
      setIsSubmitting(true);

      // Convert proposed amount to wei
      const proposedAmountInWei = web3Service.parseEther(formData.proposedAmount);
      
      // Convert delivery time to days
      const deliveryTimeInDays = parseInt(formData.deliveryTime);

      // Submit proposal to blockchain
      const proposalId = await web3Service.submitProposal(
        jobId,
        proposedAmountInWei.toString(),
        formData.coverLetter,
        deliveryTimeInDays
      );

      Alert.alert(
        'Proposal Submitted Successfully!',
        `Your proposal has been submitted with ID: ${proposalId}`,
        [
          {
            text: 'OK',
            onPress: () => {
              onSuccess(proposalId);
              handleClose();
            }
          }
        ]
      );

    } catch (error) {
      console.error('Proposal submission failed:', error);
      Alert.alert(
        'Submission Failed',
        error instanceof Error ? error.message : 'Failed to submit proposal. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      proposedAmount: '',
      coverLetter: '',
      deliveryTime: '',
    });
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: colors.background + 'CC' }]}>
      <View style={[styles.modal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Submit Proposal</Text>
          <TouchableOpacity onPress={handleClose} disabled={isSubmitting}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Job Info */}
          <View style={[styles.jobInfo, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.jobTitle, { color: colors.text }]}>{jobTitle}</Text>
            <View style={styles.jobDetails}>
              <View style={styles.jobDetail}>
                <DollarSign size={16} color={colors.primary} />
                <Text style={[styles.jobDetailText, { color: colors.textSecondary }]}>
                  Budget: {jobBudget} ETH
                </Text>
              </View>
              <View style={styles.jobDetail}>
                <User size={16} color={colors.primary} />
                <Text style={[styles.jobDetailText, { color: colors.textSecondary }]}>
                  Job ID: {jobId}
                </Text>
              </View>
            </View>
          </View>

          {/* Wallet Status */}
          {!isConnected && (
            <View style={[styles.warning, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}>
              <Text style={[styles.warningText, { color: colors.warning }]}>
                Connect your wallet to submit proposals
              </Text>
            </View>
          )}

          {/* Proposed Amount */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Your Proposed Amount (ETH) *</Text>
            <View style={[styles.inputContainer, { 
              backgroundColor: colors.background, 
              borderColor: colors.border 
            }]}>
              <DollarSign size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text, flex: 1 }]}
                value={formData.proposedAmount}
                onChangeText={(text) => setFormData({ ...formData, proposedAmount: text })}
                placeholder="0.05"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Cannot exceed job budget of {jobBudget} ETH
            </Text>
          </View>

          {/* Delivery Time */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Delivery Time (Days) *</Text>
            <View style={[styles.inputContainer, { 
              backgroundColor: colors.background, 
              borderColor: colors.border 
            }]}>
              <Clock size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text, flex: 1 }]}
                value={formData.deliveryTime}
                onChangeText={(text) => setFormData({ ...formData, deliveryTime: text })}
                placeholder="7"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Cover Letter */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Cover Letter *</Text>
            <View style={[styles.coverLetterContainer, { 
              backgroundColor: colors.background, 
              borderColor: colors.border 
            }]}>
              <FileText size={20} color={colors.textSecondary} style={styles.coverLetterIcon} />
              <TextInput
                style={[styles.textArea, { color: colors.text }]}
                value={formData.coverLetter}
                onChangeText={(text) => setFormData({ ...formData, coverLetter: text })}
                placeholder="Explain why you're the best fit for this job, your relevant experience, and your approach to completing the work..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Proposal Summary */}
          <View style={[styles.summary, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
            <Text style={[styles.summaryTitle, { color: colors.primary }]}>Proposal Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Proposed Amount:</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formData.proposedAmount || '0'} ETH
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Delivery Time:</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formData.deliveryTime || '0'} days
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Savings:</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                {formData.proposedAmount && jobBudget 
                  ? (parseFloat(jobBudget) - parseFloat(formData.proposedAmount)).toFixed(4)
                  : '0'} ETH
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              { 
                backgroundColor: isConnected ? colors.primary : colors.border,
                opacity: isSubmitting ? 0.7 : 1
              }
            ]}
            onPress={handleSubmit}
            disabled={!isConnected || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <FileText size={20} color="#fff" />
                <Text style={styles.submitText}>Submit Proposal</Text>
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
  modal: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    padding: 20,
  },
  jobInfo: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  jobDetails: {
    gap: 8,
  },
  jobDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  jobDetailText: {
    fontSize: 14,
  },
  warning: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
  coverLetterContainer: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  coverLetterIcon: {
    marginBottom: 8,
  },
  textArea: {
    fontSize: 16,
    height: 120,
  },
  summary: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 