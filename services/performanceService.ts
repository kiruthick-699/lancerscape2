import { InteractionManager, Platform } from 'react-native';
import { Image } from 'expo-image';

// Performance metrics interface
export interface PerformanceMetrics {
  componentRenderTime: number;
  imageLoadTime: number;
  navigationTime: number;
  memoryUsage: number;
  frameRate: number;
  timestamp: Date;
}

// Performance configuration
export interface PerformanceConfig {
  enableLazyLoading: boolean;
  enableImageOptimization: boolean;
  enablePerformanceMonitoring: boolean;
  enableMemoryOptimization: boolean;
  enableFrameRateMonitoring: boolean;
  lazyLoadThreshold: number;
  imageCacheSize: number;
  maxConcurrentImages: number;
}

// Performance service class
class PerformanceService {
  private config: PerformanceConfig = {
    enableLazyLoading: true,
    enableImageOptimization: true,
    enablePerformanceMonitoring: true,
    enableMemoryOptimization: true,
    enableFrameRateMonitoring: true,
    lazyLoadThreshold: 100, // pixels from viewport
    imageCacheSize: 50, // MB
    maxConcurrentImages: 3,
  };

  private metrics: PerformanceMetrics[] = [];
  private maxMetricsHistory = 100;
  private performanceObservers: Map<string, PerformanceObserver> = new Map();
  private imageCache: Map<string, { data: any; timestamp: number; size: number }> = new Map();

  constructor() {
    this.initialize();
  }

  // Initialize performance service
  private initialize() {
    try {
      if (this.config.enablePerformanceMonitoring) {
        this.setupPerformanceMonitoring();
      }

      if (this.config.enableImageOptimization) {
        this.setupImageOptimization();
      }

      if (this.config.enableMemoryOptimization) {
        this.setupMemoryOptimization();
      }
    } catch (error) {
      console.warn('Performance service initialization failed:', error);
    }
  }

  // Setup performance monitoring
  private setupPerformanceMonitoring() {
    try {
      // Monitor component render times
      this.observeComponentPerformance();
      
      // Monitor navigation performance
      this.observeNavigationPerformance();
      
      // Monitor frame rate
      if (this.config.enableFrameRateMonitoring) {
        this.observeFrameRate();
      }
    } catch (error) {
      console.warn('Failed to setup performance monitoring:', error);
    }
  }

  // Setup image optimization
  private setupImageOptimization() {
    try {
      // Configure image cache
      this.configureImageCache();
      
      // Setup image preloading
      this.setupImagePreloading();
    } catch (error) {
      console.warn('Failed to setup image optimization:', error);
    }
  }

  // Setup memory optimization
  private setupMemoryOptimization() {
    try {
      // Monitor memory usage
      this.observeMemoryUsage();
      
      // Setup garbage collection triggers
      this.setupGarbageCollection();
    } catch (error) {
      console.warn('Failed to setup memory optimization:', error);
    }
  }

  // Observe component performance
  private observeComponentPerformance() {
    // This would integrate with React DevTools or custom performance hooks
    // For now, we'll provide a manual measurement method
  }

  // Observe navigation performance
  private observeNavigationPerformance() {
    // This would integrate with React Navigation or Expo Router
    // For now, we'll provide a manual measurement method
  }

  // Observe frame rate
  private observeFrameRate() {
    try {
      if (Platform.OS === 'web') {
        // Web frame rate monitoring
        let lastTime = performance.now();
        let frameCount = 0;
        
        const measureFrameRate = () => {
          frameCount++;
          const currentTime = performance.now();
          
          if (currentTime - lastTime >= 1000) {
            const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
            this.recordMetric('frameRate', fps);
            
            frameCount = 0;
            lastTime = currentTime;
          }
          
          requestAnimationFrame(measureFrameRate);
        };
        
        requestAnimationFrame(measureFrameRate);
      }
    } catch (error) {
      console.warn('Failed to setup frame rate monitoring:', error);
    }
  }

