import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, StyleSheet, Alert } from 'react-native';
import { Briefcase, FileText, DollarSign, TrendingUp, Plus, CheckCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useWallet } from '@/contexts/WalletContext';
import TopNavBar from '@/components/TopNavBar';
import JobCard from '@/components/JobCard';
import ProjectTimeline from '@/components/ProjectTimeline';
import JobPostingForm from '@/components/JobPostingForm';
import { mockJobs } from '@/data/mockData';
import { Job } from '@/types';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { isConnected } = useWallet();
  const [activeTab, setActiveTab] = useState<'hire' | 'freelance'>('freelance');
  const [showJobForm, setShowJobForm] = useState(false);

  const stats = useMemo(() => ({
    totalEarnings: 12500,
    activeJobs: 3,
    completedJobs: 15,
    successRate: 98,
  }), []);

  const activeJobs = useMemo(() => 
    mockJobs.filter((job: Job) => 
      job.status === 'accepted' || job.status === 'in_progress'
    ), []
  );

  const handleJobPosted = useCallback((jobId: number) => {
    try {
      // Job posted successfully - could refresh the job list or show a success message
      setShowJobForm(false);
      Alert.alert('Success', 'Job posted successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to post job. Please try again.');
    }
  }, []);

  const handleTabChange = useCallback((tab: 'hire' | 'freelance') => {
    setActiveTab(tab);
  }, []);

  const handlePostJob = useCallback(() => {
    setShowJobForm(true);
  }, []);

  const handleFindWork = useCallback(() => {
    // Navigate to job search - this would be implemented with navigation
    Alert.alert('Find Work', 'Job search feature coming soon!');
  }, []);

  const handleCloseJobForm = useCallback(() => {
    setShowJobForm(false);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TopNavBar />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Wallet Connection Notice */}
        {!isConnected && (
          <View style={[styles.walletNotice, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}>
            <Text style={[styles.walletNoticeText, { color: colors.warning }]}>
              Connect your wallet to access blockchain features
            </Text>
          </View>
        )}

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              { backgroundColor: colors.surface, borderColor: colors.border },
              activeTab === 'hire' && { backgroundColor: colors.primary }
            ]}
            onPress={() => handleTabChange('hire')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Hire tab"
            accessibilityState={{ selected: activeTab === 'hire' }}
          >
            <Briefcase size={20} color={activeTab === 'hire' ? '#fff' : colors.text} />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'hire' ? '#fff' : colors.text }
            ]}>
              Hire
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.tab,
              { backgroundColor: colors.surface, borderColor: colors.border },
              activeTab === 'freelance' && { backgroundColor: colors.primary }
            ]}
            onPress={() => handleTabChange('freelance')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Freelance tab"
            accessibilityState={{ selected: activeTab === 'freelance' }}
          >
            <FileText size={20} color={activeTab === 'freelance' ? '#fff' : colors.text} />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'freelance' ? '#fff' : colors.text }
            ]}>
              Freelance
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats Overview */}
        {activeTab === 'freelance' && (
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <DollarSign size={24} color={colors.success} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                ${stats.totalEarnings.toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Total Earnings
              </Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Briefcase size={24} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stats.activeJobs}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Active Jobs
              </Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <CheckCircle size={24} color={colors.success} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stats.completedJobs}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Completed
              </Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TrendingUp size={24} color={colors.warning} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stats.successRate}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Success Rate
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {activeTab === 'hire' ? (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handlePostJob}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Post a job"
              accessibilityHint="Double tap to create a new job posting"
            >
              <Plus size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Post a Job</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleFindWork}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Find work"
              accessibilityHint="Double tap to search for available jobs"
            >
              <FileText size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Find Work</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Active Jobs */}
        {activeTab === 'freelance' && activeJobs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Active Jobs
            </Text>
            {activeJobs.slice(0, 3).map((job: Job) => (
              <JobCard 
                key={job.id} 
                job={job}
                onPress={() => {
                  // Navigate to job details
                  Alert.alert('Job Details', `Viewing details for: ${job.title}`);
                }}
              />
            ))}
          </View>
        )}

        {/* Project Timeline */}
        {activeTab === 'freelance' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Recent Activity
            </Text>
            <ProjectTimeline />
          </View>
        )}
      </ScrollView>

      <JobPostingForm
        visible={showJobForm}
        onClose={handleCloseJobForm}
        onSuccess={handleJobPosted}
      />
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
  walletNotice: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
  },
  walletNoticeText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionContainer: {
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
});