import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, StyleSheet } from 'react-native';
import { Briefcase, FileText, DollarSign, TrendingUp, Plus, CheckCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useWallet } from '@/contexts/WalletContext';
import TopNavBar from '@/components/TopNavBar';
import JobCard from '@/components/JobCard';
import ProjectTimeline from '@/components/ProjectTimeline';
import JobPostingForm from '@/components/JobPostingForm';
import { mockJobs } from '@/data/mockData';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { isConnected } = useWallet();
  const [activeTab, setActiveTab] = useState<'hire' | 'freelance'>('freelance');
  const [showJobForm, setShowJobForm] = useState(false);

  const stats = {
    totalEarnings: 12500,
    activeJobs: 3,
    completedJobs: 15,
    successRate: 98,
  };

  const activeJobs = mockJobs.filter(job => 
    job.status === 'accepted' || job.status === 'in_progress'
  );

  const handleJobPosted = (jobId: number) => {
    console.log('Job posted successfully with ID:', jobId);
    // Here you could refresh the job list or show a success message
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TopNavBar />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
            onPress={() => setActiveTab('hire')}
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
            onPress={() => setActiveTab('freelance')}
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
              <TrendingUp size={24} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stats.activeJobs}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Active Jobs
              </Text>
            </View>
          </View>
        )}

        {/* Content based on active tab */}
        {activeTab === 'hire' ? (
          <View style={styles.content}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Hiring Dashboard</Text>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowJobForm(true)}
              disabled={!isConnected}
            >
              <Plus size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Post New Job</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              disabled={!isConnected}
            >
              <Briefcase size={20} color={colors.text} />
              <Text style={[styles.actionButtonText, { color: colors.text }]}>Manage Jobs</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              disabled={!isConnected}
            >
              <CheckCircle size={20} color={colors.text} />
              <Text style={[styles.actionButtonText, { color: colors.text }]}>Approve Work</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.content}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Projects</Text>
            
            {activeJobs.length > 0 ? (
              <>
                {activeJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
                
                <ProjectTimeline jobTitle="E-commerce Website Development" />
              </>
            ) : (
              <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <FileText size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Active Jobs</Text>
                <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
                  Browse available jobs to get started
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Job Posting Form Modal */}
      <JobPostingForm
        visible={showJobForm}
        onClose={() => setShowJobForm(false)}
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
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
  },
  walletNoticeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});