  // Observe memory usage
  private observeMemoryUsage() {
    try {
      if (Platform.OS === 'web' && 'memory' in performance) {
        const memoryInfo = (performance as any).memory;
        
        setInterval(() => {
          const usedMemory = memoryInfo.usedJSHeapSize / (1024 * 1024); // MB
          this.recordMetric('memoryUsage', usedMemory);
          
          // Trigger garbage collection if memory usage is high
          if (usedMemory > this.config.imageCacheSize * 2) {
            this.triggerGarbageCollection();
          }
        }, 5000); // Check every 5 seconds
      }
    } catch (error) {
      console.warn('Failed to setup memory monitoring:', error);
    }
  }

  // Setup garbage collection
  private setupGarbageCollection() {
    try {
      if (Platform.OS === 'web') {
        // Web garbage collection
        setInterval(() => {
          this.triggerGarbageCollection();
        }, 30000); // Every 30 seconds
      }
    } catch (error) {
      console.warn('Failed to setup garbage collection:', error);
    }
  }

  // Configure image cache
  private configureImageCache() {
    try {
      // Set up image cache configuration
      if (Platform.OS === 'web') {
        // Web image cache configuration
        const cache = 'image-cache-v1';
        caches.open(cache).then(cacheInstance => {
          // Configure cache size and policies
        });
      }
    } catch (error) {
      console.warn('Failed to configure image cache:', error);
    }
  }

  // Setup image preloading
  private setupImagePreloading() {
    try {
      // Preload critical images
      const criticalImages = [
        // Add critical image URLs here
      ];
      
      criticalImages.forEach(url => {
        this.preloadImage(url);
      });
    } catch (error) {
      console.warn('Failed to setup image preloading:', error);
    }
  }

  // Record performance metric
  recordMetric(type: keyof PerformanceMetrics, value: number) {
    try {
      const metric: PerformanceMetrics = {
        componentRenderTime: type === 'componentRenderTime' ? value : 0,
        imageLoadTime: type === 'imageLoadTime' ? value : 0,
        navigationTime: type === 'navigationTime' ? value : 0,
        memoryUsage: type === 'memoryUsage' ? value : 0,
        frameRate: type === 'frameRate' ? value : 0,
        timestamp: new Date(),
      };

      this.metrics.push(metric);

      // Keep metrics history manageable
      if (this.metrics.length > this.maxMetricsHistory) {
        this.metrics = this.metrics.slice(-this.maxMetricsHistory);
      }

      // Log significant performance issues
      this.logPerformanceIssues(metric);
    } catch (error) {
      console.warn('Failed to record performance metric:', error);
    }
  }

  // Log performance issues
  private logPerformanceIssues(metric: PerformanceMetrics) {
    try {
      if (metric.componentRenderTime > 100) {
        console.warn('Slow component render detected:', metric.componentRenderTime + 'ms');
      }

      if (metric.imageLoadTime > 2000) {
        console.warn('Slow image load detected:', metric.imageLoadTime + 'ms');
      }

      if (metric.navigationTime > 500) {
        console.warn('Slow navigation detected:', metric.navigationTime + 'ms');
      }

      if (metric.frameRate < 30) {
        console.warn('Low frame rate detected:', metric.frameRate + 'fps');
      }

      if (metric.memoryUsage > 100) {
        console.warn('High memory usage detected:', metric.memoryUsage + 'MB');
      }
    } catch (error) {
      console.warn('Failed to log performance issues:', error);
    }
  }

  // Measure component render time
  measureComponentRender(componentName: string, startTime: number) {
    try {
      const renderTime = performance.now() - startTime;
      this.recordMetric('componentRenderTime', renderTime);
      
      return renderTime;
    } catch (error) {
      console.warn('Failed to measure component render time:', error);
      return 0;
    }
  }

  // Measure image load time
  measureImageLoad(imageUrl: string, startTime: number) {
    try {
      const loadTime = performance.now() - startTime;
      this.recordMetric('imageLoadTime', loadTime);
      
      return loadTime;
    } catch (error) {
      console.warn('Failed to measure image load time:', error);
      return 0;
    }
  }

