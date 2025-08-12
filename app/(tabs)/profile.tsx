import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, StyleSheet, Switch, Alert } from 'react-native';
import { User, Settings, Moon, Sun, LogOut, Shield, Bell, HelpCircle, Star } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import TopNavBar from '@/components/TopNavBar';
import NFTBadge from '@/components/NFTBadge';
import { mockNFTBadge } from '@/data/mockData';

export default function ProfileScreen() {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  const settingsItems = [
    {
      icon: Bell,
      title: 'Push Notifications',
      subtitle: 'Get notified about new jobs and messages',
      type: 'switch',
      value: notificationsEnabled,
      onValueChange: setNotificationsEnabled,
    },
    {
      icon: Bell,
      title: 'Email Notifications',
      subtitle: 'Receive updates via email',
      type: 'switch',
      value: emailNotifications,
      onValueChange: setEmailNotifications,
    },
    {
      icon: Shield,
      title: 'Privacy Settings',
      subtitle: 'Manage your privacy preferences',
      type: 'navigate',
    },
    {
      icon: HelpCircle,
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      type: 'navigate',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TopNavBar />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <User size={40} color="#fff" />
            </View>
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={[styles.name, { color: colors.text }]}>
              {user ? `${user.firstName} ${user.lastName}` : 'User'}
            </Text>
            <Text style={[styles.email, { color: colors.textSecondary }]}>
              {user?.email || 'user@example.com'}
            </Text>
            <Text style={[styles.joinDate, { color: colors.textSecondary }]}>
              {user?.userType === 'freelancer' ? 'Freelancer' : 'Client'} • Member since {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              ${user?.totalEarnings ? user.totalEarnings.toLocaleString() : '0'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Earnings</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {user?.completedJobs || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completed Jobs</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.ratingContainer}>
              <Star size={16} color={colors.warning} fill={colors.warning} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {user?.averageRating ? user.averageRating.toFixed(1) : '0.0'}
              </Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {user?.reviewCount || 0} reviews
            </Text>
          </View>
        </View>

        {/* NFT Badge */}
        <View style={styles.badgeSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Verification Badge</Text>
          <NFTBadge badge={mockNFTBadge} />
        </View>

        {/* Settings */}
        <View style={styles.settingsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
          
          {/* Theme Toggle */}
          <View style={[styles.settingItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.settingLeft}>
              {isDarkMode ? <Moon size={20} color={colors.text} /> : <Sun size={20} color={colors.text} />}
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>
                  {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                </Text>
                <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                  Switch between light and dark themes
                </Text>
              </View>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isDarkMode ? '#fff' : colors.text}
            />
          </View>

          {/* Other Settings */}
          {settingsItems.map((item, index) => (
            <View key={index} style={[styles.settingItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.settingLeft}>
                <item.icon size={20} color={colors.text} />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                </View>
              </View>
              {item.type === 'switch' && (
                <Switch
                  value={item.value}
                  onValueChange={item.onValueChange}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={item.value ? '#fff' : colors.text}
                />
              )}
            </View>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.error }]} onPress={handleLogout}>
          <LogOut size={20} color="#fff" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    marginBottom: 4,
  },
  joinDate: {
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});