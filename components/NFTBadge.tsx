import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Shield, Star } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { NFTBadge as NFTBadgeType } from '@/types';

interface NFTBadgeProps {
  badge: NFTBadgeType;
  size?: 'small' | 'medium' | 'large';
}

export default function NFTBadge({ badge, size = 'medium' }: NFTBadgeProps) {
  const { colors } = useTheme();

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { width: 24, height: 24, borderRadius: 12 };
      case 'large':
        return { width: 64, height: 64, borderRadius: 32 };
      default:
        return { width: 40, height: 40, borderRadius: 20 };
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return '#FFD700';
      case 'epic': return '#9333EA';
      case 'rare': return '#3B82F6';
      default: return '#64748B';
    }
  };

  const sizeStyles = getSizeStyles();
  const rarityColor = getRarityColor(badge.rarity);

  return (
    <View style={styles.container}>
      <View style={[
        styles.badgeContainer,
        sizeStyles,
        { borderColor: rarityColor }
      ]}>
        <Image
          source={{ uri: badge.image }}
          style={[styles.image, sizeStyles]}
          resizeMode="cover"
        />
        {badge.verified && (
          <View style={[styles.verifiedIcon, { backgroundColor: colors.success }]}>
            <Shield size={size === 'small' ? 8 : 12} color="#fff" />
          </View>
        )}
      </View>
      
      {size !== 'small' && (
        <View style={styles.badgeInfo}>
          <Text style={[styles.badgeName, { color: colors.text }]} numberOfLines={1}>
            {badge.name}
          </Text>
          <View style={styles.rarityContainer}>
            <Star size={12} color={rarityColor} fill={rarityColor} />
            <Text style={[styles.rarityText, { color: rarityColor }]}>
              {badge.rarity.toUpperCase()}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  badgeContainer: {
    position: 'relative',
    borderWidth: 2,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  verifiedIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeInfo: {
    marginTop: 8,
    alignItems: 'center',
  },
  badgeName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  rarityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '700',
  },
});