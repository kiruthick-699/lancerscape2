import { AccessibilityInfo, Platform } from 'react-native';

// Accessibility levels
export enum AccessibilityLevel {
  A = 'A',
  AA = 'AA',
  AAA = 'AAA',
}

// Accessibility features
export interface AccessibilityFeatures {
  screenReader: boolean;
  highContrast: boolean;
  largeText: boolean;
  reduceMotion: boolean;
  reduceTransparency: boolean;
  boldText: boolean;
  grayscale: boolean;
  invertColors: boolean;
}

// Accessibility configuration
export interface AccessibilityConfig {
  level: AccessibilityLevel;
  enableScreenReader: boolean;
  enableHighContrast: boolean;
  enableLargeText: boolean;
  enableReduceMotion: boolean;
  enableVoiceOver: boolean;
  enableTalkBack: boolean;
}

// Accessibility service class
class AccessibilityService {
  private config: AccessibilityConfig = {
    level: AccessibilityLevel.AA,
    enableScreenReader: true,
    enableHighContrast: true,
    enableLargeText: true,
    enableReduceMotion: true,
    enableVoiceOver: Platform.OS === 'ios',
    enableTalkBack: Platform.OS === 'android',
  };

  private features: AccessibilityFeatures = {
    screenReader: false,
    highContrast: false,
    largeText: false,
    reduceMotion: false,
    reduceTransparency: false,
    boldText: false,
    grayscale: false,
    invertColors: false,
  };

  private listeners: Array<() => void> = [];

  constructor() {
    this.initialize();
  }

  // Initialize accessibility service
  private async initialize() {
    try {
      // Check initial accessibility state
      await this.updateAccessibilityState();
      
      // Set up listeners for accessibility changes
      this.setupListeners();
    } catch (error) {
      console.warn('Accessibility service initialization failed:', error);
    }
  }

  // Set up accessibility change listeners
  private setupListeners() {
    try {
      // Screen reader changes
      const screenReaderListener = AccessibilityInfo.addEventListener(
        'screenReaderChanged',
        this.handleScreenReaderChange.bind(this)
      );

      // High contrast changes
      const highContrastListener = AccessibilityInfo.addEventListener(
        'highContrastChanged',
        this.handleHighContrastChange.bind(this)
      );

      // Reduce motion changes
      const reduceMotionListener = AccessibilityInfo.addEventListener(
        'reduceMotionChanged',
        this.handleReduceMotionChange.bind(this)
      );

      // Bold text changes
      const boldTextListener = AccessibilityInfo.addEventListener(
        'boldTextChanged',
        this.handleBoldTextChange.bind(this)
      );

      // Grayscale changes
      const grayscaleListener = AccessibilityInfo.addEventListener(
        'grayscaleChanged',
        this.handleGrayscaleChange.bind(this)
      );

      // Invert colors changes
      const invertColorsListener = AccessibilityInfo.addEventListener(
        'invertColorsChanged',
        this.handleInvertColorsChange.bind(this)
      );

      // Store listeners for cleanup
      this.listeners = [
        screenReaderListener?.remove || (() => {}),
        highContrastListener?.remove || (() => {}),
        reduceMotionListener?.remove || (() => {}),
        boldTextListener?.remove || (() => {}),
        grayscaleListener?.remove || (() => {}),
        invertColorsListener?.remove || (() => {}),
      ];
    } catch (error) {
      console.warn('Failed to setup accessibility listeners:', error);
    }
  }

  // Update accessibility state
  private async updateAccessibilityState() {
    try {
      const [
        screenReader,
        highContrast,
        reduceMotion,
        reduceTransparency,
        boldText,
        grayscale,
        invertColors,
      ] = await Promise.all([
        AccessibilityInfo.isScreenReaderEnabled(),
        AccessibilityInfo.isHighContrastEnabled(),
        AccessibilityInfo.isReduceMotionEnabled(),
        AccessibilityInfo.isReduceTransparencyEnabled(),
        AccessibilityInfo.isBoldTextEnabled(),
        AccessibilityInfo.isGrayscaleEnabled(),
        AccessibilityInfo.isInvertColorsEnabled(),
      ]);

      this.features = {
        screenReader: screenReader || false,
        highContrast: highContrast || false,
        largeText: false, // Would need to check system font size
        reduceMotion: reduceMotion || false,
        reduceTransparency: reduceTransparency || false,
        boldText: boldText || false,
        grayscale: grayscale || false,
        invertColors: invertColors || false,
      };
    } catch (error) {
      console.warn('Failed to update accessibility state:', error);
    }
  }

