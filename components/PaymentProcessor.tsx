import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { DollarSign, AlertTriangle, CheckCircle, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useWallet } from '@/contexts/WalletContext';
import web3Service from '@/services/web3Service';

interface PaymentProcessorProps {
  visible: boolean;
  onClose: () => void;
  escrowId: number;
  amount: number;
  freelancerAddress: string;
  jobTitle: string;
}

export default function PaymentProcessor({
  visible,
  onClose,
  escrowId,
  amount,
  freelancerAddress,
  jobTitle,
}: PaymentProcessorProps) {
  const { colors } = useTheme();
  const { isConnected, walletAddress } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [action, setAction] = useState<'release' | 'dispute' | null>(null);

  const handleReleasePayment = async () => {
    if (!isConnected) {
      Alert.alert('Wallet Required', 'Please connect your wallet to release payment.');
      return;
    }

    setAction('release');
    setIsProcessing(true);

    try {
      await web3Service.releasePayment(escrowId);
      
      Alert.alert(
        'Payment Released!',
        `Payment of ${amount} ETH has been released to the freelancer.`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      Alert.alert(
        'Payment Release Failed',
        error instanceof Error ? error.message : 'Failed to release payment. Please try again.'
      );
    } finally {
      setIsProcessing(false);
      setAction(null);
    }
  };

  const handleRaiseDispute = async () => {
    if (!isConnected) {
      Alert.alert('Wallet Required', 'Please connect your wallet to raise a dispute.');
      return;
    }

    setAction('dispute');
    setIsProcessing(true);

    try {
      const reason = 'Payment dispute raised by client';
      await web3Service.raiseDispute(escrowId, reason);
      
      Alert.alert(
        'Dispute Raised',
        'A dispute has been raised for this payment. Our team will review the case.',
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      Alert.alert(
        'Dispute Raising Failed',
        error instanceof Error ? error.message : 'Failed to raise dispute. Please try again.'
      );
    } finally {
      setIsProcessing(false);
      setAction(null);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Payment Processor
            </Text>
            <TouchableOpacity onPress={handleClose} disabled={isProcessing}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Job Info */}
          <View style={[styles.jobInfo, { borderColor: colors.border }]}>
            <Text style={[styles.jobTitle, { color: colors.text }]}>
              {jobTitle}
            </Text>
            <Text style={[styles.amount, { color: colors.success }]}>
              {amount} ETH
            </Text>
            <Text style={[styles.freelancer, { color: colors.textSecondary }]}>
              To: {freelancerAddress.slice(0, 6)}...{freelancerAddress.slice(-4)}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: colors.success, borderColor: colors.success }
              ]}
              onPress={handleReleasePayment}
              disabled={isProcessing}
            >
              {action === 'release' && isProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <CheckCircle size={20} color="#fff" />
              )}
              <Text style={styles.actionButtonText}>
                {action === 'release' && isProcessing ? 'Releasing...' : 'Release Payment'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: colors.warning, borderColor: colors.warning }
              ]}
              onPress={handleRaiseDispute}
              disabled={isProcessing}
            >
              {action === 'dispute' && isProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <AlertTriangle size={20} color="#fff" />
              )}
              <Text style={styles.actionButtonText}>
                {action === 'dispute' && isProcessing ? 'Raising...' : 'Raise Dispute'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Warning */}
          <View style={[styles.warning, { backgroundColor: colors.warning + '20' }]}>
            <AlertTriangle size={16} color={colors.warning} />
            <Text style={[styles.warningText, { color: colors.warning }]}>
              These actions cannot be undone. Please ensure you're certain before proceeding.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  jobInfo: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  freelancer: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  actions: {
    gap: 16,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
}); 