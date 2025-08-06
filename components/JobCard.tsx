import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Bookmark, MapPin, Calendar, DollarSign } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Job } from '@/types';

interface JobCardProps {
  job: Job;
  onBookmark?: (jobId: string) => void;
  onPress?: () => void;
}

export default function JobCard({ job, onBookmark, onPress }: JobCardProps) {
  const { colors } = useTheme();
  const [isBookmarked, setIsBookmarked] = useState(job.isBookmarked || false);

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    onBookmark?.(job.id);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'design': return '#F59E0B';
      case 'dev': return '#10B981';
      case 'writing': return '#8B5CF6';
      default: return colors.primary;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(job.category) + '20' }]}>
          <Text style={[styles.categoryText, { color: getCategoryColor(job.category) }]}>
            {job.category.toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity onPress={handleBookmark} style={styles.bookmarkButton}>
          <Bookmark
            size={20}
            color={isBookmarked ? colors.warning : colors.textSecondary}
            fill={isBookmarked ? colors.warning : 'transparent'}
          />
        </TouchableOpacity>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{job.title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
        {job.description}
      </Text>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <DollarSign size={16} color={colors.success} />
          <Text style={[styles.detailText, { color: colors.success }]}>
            ${job.budget.toLocaleString()}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Calendar size={16} color={colors.textSecondary} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {new Date(job.deadline).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <MapPin size={16} color={colors.textSecondary} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {job.location}
          </Text>
        </View>
      </View>

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
    fontSize: 12,
    fontWeight: '600',
  },
  bookmarkButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '500',
  },
  client: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});