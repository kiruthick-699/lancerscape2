import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FileText, CircleCheck as CheckCircle, Clock, Upload, ThumbsUp, DollarSign, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface TimelineStage {
  id: string;
  title: string;
  status: 'completed' | 'current' | 'pending';
  date?: string;
  details?: string;
}

interface ProjectTimelineProps {
  jobTitle: string;
}

export default function ProjectTimeline({ jobTitle }: ProjectTimelineProps) {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const stages: TimelineStage[] = [
    {
      id: '1',
      title: 'Job Posted',
      status: 'completed',
      date: 'Jan 15, 2025',
      details: 'Project requirements and budget defined',
    },
    {
      id: '2',
      title: 'Proposal Accepted',
      status: 'completed',
      date: 'Jan 16, 2025',
      details: 'Your proposal was selected from 12 submissions',
    },
    {
      id: '3',
      title: 'Work in Progress',
      status: 'current',
      date: 'Jan 17, 2025',
      details: 'Development phase - 60% complete',
    },
    {
      id: '4',
      title: 'Work Submitted',
      status: 'pending',
      details: 'Awaiting completion of development phase',
    },
    {
      id: '5',
      title: 'Client Review',
      status: 'pending',
      details: 'Client will review and provide feedback',
    },
    {
      id: '6',
      title: 'Payment Released',
      status: 'pending',
      details: 'Final payment will be processed',
    },
  ];

  const getStageIcon = (index: number, status: string) => {
    const iconProps = { size: 20, color: getStageColor(status) };
    
    switch (index) {
      case 0: return <FileText {...iconProps} />;
      case 1: return <CheckCircle {...iconProps} />;
      case 2: return <Clock {...iconProps} />;
      case 3: return <Upload {...iconProps} />;
      case 4: return <ThumbsUp {...iconProps} />;
      case 5: return <DollarSign {...iconProps} />;
      default: return <CheckCircle {...iconProps} />;
    }
  };

  const getStageColor = (status: string) => {
    switch (status) {
      case 'completed': return colors.success;
      case 'current': return colors.primary;
      case 'pending': return colors.textSecondary;
      default: return colors.textSecondary;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={[styles.title, { color: colors.text }]}>Project Timeline</Text>
        {isExpanded ? (
          <ChevronUp size={20} color={colors.textSecondary} />
        ) : (
          <ChevronDown size={20} color={colors.textSecondary} />
        )}
      </TouchableOpacity>

      <Text style={[styles.jobTitle, { color: colors.textSecondary }]}>{jobTitle}</Text>

      <View style={styles.timeline}>
        {stages.map((stage, index) => (
          <View key={stage.id} style={styles.stageContainer}>
            <View style={styles.stageLeft}>
              <View style={[
                styles.stageIcon,
                { backgroundColor: getStageColor(stage.status) + '20' }
              ]}>
                {getStageIcon(index, stage.status)}
              </View>
              {index < stages.length - 1 && (
                <View style={[
                  styles.connector,
                  { backgroundColor: stage.status === 'completed' ? colors.success : colors.border }
                ]} />
              )}
            </View>

            <View style={styles.stageContent}>
              <Text style={[styles.stageTitle, { color: getStageColor(stage.status) }]}>
                {stage.title}
              </Text>
              {stage.date && (
                <Text style={[styles.stageDate, { color: colors.textSecondary }]}>
                  {stage.date}
                </Text>
              )}
              {isExpanded && stage.details && (
                <Text style={[styles.stageDetails, { color: colors.textSecondary }]}>
                  {stage.details}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  jobTitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  timeline: {
    paddingLeft: 8,
  },
  stageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stageLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  stageIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connector: {
    width: 2,
    flex: 1,
    marginTop: 8,
  },
  stageContent: {
    flex: 1,
    paddingTop: 8,
  },
  stageTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  stageDate: {
    fontSize: 12,
    marginBottom: 4,
  },
  stageDetails: {
    fontSize: 14,
    lineHeight: 20,
  },
});