import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { X, DollarSign, Calendar, MapPin, Briefcase } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useWallet } from '@/contexts/WalletContext';
import web3Service from '@/services/web3Service';

interface JobPostingFormProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (jobId: number) => void;
}

interface JobFormData {
  title: string;
  description: string;
  budget: string;
  deadline: string;
  category: number;
  isRemote: boolean;
}

const categories = [
  { id: 0, name: 'Design', icon: '🎨' },
  { id: 1, name: 'Development', icon: '💻' },
  { id: 2, name: 'Writing', icon: '✍️' },
  { id: 3, name: 'Marketing', icon: '📢' },
  { id: 4, name: 'Other', icon: '🔧' },
];

export default function JobPostingForm({ visible, onClose, onSuccess }: JobPostingFormProps) {
  const { colors } = useTheme();
  const { isConnected, walletAddress } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    description: '',
    budget: '',
    deadline: '',
    category: 0,
    isRemote: false,
  });

  const handleSubmit = async () => {
    if (!isConnected) {
      Alert.alert('Wallet Required', 'Please connect your wallet to post a job.');
      return;
    }

    if (!formData.title || !formData.description || !formData.budget || !formData.deadline) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Convert budget to wei
      const budgetInWei = web3Service.parseEther(formData.budget);
      
      // Convert deadline to timestamp
      const deadlineTimestamp = Math.floor(new Date(formData.deadline).getTime() / 1000);

      // Post job to blockchain
      const jobId = await web3Service.postJob(
        formData.title,
        formData.description,
        budgetInWei.toString(),
        deadlineTimestamp,
        formData.category,
        formData.isRemote
      );

      Alert.alert(
        'Job Posted Successfully!',
        `Your job has been posted with ID: ${jobId}`,
        [
          {
            text: 'OK',
            onPress: () => {
              onSuccess(jobId);
              handleClose();
            }
          }
        ]
      );

    } catch (error) {
      console.error('Job posting failed:', error);
      Alert.alert(
        'Posting Failed',
        error instanceof Error ? error.message : 'Failed to post job. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      budget: '',
      deadline: '',
      category: 0,
      isRemote: false,
    });
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: colors.background + 'CC' }]}>
      <View style={[styles.modal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Post New Job</Text>
          <TouchableOpacity onPress={handleClose} disabled={isSubmitting}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Wallet Status */}
          {!isConnected && (
            <View style={[styles.warning, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}>
              <Text style={[styles.warningText, { color: colors.warning }]}>
                Connect your wallet to post jobs
              </Text>
            </View>
          )}

          {/* Job Title */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Job Title *</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.background, 
                borderColor: colors.border,
                color: colors.text 
              }]}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              placeholder="e.g., Build a React Native App"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Job Description */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Description *</Text>
            <TextInput
              style={[styles.textArea, { 
                backgroundColor: colors.background, 
                borderColor: colors.border,
                color: colors.text 
              }]}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Describe the job requirements, deliverables, and expectations..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {/* Budget */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Budget (ETH) *</Text>
            <View style={[styles.inputContainer, { 
              backgroundColor: colors.background, 
              borderColor: colors.border 
            }]}>
              <DollarSign size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text, flex: 1 }]}
                value={formData.budget}
                onChangeText={(text) => setFormData({ ...formData, budget: text })}
                placeholder="0.1"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Deadline */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Deadline *</Text>
            <View style={[styles.inputContainer, { 
              backgroundColor: colors.background, 
              borderColor: colors.border 
            }]}>
              <Calendar size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text, flex: 1 }]}
                value={formData.deadline}
                onChangeText={(text) => setFormData({ ...formData, deadline: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Category</Text>
            <View style={styles.categoryGrid}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    { 
                      backgroundColor: formData.category === category.id 
                        ? colors.primary 
                        : colors.background,
                      borderColor: colors.border 
                    }
                  ]}
                  onPress={() => setFormData({ ...formData, category: category.id })}
                >
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text style={[
                    styles.categoryText,
                    { color: formData.category === category.id ? '#fff' : colors.text }
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Remote Work */}
          <View style={styles.field}>
            <TouchableOpacity
              style={styles.remoteToggle}
              onPress={() => setFormData({ ...formData, isRemote: !formData.isRemote })}
            >
              <MapPin size={20} color={formData.isRemote ? colors.primary : colors.textSecondary} />
              <Text style={[styles.remoteText, { color: colors.text }]}>
                Remote work allowed
              </Text>
              <View style={[
                styles.toggle,
                { backgroundColor: formData.isRemote ? colors.primary : colors.border }
              ]}>
                <View style={[
                  styles.toggleHandle,
                  { 
                    backgroundColor: '#fff',
                    transform: [{ translateX: formData.isRemote ? 16 : 0 }]
                  }
                ]} />
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              { 
                backgroundColor: isConnected ? colors.primary : colors.border,
                opacity: isSubmitting ? 0.7 : 1
              }
            ]}
            onPress={handleSubmit}
            disabled={!isConnected || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Briefcase size={20} color="#fff" />
                <Text style={styles.submitText}>Post Job</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    padding: 20,
  },
  warning: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  textArea: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    height: 120,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  remoteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  remoteText: {
    flex: 1,
    fontSize: 16,
  },
  toggle: {
    width: 40,
    height: 24,
    borderRadius: 12,
    padding: 2,
  },
  toggleHandle: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 