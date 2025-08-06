import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Wallet, Loader } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useWallet } from '@/contexts/WalletContext';

interface WalletConnectButtonProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'outline';
}

export default function WalletConnectButton({ 
  size = 'medium', 
  variant = 'primary' 
}: WalletConnectButtonProps) {
  const { colors } = useTheme();
  const { walletAddress, isConnected, isConnecting, connectWallet, disconnectWallet, error } = useWallet();

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handlePress = async () => {
    if (isConnected) {
      Alert.alert(
        'Disconnect Wallet',
        'Are you sure you want to disconnect your wallet?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Disconnect', style: 'destructive', onPress: disconnectWallet }
        ]
      );
    } else {
      await connectWallet();
    }
  };

  const getButtonStyle = () => {
    const baseStyle = [styles.button, styles[size]];
    
    switch (variant) {
      case 'primary':
        return [...baseStyle, { backgroundColor: colors.primary }];
      case 'secondary':
        return [...baseStyle, { backgroundColor: colors.surface, borderColor: colors.border }];
      case 'outline':
        return [...baseStyle, { backgroundColor: 'transparent', borderColor: colors.primary }];
      default:
        return [...baseStyle, { backgroundColor: colors.primary }];
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
        return { color: '#fff' };
      case 'secondary':
        return { color: colors.text };
      case 'outline':
        return { color: colors.primary };
      default:
        return { color: '#fff' };
    }
  };

  if (error) {
    return (
      <TouchableOpacity style={[styles.button, styles[size], { backgroundColor: colors.error }]} onPress={handlePress}>
        <Wallet size={16} color="#fff" />
        <Text style={[styles.text, { color: '#fff' }]}>Retry Connection</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={getButtonStyle()} onPress={handlePress} disabled={isConnecting}>
      {isConnecting ? (
        <>
          <Loader size={16} color={variant === 'primary' ? '#fff' : colors.text} style={styles.spinning} />
          <Text style={[styles.text, getTextStyle()]}>Connecting...</Text>
        </>
      ) : isConnected ? (
        <>
          <Wallet size={16} color={variant === 'primary' ? '#fff' : colors.primary} />
          <Text style={[styles.text, getTextStyle()]}>
            {formatWalletAddress(walletAddress!)}
          </Text>
        </>
      ) : (
        <>
          <Wallet size={16} color={variant === 'primary' ? '#fff' : colors.primary} />
          <Text style={[styles.text, getTextStyle()]}>Connect Wallet</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  small: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  medium: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  large: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
  spinning: {
    transform: [{ rotate: '360deg' }],
  },
}); 