  // Event handlers
  private handleScreenReaderChange = (enabled: boolean) => {
    this.features.screenReader = enabled;
    this.notifyAccessibilityChange();
  };

  private handleHighContrastChange = (enabled: boolean) => {
    this.features.highContrast = enabled;
    this.notifyAccessibilityChange();
  };

  private handleReduceMotionChange = (enabled: boolean) => {
    this.features.reduceMotion = enabled;
    this.notifyAccessibilityChange();
  };

  private handleBoldTextChange = (enabled: boolean) => {
    this.features.boldText = enabled;
    this.notifyAccessibilityChange();
  };

  private handleGrayscaleChange = (enabled: boolean) => {
    this.features.grayscale = enabled;
    this.notifyAccessibilityChange();
  };

  private handleInvertColorsChange = (enabled: boolean) => {
    this.features.invertColors = enabled;
    this.notifyAccessibilityChange();
  };

  // Notify accessibility change
  private notifyAccessibilityChange() {
    // This could emit an event or call a callback
    // For now, we'll just log the change
    console.log('Accessibility state changed:', this.features);
  }

  // Get current accessibility features
  getFeatures(): AccessibilityFeatures {
    return { ...this.features };
  }

  // Check if screen reader is enabled
  isScreenReaderEnabled(): boolean {
    return this.features.screenReader;
  }

  // Check if high contrast is enabled
  isHighContrastEnabled(): boolean {
    return this.features.highContrast;
  }

  // Check if reduce motion is enabled
  isReduceMotionEnabled(): boolean {
    return this.features.reduceMotion;
  }

  // Check if large text is enabled
  isLargeTextEnabled(): boolean {
    return this.features.largeText;
  }

  // Get accessibility configuration
  getConfig(): AccessibilityConfig {
    return { ...this.config };
  }

