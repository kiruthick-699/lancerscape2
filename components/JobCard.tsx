import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Bookmark, MapPin, Calendar, DollarSign } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Job } from '@/types';

interface JobCardProps {
  job: Job;
  onBookmark?: (jobId: string | number) => void;
  onPress?: () => void;
}

export default function JobCard({ job, onBookmark, onPress }: JobCardProps) {
  const { colors } = useTheme();
  const [isBookmarked, setIsBookmarked] = useState(job.isBookmarked || false);

  const handleBookmark = useCallback((e: any) => {
    e.stopPropagation(); // Prevent triggering onPress when bookmarking
    try {
      setIsBookmarked(!isBookmarked);
      onBookmark?.(job.id);
    } catch (error) {
      Alert.alert('Error', 'Failed to bookmark job. Please try again.');
    }
  }, [isBookmarked, onBookmark, job.id]);

  const handlePress = useCallback(() => {
    try {
      onPress?.();
    } catch (error) {
      Alert.alert('Error', 'Failed to open job details. Please try again.');
    }
  }, [onPress]);

  const getCategoryColor = useCallback((category: string | number): string => {
    if (typeof category === 'number') {
      const categories = ['#F59E0B', '#10B981', '#8B5CF6', '#EF4444', '#6B7280'];
      return categories[category] || colors.primary;
    }
    
    switch (category.toLowerCase()) {
      case 'design': return '#F59E0B';
      case 'dev': 
      case 'development': return '#10B981';
      case 'writing': return '#8B5CF6';
      case 'marketing': return '#EF4444';
      default: return colors.primary;
    }
  }, [colors.primary]);

  const getCategoryName = useCallback((category: string | number): string => {
    if (typeof category === 'number') {
      const categories = ['Design', 'Development', 'Writing', 'Marketing', 'Other'];
      return categories[category] || 'Other';
    }
    return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  }, []);

  const formatBudget = useCallback((budget: string | number): string => {
    try {
      if (typeof budget === 'string') {
        const numBudget = parseInt(budget);
        if (isNaN(numBudget)) return '$0';
        return `$${numBudget.toLocaleString()}`;
      }
      return `$${budget.toLocaleString()}`;
    } catch (error) {
      return '$0';
    }
  }, []);

  const formatDeadline = useCallback((deadline: string | number): string => {
    try {
      const date = typeof deadline === 'string' ? new Date(deadline) : new Date(deadline);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      const now = new Date();
      const diffTime = date.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return 'Overdue';
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays <= 7) return `${diffDays} days`;
      
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid date';
    }
  }, []);

  const getLocationText = useCallback((): string => {
    if (job.isRemote) return 'Remote';
    if (job.location && job.location !== 'remote' && job.location !== 'local') {
      return job.location;
    }
    return 'On-site';
  }, [job.isRemote, job.location]);

  const categoryColor = getCategoryColor(job.category);
  const categoryName = getCategoryName(job.category);
  const budgetText = formatBudget(job.budget);
  const deadlineText = formatDeadline(job.deadline);
  const locationText = getLocationText();

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Job: ${job.title}, Budget: ${budgetText}, Deadline: ${deadlineText}`}
      accessibilityHint="Double tap to view job details"
    >
      <View style={styles.header}>
        <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
          <Text style={[styles.categoryText, { color: categoryColor }]}>
            {categoryName.toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={handleBookmark} 
          style={styles.bookmarkButton}
          accessibilityRole="button"
          accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
          accessibilityHint="Double tap to bookmark this job"
        >
          <Bookmark
            size={20}
            color={isBookmarked ? colors.warning : colors.textSecondary}
            fill={isBookmarked ? colors.warning : 'transparent'}
          />
        </TouchableOpacity>
      </View>

      <Text 
        style={[styles.title, { color: colors.text }]}
        numberOfLines={2}
        accessibilityRole="header"
      >
        {job.title}
      </Text>
      
      <Text 
        style={[styles.description, { color: colors.textSecondary }]} 
        numberOfLines={2}
        accessibilityRole="text"
      >
        {job.description}
      </Text>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <DollarSign size={16} color={colors.success} />
          <Text style={[styles.detailText, { color: colors.success }]}>
            {budgetText}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Calendar size={16} color={colors.textSecondary} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {deadlineText}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <MapPin size={16} color={colors.textSecondary} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {locationText}
          </Text>
        </View>
      </View>

      {job.proposals !== undefined && (
        <View style={styles.proposalsContainer}>
          <Text style={[styles.proposalsText, { color: colors.textSecondary }]}>
            {job.proposals} proposal{job.proposals !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      <Text style={[styles.client, { color: colors.textSecondary }]}>
        by {job.client}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  bookmarkButton: {
    padding: 4,
    borderRadius: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 22,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  details: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 60,
  },
  detailText: {
    fontSize: 12,
    fontWeight: '500',
  },
  proposalsContainer: {
    marginBottom: 8,
  },
  proposalsText: {
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  client: {
    fontSize: 12,
    fontWeight: '500',
  },
});