export interface Job {
  id: string | number;
  title: string;
  description: string;
  category: 'design' | 'dev' | 'writing' | 'marketing' | 'other' | number;
  budget: number | string;
  deadline: string | number;
  location: 'remote' | 'local' | string;
  client: string;
  status: 'posted' | 'accepted' | 'in_progress' | 'submitted' | 'approved' | 'paid' | string;
  isBookmarked?: boolean;
  proposals?: number;
  isRemote?: boolean;
  createdAt?: number;
  acceptedAt?: number;
  freelancer?: string;
}

export interface Message {
  id: string;
  jobId: string;
  sender: 'client' | 'freelancer';
  text: string;
  timestamp: Date;
}

export interface Notification {
  id: string;
  type: 'job_accepted' | 'payment_released' | 'message_received' | 'work_submitted';
  title: string;
  description: string;
  timestamp: Date;
  isRead: boolean;
}

export interface NFTBadge {
  id: string;
  name: string;
  image: string;
  verified: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  userType: 'client' | 'freelancer' | 'admin';
  isVerified: boolean;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  walletAddress?: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  location?: string;
  reputationScore?: number;
  totalEarnings?: number;
  completedJobs?: number;
  averageRating?: number;
  reviewCount?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ProposalFormData {
  proposedAmount: string;
  coverLetter: string;
  deliveryTime: string;
}

export interface JobFormData {
  title: string;
  description: string;
  budget: string;
  deadline: string;
  category: number;
  isRemote: boolean;
}

// Enhanced types for better type safety
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserProfile extends User {
  skills: string[];
  categories: string[];
  hourlyRate?: number;
  availability: 'available' | 'busy' | 'unavailable';
  lastActive: Date;
  preferences: {
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
    privacy: {
      profileVisibility: 'public' | 'private' | 'friends';
      showEarnings: boolean;
      showLocation: boolean;
    };
    language: string;
    currency: string;
    timezone: string;
  };
}

export interface JobWithDetails extends Job {
  skills: string[];
  requirements: string[];
  attachments?: string[];
  milestones?: JobMilestone[];
  escrowId?: string;
  paymentStatus: 'pending' | 'released' | 'disputed' | 'refunded';
}

export interface JobMilestone {
  id: string;
  title: string;
  description: string;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'completed' | 'overdue';
}

export interface Proposal {
  id: string;
  jobId: string;
  freelancerId: string;
  proposedAmount: number;
  coverLetter: string;
  deliveryTime: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  submittedAt: Date;
  attachments?: string[];
  portfolio?: string[];
}

export interface ChatMessage extends Message {
  attachments?: string[];
  isRead: boolean;
  replyTo?: string;
}

export interface WalletTransaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'payment' | 'refund';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: Date;
  txHash?: string;
  fromAddress?: string;
  toAddress?: string;
}

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// API error types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// Search and filter types
export interface JobSearchFilters {
  category?: string | number;
  budgetMin?: number;
  budgetMax?: number;
  location?: string;
  isRemote?: boolean;
  skills?: string[];
  status?: string;
}

export interface UserSearchFilters {
  userType?: 'client' | 'freelancer';
  skills?: string[];
  location?: string;
  hourlyRateMin?: number;
  hourlyRateMax?: number;
  availability?: string;
}

// Real-time types
export interface SocketEvent {
  type: string;
  data: any;
  timestamp: Date;
  userId?: string;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
}