  // Update accessibility configuration
  updateConfig(newConfig: Partial<AccessibilityConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  // Get accessibility props for components
  getAccessibilityProps(
    role: string,
    label: string,
    hint?: string,
    state?: Record<string, any>
  ) {
    const props: any = {
      accessible: true,
      accessibilityRole: role,
      accessibilityLabel: label,
    };

    if (hint) {
      props.accessibilityHint = hint;
    }

    if (state) {
      props.accessibilityState = state;
    }

    // Add platform-specific accessibility props
    if (Platform.OS === 'ios') {
      props.accessibilityTraits = this.getIOSTraits(role);
    } else if (Platform.OS === 'android') {
      props.accessibilityLiveRegion = this.getAndroidLiveRegion(role);
    }

    return props;
  }

  // Get iOS accessibility traits
  private getIOSTraits(role: string): string[] {
    const traitMap: Record<string, string[]> = {
      button: ['button'],
      link: ['link'],
      header: ['header'],
      image: ['image'],
      text: ['text'],
      search: ['search'],
      tab: ['tab'],
      switch: ['switch'],
      slider: ['adjustable'],
      progressbar: ['updatesFrequently'],
    };

    return traitMap[role] || [];
  }

  // Get Android accessibility live region
  private getAndroidLiveRegion(role: string): string {
    const liveRegionMap: Record<string, string> = {
      alert: 'assertive',
      status: 'polite',
      progressbar: 'polite',
      timer: 'polite',
    };

    return liveRegionMap[role] || 'off';
  }

  // Get accessibility announcement
  getAnnouncement(text: string, priority: 'low' | 'normal' | 'high' = 'normal') {
    if (!this.features.screenReader) return;

    try {
      if (Platform.OS === 'ios') {
        // iOS specific announcement
        AccessibilityInfo.announceForAccessibility(text);
      } else if (Platform.OS === 'android') {
        // Android specific announcement
        AccessibilityInfo.announceForAccessibility(text);
      }
    } catch (error) {
      console.warn('Failed to announce accessibility text:', error);
    }
  }

  // Get focus management props
  getFocusProps(
    onFocus?: () => void,
    onBlur?: () => void,
    nextFocusDown?: string,
    nextFocusUp?: string,
    nextFocusLeft?: string,
    nextFocusRight?: string
  ) {
    const props: any = {};

    if (onFocus) props.onFocus = onFocus;
    if (onBlur) props.onBlur = onBlur;

    // Add focus navigation props
    if (nextFocusDown) props.nextFocusDown = nextFocusDown;
    if (nextFocusUp) props.nextFocusUp = nextFocusUp;
    if (nextFocusLeft) props.nextFocusLeft = nextFocusLeft;
    if (nextFocusRight) props.nextFocusRight = nextFocusRight;

    return props;
  }

  // Get color contrast ratio
  getColorContrastRatio(color1: string, color2: string): number {
    try {
      // Convert hex to RGB
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : null;
      };

      const rgb1 = hexToRgb(color1);
      const rgb2 = hexToRgb(color2);

      if (!rgb1 || !rgb2) return 0;

      // Calculate relative luminance
      const getLuminance = (r: number, g: number, b: number) => {
        const [rs, gs, bs] = [r, g, b].map(c => {
          c = c / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      };

      const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
      const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

      // Calculate contrast ratio
      const brightest = Math.max(lum1, lum2);
      const darkest = Math.min(lum1, lum2);
      return (brightest + 0.05) / (darkest + 0.05);
    } catch (error) {
      console.warn('Failed to calculate color contrast:', error);
      return 0;
    }
  }

  // Check if color combination meets accessibility standards
  meetsAccessibilityStandards(
    color1: string,
    color2: string,
    level: AccessibilityLevel = AccessibilityLevel.AA
  ): boolean {
    const contrastRatio = this.getColorContrastRatio(color1, color2);
    
    switch (level) {
      case AccessibilityLevel.A:
        return contrastRatio >= 3.0;
      case AccessibilityLevel.AA:
        return contrastRatio >= 4.5;
      case AccessibilityLevel.AAA:
        return contrastRatio >= 7.0;
      default:
        return contrastRatio >= 4.5;
    }
  }

  // Get accessibility recommendations
  getAccessibilityRecommendations(): string[] {
    const recommendations: string[] = [];

    if (!this.features.screenReader) {
      recommendations.push('Enable screen reader for better accessibility');
    }

    if (!this.features.highContrast) {
      recommendations.push('Enable high contrast for better visibility');
    }

    if (this.features.reduceMotion) {
      recommendations.push('Motion is reduced - ensure animations are minimal');
    }

    if (this.features.boldText) {
      recommendations.push('Bold text is enabled - ensure text remains readable');
    }

    if (this.features.grayscale) {
      recommendations.push('Grayscale is enabled - ensure sufficient contrast');
    }

    if (this.features.invertColors) {
      recommendations.push('Colors are inverted - test color combinations');
    }

    return recommendations;
  }

  // Get accessibility score
  getAccessibilityScore(): number {
    let score = 100;
    const features = this.features;

    // Deduct points for missing accessibility features
    if (!features.screenReader) score -= 20;
    if (!features.highContrast) score -= 15;
    if (features.reduceMotion) score -= 5;
    if (features.boldText) score -= 5;
    if (features.grayscale) score -= 10;
    if (features.invertColors) score -= 10;

    return Math.max(0, score);
  }

  // Cleanup listeners
  cleanup() {
    this.listeners.forEach(remove => {
      try {
        remove();
      } catch (error) {
        console.warn('Failed to remove accessibility listener:', error);
      }
    });
    this.listeners = [];
  }
}

// Export singleton instance
export const accessibilityService = new AccessibilityService();

// Export for direct use
export default accessibilityService;

// Export utility functions
export const getAccessibilityProps = (
  role: string,
  label: string,
  hint?: string,
  state?: Record<string, any>
) => accessibilityService.getAccessibilityProps(role, label, hint, state);

export const announceForAccessibility = (text: string, priority?: 'low' | 'normal' | 'high') =>
  accessibilityService.getAnnouncement(text, priority);

export const meetsContrastStandards = (
  color1: string,
  color2: string,
  level?: AccessibilityLevel
) => accessibilityService.meetsAccessibilityStandards(color1, color2, level);
