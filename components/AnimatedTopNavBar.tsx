import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import { Bell, Moon, Sun, Menu, X, Search } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useWallet } from '@/contexts/WalletContext';
import WalletConnectButton from './WalletConnectButton';
import NotificationModal from './NotificationModal';

const { width: screenWidth } = Dimensions.get('window');

export default function AnimatedTopNavBar() {
  const { isDarkMode, toggleTheme, colors, themeMode } = useTheme();
  const { walletAddress, isConnected } = useWallet();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Animation values
  const searchBarWidth = useRef(new Animated.Value(0)).current;
  const menuSlide = useRef(new Animated.Value(-screenWidth)).current;
  const notificationPulse = useRef(new Animated.Value(1)).current;
  const themeRotation = useRef(new Animated.Value(0)).current;
  const walletSlide = useRef(new Animated.Value(0)).current;

  // Notification pulse animation
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(notificationPulse, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(notificationPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [notificationPulse]);

  // Wallet connection animation
  useEffect(() => {
    Animated.spring(walletSlide, {
      toValue: isConnected ? 1 : 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [isConnected, walletSlide]);

  // Search bar animation
  const toggleSearch = () => {
    const toValue = showSearch ? 0 : 1;
    setShowSearch(!showSearch);
    
    Animated.spring(searchBarWidth, {
      toValue,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  // Menu slide animation
  const toggleMenu = () => {
    const toValue = showMenu ? -screenWidth : 0;
    setShowMenu(!showMenu);
    
    Animated.spring(menuSlide, {
      toValue,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  // Theme toggle animation
  const handleThemeToggle = () => {
    Animated.sequence([
      Animated.timing(themeRotation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(themeRotation, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start();
    
    toggleTheme();
  };

  const themeIconRotation = themeRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const walletSlideTransform = walletSlide.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 0],
  });

  const walletOpacity = walletSlide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.surface}
        animated={true}
      />
      
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        {/* Main Navigation Bar */}
        <View style={styles.mainBar}>
          {/* Left Section */}
          <View style={styles.leftSection}>
            {/* Mobile Menu Button */}
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.background }]}
              onPress={toggleMenu}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Toggle menu"
            >
              <Menu size={20} color={colors.text} />
            </TouchableOpacity>

            {/* Wallet Connection */}
            <Animated.View
              style={[
                styles.walletContainer,
                {
                  transform: [{ translateX: walletSlideTransform }],
                  opacity: walletOpacity,
                },
              ]}
            >
              {isConnected && walletAddress ? (
                <TouchableOpacity
                  style={[
                    styles.walletBadge,
                    { 
                      backgroundColor: colors.primary + '20',
                      borderColor: colors.primary,
                      shadowColor: colors.primary,
                    }
                  ]}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Wallet connected"
                >
                  <Text style={[styles.walletText, { color: colors.primary }]}>
                    {`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
                  </Text>
                </TouchableOpacity>
              ) : (
                <WalletConnectButton size="small" variant="outline" />
              )}
            </Animated.View>
          </View>

          {/* Center Section - Logo/Title */}
          <View style={styles.centerSection}>
            <Text style={[styles.logo, { color: colors.primary }]}>
              Lancerscape
            </Text>
          </View>

          {/* Right Section */}
          <View style={styles.rightSection}>
            {/* Search Button */}
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.background }]}
              onPress={toggleSearch}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Toggle search"
            >
              <Search size={20} color={colors.text} />
            </TouchableOpacity>

            {/* Notifications */}
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.background }]}
              onPress={() => setShowNotifications(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="View notifications"
            >
              <Animated.View style={{ transform: [{ scale: notificationPulse }] }}>
                <Bell size={20} color={colors.text} />
              </Animated.View>
              <View style={[styles.notificationDot, { backgroundColor: colors.error }]} />
            </TouchableOpacity>

            {/* Theme Toggle */}
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.background }]}
              onPress={handleThemeToggle}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            >
              <Animated.View style={{ transform: [{ rotate: themeIconRotation }] }}>
                {isDarkMode ? (
                  <Sun size={20} color={colors.text} />
                ) : (
                  <Moon size={20} color={colors.text} />
                )}
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Animated Search Bar */}
        <Animated.View
          style={[
            styles.searchContainer,
            {
              width: searchBarWidth.interpolate({
                inputRange: [0, 1],
                outputRange: [0, screenWidth - 40],
              }),
              opacity: searchBarWidth,
            },
          ]}
        >
          <View style={[styles.searchBar, { backgroundColor: colors.background }]}>
            <Search size={16} color={colors.textSecondary} />
            <Text style={[styles.searchPlaceholder, { color: colors.textSecondary }]}>
              Search jobs, users, skills...
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* Slide-out Menu */}
      <Animated.View
        style={[
          styles.menuOverlay,
          {
            transform: [{ translateX: menuSlide }],
            backgroundColor: colors.surface + 'F0',
          },
        ]}
      >
        <View style={styles.menuHeader}>
          <Text style={[styles.menuTitle, { color: colors.text }]}>Menu</Text>
          <TouchableOpacity
            onPress={toggleMenu}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
          >
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.menuContent}>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={[styles.menuItemText, { color: colors.text }]}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={[styles.menuItemText, { color: colors.text }]}>My Jobs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={[styles.menuItemText, { color: colors.text }]}>Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={[styles.menuItemText, { color: colors.text }]}>Settings</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Notification Modal */}
      <NotificationModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 12,
    paddingHorizontal: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mainBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  logo: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  walletContainer: {
    overflow: 'hidden',
  },
  walletBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  searchContainer: {
    overflow: 'hidden',
    height: 40,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  searchPlaceholder: {
    fontSize: 16,
    flex: 1,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
  },
  menuContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  menuItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  menuItemText: {
    fontSize: 18,
    fontWeight: '500',
  },
});
