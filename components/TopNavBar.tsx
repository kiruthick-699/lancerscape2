import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Bell, Moon, Sun } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useWallet } from '@/contexts/WalletContext';
import WalletConnectButton from './WalletConnectButton';
import NotificationModal from './NotificationModal';

export default function TopNavBar() {
  const { isDarkMode, toggleTheme, colors } = useTheme();
  const { walletAddress, isConnected } = useWallet();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.leftSection}>
          {isConnected && walletAddress ? (
            <View style={[styles.walletBadge, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
              <Text style={[styles.walletText, { color: colors.primary }]}>
                {`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
              </Text>
            </View>
          ) : (
            <WalletConnectButton size="small" variant="outline" />
          )}
        </View>

        <View style={styles.rightSection}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.background }]}
            onPress={() => setShowNotifications(true)}
          >
            <Bell size={20} color={colors.text} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.background }]}
            onPress={toggleTheme}
          >
            {isDarkMode ? (
              <Sun size={20} color={colors.text} />
            ) : (
              <Moon size={20} color={colors.text} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <NotificationModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  leftSection: {
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    gap: 12,
  },
  walletBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  walletText: {
    fontSize: 14,
    fontWeight: '600',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
});