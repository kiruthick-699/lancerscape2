import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { Bookmark, MapPin, Calendar, DollarSign, Clock, User, Eye } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Job } from '@/types';

const { width: screenWidth } = Dimensions.get('window');

interface AnimatedJobCardProps {
  job: Job;
  onBookmark?: (jobId: string | number) => void;
  onPress?: () => void;
  index?: number;
  isVisible?: boolean;
}

export default function AnimatedJobCard({ 
  job, 
  onBookmark, 
  onPress, 
  index = 0,
  isVisible = true 
}: AnimatedJobCardProps) {
  const { colors } = useTheme();
  const [isBookmarked, setIsBookmarked] = useState(job.isBookmarked || false);
  const [isPressed, setIsPressed] = useState(false);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(50)).current;
  const bookmarkScale = useRef(new Animated.Value(1)).current;
  const cardElevation = useRef(new Animated.Value(2)).current;
  const categoryPulse = useRef(new Animated.Value(1)).current;

  // Entrance animation
  useEffect(() => {
    if (isVisible) {
      const delay = index * 100;
      
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          delay,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.spring(opacityAnim, {
          toValue: 1,
          delay,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          delay,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();
    }
  }, [isVisible, index, scaleAnim, opacityAnim, translateYAnim]);

  // Category pulse animation
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(categoryPulse, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(categoryPulse, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [categoryPulse]);

  // Press animations
  const handlePressIn = useCallback(() => {
    setIsPressed(true);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
        tension: 200,
        friction: 5,
      }),
      Animated.spring(cardElevation, {
        toValue: 8,
        useNativeDriver: false,
        tension: 200,
        friction: 5,
      }),
    ]).start();
  }, [scaleAnim, cardElevation]);

  const handlePressOut = useCallback(() => {
    setIsPressed(false);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 5,
      }),
      Animated.spring(cardElevation, {
        toValue: 2,
        useNativeDriver: false,
        tension: 200,
        friction: 5,
      }),
    ]).start();
  }, [scaleAnim, cardElevation]);

  // Bookmark animation
  const handleBookmark = useCallback((e: any) => {
    e.stopPropagation();
    
    // Bookmark bounce animation
    Animated.sequence([
      Animated.spring(bookmarkScale, {
        toValue: 1.3,
        useNativeDriver: true,
        tension: 200,
        friction: 5,
      }),
      Animated.spring(bookmarkScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 5,
      }),
    ]).start();

    try {
      setIsBookmarked(!isBookmarked);
      onBookmark?.(job.id);
    } catch (error) {
      Alert.alert('Error', 'Failed to bookmark job. Please try again.');
    }
  }, [isBookmarked, onBookmark, job.id, bookmarkScale]);

  const handlePress = useCallback(() => {
    try {
      onPress?.();
    } catch (error) {
      Alert.alert('Error', 'Failed to open job details. Please try again.');
    }
  }, [onPress]);

  // Utility functions
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

  // Check if deadline is urgent (within 3 days)
  const isUrgent = (() => {
    try {
      const date = typeof job.deadline === 'string' ? new Date(job.deadline) : new Date(job.deadline);
      if (isNaN(date.getTime())) return false;
      
      const now = new Date();
      const diffTime = date.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays >= 0 && diffDays <= 3;
    } catch (error) {
      return false;
    }
  })();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { scale: scaleAnim },
            { translateY: translateYAnim },
          ],
          opacity: opacityAnim,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          elevation: cardElevation,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.touchable}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={`Job: ${job.title}, Budget: ${budgetText}, Deadline: ${deadlineText}`}
        accessibilityHint="Double tap to view job details"
      >
        {/* Header with Category and Bookmark */}
        <View style={styles.header}>
          <Animated.View 
            style={[
              styles.categoryBadge, 
              { 
                backgroundColor: categoryColor + '20',
                transform: [{ scale: categoryPulse }],
              }
            ]}
          >
            <Text style={[styles.categoryText, { color: categoryColor }]}>
              {categoryName.toUpperCase()}
            </Text>
          </Animated.View>
          
          <View style={styles.headerActions}>
            {isUrgent && (
              <View style={[styles.urgentBadge, { backgroundColor: colors.error }]}>
                <Clock size={12} color="white" />
                <Text style={styles.urgentText}>URGENT</Text>
              </View>
            )}
            
            <TouchableOpacity 
              onPress={handleBookmark} 
              style={styles.bookmarkButton}
              accessibilityRole="button"
              accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
              accessibilityHint="Double tap to bookmark this job"
            >
              <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
                <Bookmark
                  size={20}
                  color={isBookmarked ? colors.warning : colors.textSecondary}
                  fill={isBookmarked ? colors.warning : 'transparent'}
                />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Job Title */}
        <Text 
          style={[styles.title, { color: colors.text }]}
          numberOfLines={2}
          accessibilityRole="header"
        >
          {job.title}
        </Text>
        
        {/* Job Description */}
        <Text 
          style={[styles.description, { color: colors.textSecondary }]} 
          numberOfLines={2}
          accessibilityRole="text"
        >
          {job.description}
        </Text>

        {/* Job Details Grid */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <View style={[styles.detailIcon, { backgroundColor: colors.success + '20' }]}>
              <DollarSign size={16} color={colors.success} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Budget</Text>
              <Text style={[styles.detailText, { color: colors.success }]}>
                {budgetText}
              </Text>
            </View>
          </View>
          
          <View style={styles.detailItem}>
            <View style={[styles.detailIcon, { backgroundColor: colors.warning + '20' }]}>
              <Calendar size={16} color={colors.warning} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Deadline</Text>
              <Text style={[styles.detailText, { color: isUrgent ? colors.error : colors.textSecondary }]}>
                {deadlineText}
              </Text>
            </View>
          </View>
          
          <View style={styles.detailItem}>
            <View style={[styles.detailIcon, { backgroundColor: colors.primary + '20' }]}>
              <MapPin size={16} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Location</Text>
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                {locationText}
              </Text>
            </View>
          </View>
        </View>

        {/* Proposals and Client Info */}
        <View style={styles.footer}>
          {job.proposals !== undefined && (
            <View style={styles.proposalsContainer}>
              <Eye size={14} color={colors.textSecondary} />
              <Text style={[styles.proposalsText, { color: colors.textSecondary }]}>
                {job.proposals} proposal{job.proposals !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
          
          <View style={styles.clientContainer}>
            <User size={14} color={colors.textSecondary} />
            <Text style={[styles.client, { color: colors.textSecondary }]}>
              by {job.client}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  touchable: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  urgentText: {
    fontSize: 8,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  bookmarkButton: {
    padding: 8,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
    color: '#6B7280',
  },
  detailsGrid: {
    gap: 16,
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  proposalsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  proposalsText: {
    fontSize: 13,
    fontWeight: '500',
  },
  clientContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  client: {
    fontSize: 13,
    fontWeight: '500',
  },
});
