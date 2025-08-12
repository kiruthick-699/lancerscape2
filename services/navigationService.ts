import { router, Link } from 'expo-router';
import { Platform } from 'react-native';

// Navigation route definitions
export const ROUTES = {
  // Main tabs
  DASHBOARD: '/(tabs)',
  JOBS: '/(tabs)/jobs',
  BOOKMARKS: '/(tabs)/bookmarks',
  CHAT: '/(tabs)/chat',
  PROFILE: '/(tabs)/profile',
  
  // Auth routes
  LOGIN: '/login',
  REGISTER: '/register',
  
  // Job routes
  JOB_DETAILS: '/job/[id]',
  JOB_POSTING: '/job/post',
  JOB_EDIT: '/job/[id]/edit',
  
  // Proposal routes
  PROPOSAL_SUBMIT: '/job/[id]/propose',
  PROPOSAL_DETAILS: '/proposal/[id]',
  
  // User routes
  USER_PROFILE: '/user/[id]',
  USER_SETTINGS: '/settings',
  USER_EDIT: '/profile/edit',
  
  // Payment routes
  PAYMENT: '/payment/[id]',
  PAYMENT_HISTORY: '/payments',
  
  // Chat routes
  CHAT_ROOM: '/chat/[id]',
  
  // Admin routes
  ADMIN_DASHBOARD: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_JOBS: '/admin/jobs',
} as const;

// Route parameters interface
export interface RouteParams {
  [key: string]: string | number;
}

// Navigation options interface
export interface NavigationOptions {
  replace?: boolean;
  reset?: boolean;
  params?: RouteParams;
  animation?: 'slide' | 'fade' | 'none';
}

// Deep link configuration
export const DEEP_LINKS = {
  // Job deep links
  'job/:id': {
    route: ROUTES.JOB_DETAILS,
    parse: (params: string[]) => ({ id: params[0] }),
  },
  'user/:id': {
    route: ROUTES.USER_PROFILE,
    parse: (params: string[]) => ({ id: params[0] }),
  },
  'proposal/:id': {
    route: ROUTES.PROPOSAL_DETAILS,
    parse: (params: string[]) => ({ id: params[0] }),
  },
} as const;

// Navigation service class
class NavigationService {
  // Navigate to a route
  navigate(route: string, options: NavigationOptions = {}) {
    try {
      if (options.replace) {
        router.replace(route as any);
      } else if (options.reset) {
        router.replace(route as any);
      } else {
        router.push(route as any);
      }
    } catch (error) {
      console.error('Navigation failed:', error);
      // Fallback to basic navigation
      router.push(route as any);
    }
  }

