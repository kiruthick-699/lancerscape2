import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  StyleSheet,
  Alert 
} from 'react-native';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Filter, 
  DollarSign, 
  Clock, 
  MapPin,
  User,
  Eye
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useWallet } from '@/contexts/WalletContext';
import TopNavBar from '@/components/TopNavBar';
import JobCard from '@/components/JobCard';
import JobPostingForm from '@/components/JobPostingForm';
import ProposalForm from '@/components/ProposalForm';
import PaymentProcessor from '@/components/PaymentProcessor';
import web3Service from '@/services/web3Service';
import { mockJobs } from '@/data/mockData';

interface Job {
  id: number;
  title: string;
  description: string;
  budget: string;
  deadline: number;
  category: number;
  isRemote: boolean;
  client: string;
  status: string;
  proposals?: number;
}

export default function JobsScreen() {
  const { colors } = useTheme();
  const { isConnected, walletAddress } = useWallet();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJobForm, setShowJobForm] = useState(false);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [showPaymentProcessor, setShowPaymentProcessor] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'my-jobs' | 'available'>('all');

  // Load jobs from blockchain
  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      
      // For now, use mock data
      // In production, you would fetch from blockchain
      const blockchainJobs = mockJobs.map(job => ({
        id: parseInt(job.id.toString()),
        title: job.title,
        description: job.description,
        budget: job.budget.toString(),
        deadline: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days from now
        category: 0, // Development
        isRemote: job.location === 'remote',
        client: '0x742d...4aB7',
        status: job.status,
        proposals: Math.floor(Math.random() * 5) + 1
      }));

      setJobs(blockchainJobs);
      setFilteredJobs(blockchainJobs);
    } catch (error) {
      console.error('Failed to load jobs:', error);
      Alert.alert('Error', 'Failed to load jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterJobs = (filter: 'all' | 'my-jobs' | 'available') => {
    setActiveFilter(filter);
    
    let filtered = jobs;
    
    switch (filter) {
      case 'my-jobs':
        filtered = jobs.filter(job => job.client === walletAddress);
        break;
      case 'available':
        filtered = jobs.filter(job => job.status === 'open' && job.client !== walletAddress);
        break;
      default:
        filtered = jobs;
    }
    
    setFilteredJobs(filtered);
  };

  const handleJobPosted = (jobId: number) => {
    console.log('Job posted successfully with ID:', jobId);
    loadJobs(); // Refresh job list
  };

  const handleProposalSubmitted = (proposalId: number) => {
    console.log('Proposal submitted successfully with ID:', proposalId);
    Alert.alert('Success', 'Your proposal has been submitted successfully!');
  };

  const handlePaymentProcessed = () => {
    console.log('Payment processed successfully');
    loadJobs(); // Refresh job list
  };

  const openProposalForm = (job: Job) => {
    if (!isConnected) {
      Alert.alert('Wallet Required', 'Please connect your wallet to submit a proposal.');
      return;
    }
    
    setSelectedJob(job);
    setShowProposalForm(true);
  };

  const openPaymentProcessor = (job: Job) => {
    // Mock payment data - in production, fetch from blockchain
    const paymentData = {
      escrowId: 1,
      jobId: job.id,
      amount: job.budget,
      freelancer: '0x1234...5678',
      client: job.client,
      status: 'pending' as const
    };
    
    setSelectedPayment(paymentData);
    setShowPaymentProcessor(true);
  };

  const formatDeadline = (deadline: number) => {
    const days = Math.ceil((deadline - Date.now()) / (1000 * 60 * 60 * 24));
    return `${days} days left`;
  };

  const getCategoryIcon = (category: number) => {
    const icons = ['🎨', '💻', '✍️', '📢', '🔧'];
    return icons[category] || '🔧';
  };

  const getCategoryName = (category: number) => {
    const names = ['Design', 'Development', 'Writing', 'Marketing', 'Other'];
    return names[category] || 'Other';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TopNavBar />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Jobs</Text>
          <TouchableOpacity
            style={[styles.postButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowJobForm(true)}
            disabled={!isConnected}
          >
            <Plus size={20} color="#fff" />
            <Text style={styles.postButtonText}>Post Job</Text>
          </TouchableOpacity>
        </View>

        {/* Search and Filters */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Search size={20} color={colors.textSecondary} />
            <Text style={[styles.searchPlaceholder, { color: colors.textSecondary }]}>
              Search jobs...
            </Text>
          </View>
          
          <TouchableOpacity style={[styles.filterButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Filter size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          {[
            { key: 'all', label: 'All Jobs' },
            { key: 'my-jobs', label: 'My Jobs' },
            { key: 'available', label: 'Available' }
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                { backgroundColor: colors.surface, borderColor: colors.border },
                activeFilter === filter.key && { backgroundColor: colors.primary }
              ]}
              onPress={() => filterJobs(filter.key as any)}
            >
              <Text style={[
                styles.filterTabText,
                { color: activeFilter === filter.key ? '#fff' : colors.text }
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Jobs List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading jobs...
            </Text>
          </View>
        ) : filteredJobs.length > 0 ? (
          <View style={styles.jobsList}>
            {filteredJobs.map((job) => (
              <View key={job.id} style={[styles.jobCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.jobHeader}>
                  <View style={styles.jobTitleContainer}>
                    <Text style={styles.categoryIcon}>{getCategoryIcon(job.category)}</Text>
                    <Text style={[styles.jobTitle, { color: colors.text }]}>{job.title}</Text>
                  </View>
                  <View style={[styles.statusBadge, { 
                    backgroundColor: job.status === 'open' ? colors.success + '20' : colors.warning + '20',
                    borderColor: job.status === 'open' ? colors.success : colors.warning
                  }]}>
                    <Text style={[styles.statusText, { 
                      color: job.status === 'open' ? colors.success : colors.warning 
                    }]}>
                      {job.status}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.jobDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                  {job.description}
                </Text>

                <View style={styles.jobDetails}>
                  <View style={styles.jobDetail}>
                    <DollarSign size={16} color={colors.primary} />
                    <Text style={[styles.jobDetailText, { color: colors.text }]}>
                      {job.budget} ETH
                    </Text>
                  </View>
                  
                  <View style={styles.jobDetail}>
                    <Clock size={16} color={colors.textSecondary} />
                    <Text style={[styles.jobDetailText, { color: colors.textSecondary }]}>
                      {formatDeadline(job.deadline)}
                    </Text>
                  </View>
                  
                  {job.isRemote && (
                    <View style={styles.jobDetail}>
                      <MapPin size={16} color={colors.textSecondary} />
                      <Text style={[styles.jobDetailText, { color: colors.textSecondary }]}>
                        Remote
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.jobFooter}>
                  <View style={styles.jobMeta}>
                    <User size={14} color={colors.textSecondary} />
                    <Text style={[styles.jobMetaText, { color: colors.textSecondary }]}>
                      {job.client.slice(0, 6)}...{job.client.slice(-4)}
                    </Text>
                    {job.proposals && (
                      <>
                        <Text style={[styles.jobMetaText, { color: colors.textSecondary }]}>•</Text>
                        <Text style={[styles.jobMetaText, { color: colors.textSecondary }]}>
                          {job.proposals} proposals
                        </Text>
                      </>
                    )}
                  </View>

                  <View style={styles.jobActions}>
                    {job.client === walletAddress ? (
                      // Client actions
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.primary }]}
                        onPress={() => openPaymentProcessor(job)}
                      >
                        <Eye size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Manage</Text>
                      </TouchableOpacity>
                    ) : (
                      // Freelancer actions
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.primary }]}
                        onPress={() => openProposalForm(job)}
                      >
                        <Briefcase size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Apply</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Briefcase size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Jobs Found</Text>
            <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
              {activeFilter === 'my-jobs' 
                ? 'You haven\'t posted any jobs yet'
                : activeFilter === 'available'
                ? 'No available jobs match your criteria'
                : 'No jobs available at the moment'
              }
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <JobPostingForm
        visible={showJobForm}
        onClose={() => setShowJobForm(false)}
        onSuccess={handleJobPosted}
      />

      {selectedJob && (
        <ProposalForm
          visible={showProposalForm}
          onClose={() => setShowProposalForm(false)}
          onSuccess={handleProposalSubmitted}
          jobId={selectedJob.id}
          jobTitle={selectedJob.title}
          jobBudget={selectedJob.budget}
        />
      )}

      {selectedPayment && (
        <PaymentProcessor
          visible={showPaymentProcessor}
          onClose={() => setShowPaymentProcessor(false)}
          onSuccess={handlePaymentProcessed}
          escrowId={selectedPayment.escrowId}
          jobId={selectedPayment.jobId}
          amount={selectedPayment.amount}
          freelancer={selectedPayment.freelancer}
          client={selectedPayment.client}
          status={selectedPayment.status}
        />
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  searchPlaceholder: {
    fontSize: 16,
  },
  filterButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  jobsList: {
    gap: 16,
  },
  jobCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  categoryIcon: {
    fontSize: 20,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  jobDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  jobDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  jobDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  jobDetailText: {
    fontSize: 12,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  jobMetaText: {
    fontSize: 12,
  },
  jobActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
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