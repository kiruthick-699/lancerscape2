import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import web3Service from '@/services/web3Service';

interface WalletContextType {
  walletAddress: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Web3Service
  useEffect(() => {
    const initializeWeb3 = async () => {
      try {
        const config = {
          rpcUrl: process.env.EXPO_PUBLIC_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID',
          jobPostingAddress: process.env.EXPO_PUBLIC_JOB_POSTING_ADDRESS || '',
          escrowAddress: process.env.EXPO_PUBLIC_ESCROW_ADDRESS || '',
          reputationAddress: process.env.EXPO_PUBLIC_REPUTATION_ADDRESS || '',
          chainId: parseInt(process.env.EXPO_PUBLIC_CHAIN_ID || '11155111'), // Sepolia
        };

        await web3Service.initialize(config);
      } catch (err) {
        console.error('Failed to initialize Web3Service:', err);
        setError('Failed to initialize blockchain connection');
      }
    };

    initializeWeb3();
  }, []);

  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      const address = await web3Service.connectWallet();
      setWalletAddress(address);
      setIsConnected(true);
    } catch (err) {
      console.error('Wallet connection failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setIsConnected(false);
    setError(null);
  };

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        isConnected,
        isConnecting,
        connectWallet,
        disconnectWallet,
        error,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
} 