  // Navigate back
  goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      // Fallback to dashboard if can't go back
      this.navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }

  // Navigate to job details
  navigateToJob(jobId: string | number, options: NavigationOptions = {}) {
    const route = ROUTES.JOB_DETAILS.replace('[id]', String(jobId));
    this.navigate(route, options);
  }

  // Navigate to user profile
  navigateToUser(userId: string | number, options: NavigationOptions = {}) {
    const route = ROUTES.USER_PROFILE.replace('[id]', String(userId));
    this.navigate(route, options);
  }

  // Navigate to proposal submission
  navigateToProposal(jobId: string | number, options: NavigationOptions = {}) {
    const route = ROUTES.PROPOSAL_SUBMIT.replace('[id]', String(jobId));
    this.navigate(route, options);
  }

  // Navigate to chat room
  navigateToChat(chatId: string | number, options: NavigationOptions = {}) {
    const route = ROUTES.CHAT_ROOM.replace('[id]', String(chatId));
    this.navigate(route, options);
  }

  // Navigate to payment
  navigateToPayment(paymentId: string | number, options: NavigationOptions = {}) {
    const route = ROUTES.PAYMENT.replace('[id]', String(paymentId));
    this.navigate(route, options);
  }

  // Navigate to admin routes
  navigateToAdmin(route: string, options: NavigationOptions = {}) {
    const adminRoute = `/admin/${route}`;
    this.navigate(adminRoute, options);
  }

  // Reset navigation to dashboard
  resetToDashboard() {
    this.navigate(ROUTES.DASHBOARD, { reset: true });
  }

  // Reset navigation to login
  resetToLogin() {
    this.navigate(ROUTES.LOGIN, { reset: true });
  }

  // Check if current route matches pattern
  isCurrentRoute(pattern: string): boolean {
    try {
      const currentRoute = router.getCurrentOptions()?.path;
      if (!currentRoute) return false;
      
      // Simple pattern matching
      const regex = new RegExp(pattern.replace(/\[.*?\]/g, '[^/]+'));
      return regex.test(currentRoute);
    } catch (error) {
      return false;
    }
  }

  // Get current route name
  getCurrentRoute(): string | null {
    try {
      return router.getCurrentOptions()?.path || null;
    } catch (error) {
      return null;
    }
  }

  // Check if can go back
  canGoBack(): boolean {
    return router.canGoBack();
  }

  // Parse deep link
  parseDeepLink(url: string): { route: string; params: RouteParams } | null {
    try {
      // Remove scheme and domain
      const path = url.replace(/^.*?:\/\/[^\/]+/, '');
      
      // Find matching deep link pattern
      for (const [pattern, config] of Object.entries(DEEP_LINKS)) {
        const regex = new RegExp(`^${pattern.replace(/:\w+/g, '([^/]+)')}$`);
        const match = path.match(regex);
        
        if (match) {
          const params = config.parse(match.slice(1));
          return {
            route: config.route,
            params,
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Deep link parsing failed:', error);
      return null;
    }
  }

  // Handle deep link navigation
  handleDeepLink(url: string): boolean {
    const parsed = this.parseDeepLink(url);
    if (parsed) {
      this.navigate(parsed.route, { params: parsed.params });
      return true;
    }
    return false;
  }

  // Preload routes for better performance
  preloadRoute(route: string) {
    try {
      if (Platform.OS === 'web') {
        // Web preloading
        router.prefetch(route as any);
      }
    } catch (error) {
      console.warn('Route preloading failed:', error);
    }
  }

  // Preload common routes
  preloadCommonRoutes() {
    const commonRoutes = [
      ROUTES.JOBS,
      ROUTES.PROFILE,
      ROUTES.CHAT,
      ROUTES.BOOKMARKS,
    ];
    
    commonRoutes.forEach(route => this.preloadRoute(route));
  }

  // Get route title
  getRouteTitle(route: string): string {
    const titles: Record<string, string> = {
      [ROUTES.DASHBOARD]: 'Dashboard',
      [ROUTES.JOBS]: 'Browse Jobs',
      [ROUTES.BOOKMARKS]: 'Bookmarks',
      [ROUTES.CHAT]: 'Messages',
      [ROUTES.PROFILE]: 'Profile',
      [ROUTES.LOGIN]: 'Sign In',
      [ROUTES.REGISTER]: 'Sign Up',
      [ROUTES.USER_SETTINGS]: 'Settings',
      [ROUTES.PAYMENT_HISTORY]: 'Payment History',
      [ROUTES.ADMIN_DASHBOARD]: 'Admin Dashboard',
    };
    
    return titles[route] || 'Unknown';
  }

  // Get route icon
  getRouteIcon(route: string): string {
    const icons: Record<string, string> = {
      [ROUTES.DASHBOARD]: '🏠',
      [ROUTES.JOBS]: '💼',
      [ROUTES.BOOKMARKS]: '🔖',
      [ROUTES.CHAT]: '💬',
      [ROUTES.PROFILE]: '👤',
      [ROUTES.LOGIN]: '🔑',
      [ROUTES.REGISTER]: '📝',
      [ROUTES.USER_SETTINGS]: '⚙️',
      [ROUTES.PAYMENT_HISTORY]: '💰',
      [ROUTES.ADMIN_DASHBOARD]: '🛡️',
    };
    
    return icons[route] || '❓';
  }

  // Check if route requires authentication
  requiresAuth(route: string): boolean {
    const publicRoutes = [
      ROUTES.LOGIN,
      ROUTES.REGISTER,
    ];
    
    return !publicRoutes.includes(route as any);
  }

  // Check if route is admin only
  isAdminRoute(route: string): boolean {
    return route.startsWith('/admin');
  }

  // Get breadcrumb for current route
  getBreadcrumb(): Array<{ title: string; route: string }> {
    try {
      const currentRoute = this.getCurrentRoute();
      if (!currentRoute) return [];
      
      const parts = currentRoute.split('/').filter(Boolean);
      const breadcrumb: Array<{ title: string; route: string }> = [];
      
      let currentPath = '';
      parts.forEach((part, index) => {
        currentPath += `/${part}`;
        
        // Skip dynamic segments
        if (part.startsWith('[') && part.endsWith(']')) {
          return;
        }
        
        breadcrumb.push({
          title: this.getRouteTitle(currentPath),
          route: currentPath,
        });
      });
      
      return breadcrumb;
    } catch (error) {
      return [];
    }
  }
}

// Export singleton instance
export const navigationService = new NavigationService();

// Export for direct use
export default navigationService;

// Export utility functions
export const createLink = (route: string, params?: RouteParams) => {
  let finalRoute = route;
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      finalRoute = finalRoute.replace(`[${key}]`, String(value));
    });
  }
  
  return finalRoute;
};

export const isActiveRoute = (route: string, currentRoute?: string) => {
  const current = currentRoute || navigationService.getCurrentRoute();
  if (!current) return false;
  
  return current === route || current.startsWith(route + '/');
};
