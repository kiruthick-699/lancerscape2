import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, StyleSheet } from 'react-native';
import { Bookmark, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import TopNavBar from '@/components/TopNavBar';
import JobCard from '@/components/JobCard';
import { mockJobs } from '@/data/mockData';

export default function BookmarksScreen() {
  const { colors } = useTheme();
  const [bookmarkedJobs, setBookmarkedJobs] = useState(
    mockJobs.filter(job => job.isBookmarked)
  );

  const removeBookmark = (jobId: string) => {
    setBookmarkedJobs(prev => prev.filter(job => job.id !== jobId));
  };

  const clearAllBookmarks = () => {
    setBookmarkedJobs([]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TopNavBar />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Bookmarks</Text>
          {bookmarkedJobs.length > 0 && (
            <TouchableOpacity
              style={[styles.clearButton, { backgroundColor: colors.error }]}
              onPress={clearAllBookmarks}
            >
              <Trash2 size={16} color="#fff" />
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {bookmarkedJobs.length > 0 ? (
          <>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {bookmarkedJobs.length} saved job{bookmarkedJobs.length !== 1 ? 's' : ''}
            </Text>
            
            {bookmarkedJobs.map((job) => (
              <View key={job.id} style={styles.jobContainer}>
                <JobCard job={job} />
                <TouchableOpacity
                  style={[styles.removeButton, { backgroundColor: colors.error }]}
                  onPress={() => removeBookmark(job.id)}
                >
                  <Trash2 size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </>
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Bookmark size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Bookmarks</Text>
            <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
              Jobs you bookmark will appear here
            </Text>
          </View>
        )}
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
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  jobContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  removeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    borderRadius: 8,
    zIndex: 1,
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