  // Measure navigation time
  measureNavigation(routeName: string, startTime: number) {
    try {
      const navigationTime = performance.now() - startTime;
      this.recordMetric('navigationTime', navigationTime);
      
      return navigationTime;
    } catch (error) {
      console.warn('Failed to measure navigation time:', error);
      return 0;
    }
  }

  // Lazy load component
  lazyLoadComponent<T extends React.ComponentType<any>>(
    importFunc: () => Promise<{ default: T }>,
    fallback?: React.ComponentType
  ): React.ComponentType<any> {
    try {
      if (!this.config.enableLazyLoading) {
        // Return synchronous component if lazy loading is disabled
        return importFunc().then(module => module.default);
      }

      const LazyComponent = React.lazy(importFunc);
      
      if (fallback) {
        return (props: any) => (
          <React.Suspense fallback={<fallback {...props} />}>
            <LazyComponent {...props} />
          </React.Suspense>
        );
      }
      
      return LazyComponent;
    } catch (error) {
      console.warn('Failed to lazy load component:', error);
      // Return fallback or error component
      return fallback || (() => null);
    }
  }

  // Optimize image loading
  optimizeImage(
    imageUrl: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'webp' | 'jpeg' | 'png';
      placeholder?: string;
    } = {}
  ): string {
    try {
      if (!this.config.enableImageOptimization) {
        return imageUrl;
      }

      // Add optimization parameters to URL
      const url = new URL(imageUrl);
      const params = new URLSearchParams();
      
      if (options.width) params.append('w', options.width.toString());
      if (options.height) params.append('h', options.height.toString());
      if (options.quality) params.append('q', options.quality.toString());
      if (options.format) params.append('f', options.format);
      
      if (params.toString()) {
        url.search = params.toString();
      }
      
      return url.toString();
    } catch (error) {
      console.warn('Failed to optimize image:', error);
      return imageUrl;
    }
  }

  // Preload image
  preloadImage(imageUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (Platform.OS === 'web') {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Image preload failed'));
          img.src = imageUrl;
        } else {
          // Native image preloading
          Image.prefetch(imageUrl)
            .then(() => resolve())
            .catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  // Cache image
  cacheImage(key: string, data: any, size: number = 0) {
    try {
      const timestamp = Date.now();
      
      // Remove old entries if cache is full
      if (this.imageCache.size >= this.config.maxConcurrentImages) {
        const oldestKey = Array.from(this.imageCache.keys())[0];
        this.imageCache.delete(oldestKey);
      }
      
      this.imageCache.set(key, { data, timestamp, size });
    } catch (error) {
      console.warn('Failed to cache image:', error);
    }
  }

  // Get cached image
  getCachedImage(key: string): any | null {
    try {
      const cached = this.imageCache.get(key);
      if (cached) {
        // Update timestamp for LRU
        cached.timestamp = Date.now();
        return cached.data;
      }
      return null;
    } catch (error) {
      console.warn('Failed to get cached image:', error);
      return null;
    }
  }

  // Clear image cache
  clearImageCache() {
    try {
      this.imageCache.clear();
    } catch (error) {
      console.warn('Failed to clear image cache:', error);
    }
  }

  // Trigger garbage collection
  private triggerGarbageCollection() {
    try {
      if (Platform.OS === 'web') {
        // Web garbage collection
        if ('gc' in window) {
          (window as any).gc();
        }
      }
      
      // Clear old cache entries
      const now = Date.now();
      const maxAge = 5 * 60 * 1000; // 5 minutes
      
      for (const [key, value] of this.imageCache.entries()) {
        if (now - value.timestamp > maxAge) {
          this.imageCache.delete(key);
        }
      }
    } catch (error) {
      console.warn('Failed to trigger garbage collection:', error);
    }
  }

  // Get performance report
  getPerformanceReport(): {
    summary: {
      totalMetrics: number;
      averageRenderTime: number;
      averageImageLoadTime: number;
      averageNavigationTime: number;
      averageFrameRate: number;
      averageMemoryUsage: number;
    };
    recommendations: string[];
  } {
    try {
      if (this.metrics.length === 0) {
        return {
          summary: {
            totalMetrics: 0,
            averageRenderTime: 0,
            averageImageLoadTime: 0,
            averageNavigationTime: 0,
            averageFrameRate: 0,
            averageMemoryUsage: 0,
          },
          recommendations: ['No performance data available'],
        };
      }

      const summary = {
        totalMetrics: this.metrics.length,
        averageRenderTime: this.getAverageMetric('componentRenderTime'),
        averageImageLoadTime: this.getAverageMetric('imageLoadTime'),
        averageNavigationTime: this.getAverageMetric('navigationTime'),
        averageFrameRate: this.getAverageMetric('frameRate'),
        averageMemoryUsage: this.getAverageMetric('memoryUsage'),
      };

      const recommendations = this.generateRecommendations(summary);

      return { summary, recommendations };
    } catch (error) {
      console.warn('Failed to generate performance report:', error);
      return {
        summary: {
          totalMetrics: 0,
          averageRenderTime: 0,
          averageImageLoadTime: 0,
          averageNavigationTime: 0,
          averageFrameRate: 0,
          averageMemoryUsage: 0,
        },
        recommendations: ['Failed to generate performance report'],
      };
    }
  }

  // Get average metric value
  private getAverageMetric(key: keyof PerformanceMetrics): number {
    try {
      const values = this.metrics
        .map(m => m[key])
        .filter(v => typeof v === 'number' && v > 0);
      
      if (values.length === 0) return 0;
      
      const sum = values.reduce((acc, val) => acc + val, 0);
      return Math.round(sum / values.length);
    } catch (error) {
      return 0;
    }
  }

  // Generate performance recommendations
  private generateRecommendations(summary: any): string[] {
    const recommendations: string[] = [];

    if (summary.averageRenderTime > 50) {
      recommendations.push('Consider optimizing component rendering performance');
    }

    if (summary.averageImageLoadTime > 1000) {
      recommendations.push('Implement image optimization and lazy loading');
    }

    if (summary.averageNavigationTime > 300) {
      recommendations.push('Optimize navigation transitions and route loading');
    }

    if (summary.averageFrameRate < 50) {
      recommendations.push('Reduce complex animations and optimize rendering');
    }

    if (summary.averageMemoryUsage > 50) {
      recommendations.push('Implement memory optimization and cleanup strategies');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is within acceptable limits');
    }

    return recommendations;
  }

  // Get configuration
  getConfig(): PerformanceConfig {
    return { ...this.config };
  }

  // Update configuration
  updateConfig(newConfig: Partial<PerformanceConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  // Cleanup
  cleanup() {
    try {
      // Clear performance observers
      this.performanceObservers.forEach(observer => {
        observer.disconnect();
      });
      this.performanceObservers.clear();

      // Clear metrics
      this.metrics = [];

      // Clear image cache
      this.clearImageCache();
    } catch (error) {
      console.warn('Failed to cleanup performance service:', error);
    }
  }
}

// Export singleton instance
export const performanceService = new PerformanceService();

// Export for direct use
export default performanceService;

// Export utility functions
export const measureComponentRender = (componentName: string, startTime: number) =>
  performanceService.measureComponentRender(componentName, startTime);

export const measureImageLoad = (imageUrl: string, startTime: number) =>
  performanceService.measureImageLoad(imageUrl, startTime);

export const measureNavigation = (routeName: string, startTime: number) =>
  performanceService.measureNavigation(routeName, startTime);

export const lazyLoadComponent = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) => performanceService.lazyLoadComponent(importFunc, fallback);

export const optimizeImage = (imageUrl: string, options?: any) =>
  performanceService.optimizeImage(imageUrl, options);

export const preloadImage = (imageUrl: string) =>
  performanceService.preloadImage(imageUrl);
