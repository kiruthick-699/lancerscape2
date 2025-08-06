import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { DollarSign, Lock, Unlock, AlertTriangle, CheckCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useWallet } from '@/contexts/WalletContext';
import web3Service from '@/services/web3Service';

interface PaymentProcessorProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  escrowId: number;
  jobId: number;
  amount: string;
  freelancer: string;
  client: string;
  status: 'pending' | 'released' | 'disputed';
}

export default function PaymentProcessor({ 
  visible, 
  onClose, 
  onSuccess, 
  escrowId, 
  jobId, 
  amount, 
  freelancer, 
  client, 
  status 
}: PaymentProcessorProps) {
  const { colors } = useTheme();
  const { isConnected, walletAddress } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);

  const isClient = walletAddress?.toLowerCase() === client.toLowerCase();
  const isFreelancer = walletAddress?.toLowerCase() === freelancer.toLowerCase();

  const handleReleasePayment = async () => {
    if (!isConnected) {
      Alert.alert('Wallet Required', 'Please connect your wallet to release payment.');
      return;
    }

    if (!isClient) {
      Alert.alert('Unauthorized', 'Only the job client can release payment.');
      return;
    }

    Alert.alert(
      'Release Payment',
      `Are you sure you want to release ${amount} ETH to the freelancer? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsProcessing(true);
              await web3Service.releasePayment(escrowId);
              
              Alert.alert(
                'Payment Released',
                'The payment has been successfully released to the freelancer.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      onSuccess();
                      onClose();
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('Payment release failed:', error);
              Alert.alert(
                'Release Failed',
                error instanceof Error ? error.message : 'Failed to release payment. Please try again.'
              );
            } finally {
              setIsProcessing(false);
            }
          }
        }
      ]
    );
  };

  const handleRaiseDispute = async () => {
    if (!isConnected) {
      Alert.alert('Wallet Required', 'Please connect your wallet to raise a dispute.');
      return;
    }

    if (!isClient && !isFreelancer) {
      Alert.alert('Unauthorized', 'Only the client or freelancer can raise a dispute.');
      return;
    }

    Alert.prompt(
      'Raise Dispute',
      'Please provide a reason for the dispute:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async (reason) => {
            if (!reason || reason.trim().length === 0) {
              Alert.alert('Invalid Reason', 'Please provide a reason for the dispute.');
              return;
            }

            try {
              setIsProcessing(true);
              await web3Service.raiseDispute(escrowId, reason.trim());
              
              Alert.alert(
                'Dispute Raised',
                'The dispute has been successfully raised and will be reviewed.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      onSuccess();
                      onClose();
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('Dispute raising failed:', error);
              Alert.alert(
                'Dispute Failed',
                error instanceof Error ? error.message : 'Failed to raise dispute. Please try again.'
              );
            } finally {
              setIsProcessing(false);
            }
          }
        }
      ]
    );
  };

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: colors.background + 'CC' }]}>
      <View style={[styles.modal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Payment Details</Text>
          <TouchableOpacity onPress={onClose} disabled={isProcessing}>
            <Text style={[styles.closeButton, { color: colors.text }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Status Indicator */}
          <View style={[styles.statusContainer, { 
            backgroundColor: status === 'released' 
              ? colors.success + '20' 
              : status === 'disputed' 
                ? colors.error + '20' 
                : colors.warning + '20',
            borderColor: status === 'released' 
              ? colors.success 
              : status === 'disputed' 
                ? colors.error 
                : colors.warning
          }]}>
            {status === 'released' ? (
              <CheckCircle size={24} color={colors.success} />
            ) : status === 'disputed' ? (
              <AlertTriangle size={24} color={colors.error} />
            ) : (
              <Lock size={24} color={colors.warning} />
            )}
            <Text style={[styles.statusText, { 
              color: status === 'released' 
                ? colors.success 
                : status === 'disputed' 
                  ? colors.error 
                  : colors.warning
            }]}>
              {status === 'released' ? 'Payment Released' : 
               status === 'disputed' ? 'Dispute Raised' : 'Payment Pending'}
            </Text>
          </View>

          {/* Payment Info */}
          <View style={[styles.infoContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Escrow ID:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{escrowId}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Job ID:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{jobId}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Amount:</Text>
              <Text style={[styles.infoValue, { color: colors.primary, fontWeight: '700' }]}>
                {amount} ETH
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Client:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {client.slice(0, 6)}...{client.slice(-4)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Freelancer:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {freelancer.slice(0, 6)}...{freelancer.slice(-4)}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          {status === 'pending' && (
            <View style={styles.actions}>
              {isClient && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.success }]}
                  onPress={handleReleasePayment}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Unlock size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Release Payment</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              
              {(isClient || isFreelancer) && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.error }]}
                  onPress={handleRaiseDispute}
                  disabled={isProcessing}
                >
                  <AlertTriangle size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Raise Dispute</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Status Messages */}
          {status === 'released' && (
            <View style={[styles.message, { backgroundColor: colors.success + '20', borderColor: colors.success }]}>
              <CheckCircle size={20} color={colors.success} />
              <Text style={[styles.messageText, { color: colors.success }]}>
                Payment has been successfully released to the freelancer.
              </Text>
            </View>
          )}

          {status === 'disputed' && (
            <View style={[styles.message, { backgroundColor: colors.error + '20', borderColor: colors.error }]}>
              <AlertTriangle size={20} color={colors.error} />
              <Text style={[styles.messageText, { color: colors.error }]}>
                A dispute has been raised. The platform will review and resolve the issue.
              </Text>
            </View>
          )}

          {/* Wallet Status */}
          {!isConnected && (
            <View style={[styles.warning, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}>
              <Text style={[styles.warningText, { color: colors.warning }]}>
                Connect your wallet to manage payments
              </Text>
            </View>
          )}
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
    maxWidth: 400,
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
  closeButton: {
    fontSize: 24,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  messageText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  warning: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 