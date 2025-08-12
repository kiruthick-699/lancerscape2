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
      Alert.alert('Error', 'Failed to load jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJobPosted = (jobId: number) => {
    // Job posted successfully - could refresh the job list or show a success message
    setShowJobForm(false);
    loadJobs(); // Refresh the job list
  };

  const handleProposalSubmitted = (proposalId: number) => {
    // Proposal submitted successfully
    setShowProposalForm(false);
    Alert.alert('Success', 'Proposal submitted successfully!');
  };

  const handlePaymentProcessed = () => {
    // Payment processed successfully
    setShowPaymentProcessor(false);
    Alert.alert('Success', 'Payment processed successfully!');
  };

  const filterJobs = (filter: 'all' | 'my-jobs' | 'available') => {
    setActiveFilter(filter);
    
    let filtered = jobs;
    
    switch (filter) {
      case 'my-jobs':
        filtered = jobs.filter(job => job.status === 'accepted' || job.status === 'in_progress');
        break;
      case 'available':
        filtered = jobs.filter(job => job.status === 'posted');
        break;
      default:
        filtered = jobs;
    }
    
    setFilteredJobs(filtered);
  };

  const handleJobPress = (job: Job) => {
    setSelectedJob(job);
    setShowProposalForm(true);
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
          <Text style={[styles.title, { color: colors.text }]}>Browse Jobs</Text>
          <TouchableOpacity
            style={[styles.postButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowJobForm(true)}
          >
            <Plus size={20} color="#fff" />
            <Text style={styles.postButtonText}>Post Job</Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              activeFilter === 'all' && { backgroundColor: colors.primary }
            ]}
            onPress={() => filterJobs('all')}
          >
            <Text style={[
              styles.filterText,
              { color: activeFilter === 'all' ? '#fff' : colors.text }
            ]}>
              All Jobs
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              activeFilter === 'available' && { backgroundColor: colors.primary }
            ]}
            onPress={() => filterJobs('available')}
          >
            <Text style={[
              styles.filterText,
              { color: activeFilter === 'available' ? '#fff' : colors.text }
            ]}>
              Available
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              activeFilter === 'my-jobs' && { backgroundColor: colors.primary }
            ]}
            onPress={() => filterJobs('my-jobs')}
          >
            <Text style={[
              styles.filterText,
              { color: activeFilter === 'my-jobs' ? '#fff' : colors.text }
            ]}>
              My Jobs
            </Text>
          </TouchableOpacity>
        </View>

        {/* Jobs List */}
        <View style={styles.jobsContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading jobs...
              </Text>
            </View>
          ) : filteredJobs.length > 0 ? (
            filteredJobs.map((job) => (
              <TouchableOpacity
                key={job.id}
                onPress={() => handleJobPress(job)}
                style={[styles.jobCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.jobHeader}>
                  <Text style={[styles.jobTitle, { color: colors.text }]}>{job.title}</Text>
                  <View style={[styles.budgetBadge, { backgroundColor: colors.success + '20' }]}>
                    <DollarSign size={16} color={colors.success} />
                    <Text style={[styles.budgetText, { color: colors.success }]}>
                      ${parseInt(job.budget).toLocaleString()}
                    </Text>
                  </View>
                </View>
                
                <Text style={[styles.jobDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                  {job.description}
                </Text>
                
                <View style={styles.jobDetails}>
                  <View style={styles.detailItem}>
                    <Clock size={14} color={colors.textSecondary} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      {new Date(job.deadline).toLocaleDateString()}
                    </Text>
                  </View>
                  
                  <View style={styles.detailItem}>
                    <MapPin size={14} color={colors.textSecondary} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      {job.isRemote ? 'Remote' : 'On-site'}
                    </Text>
                  </View>
                  
                  <View style={styles.detailItem}>
                    <User size={14} color={colors.textSecondary} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      {job.proposals || 0} proposals
                    </Text>
                  </View>
                </View>
                
                <View style={styles.jobFooter}>
                  <Text style={[styles.clientText, { color: colors.textSecondary }]}>
                    by {job.client}
                  </Text>
                  <TouchableOpacity
                    style={[styles.viewButton, { backgroundColor: colors.primary }]}
                    onPress={() => handleJobPress(job)}
                  >
                    <Eye size={16} color="#fff" />
                    <Text style={styles.viewButtonText}>View</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Briefcase size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Jobs Found</Text>
              <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
                {activeFilter === 'my-jobs' 
                  ? 'You don\'t have any active jobs yet.'
                  : 'No jobs match your current filters.'
                }
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <JobPostingForm
        visible={showJobForm}
        onClose={() => setShowJobForm(false)}
        onSuccess={handleJobPosted}
      />

      <ProposalForm
        visible={showProposalForm}
        onClose={() => setShowProposalForm(false)}
        onSuccess={handleProposalSubmitted}
        jobId={selectedJob?.id || 0}
        jobTitle={selectedJob?.title || ''}
        jobBudget={selectedJob?.budget || '0'}
      />

      {/* Payment Processor - only show when there's valid payment data */}
      <PaymentProcessor
        visible={showPaymentProcessor}
        onClose={() => setShowPaymentProcessor(false)}
        onSuccess={handlePaymentProcessed}
        escrowId={selectedPayment?.escrowId}
        jobId={selectedPayment?.jobId}
        amount={selectedPayment?.amount}
        freelancer={selectedPayment?.freelancer}
        client={selectedPayment?.client}
        status={selectedPayment?.status}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  postButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  jobsContainer: {
    gap: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
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
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  budgetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  budgetText: {
    fontSize: 12,
    fontWeight: '600',
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
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientText: {
    fontSize: 12,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});