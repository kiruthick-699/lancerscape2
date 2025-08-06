export interface Job {
  id: string;
  title: string;
  description: string;
  category: 'design' | 'dev' | 'writing';
  budget: number;
  deadline: string;
  location: 'remote' | 'local';
  client: string;
  status: 'posted' | 'accepted' | 'in_progress' | 'submitted' | 'approved' | 'paid';
  isBookmarked?: boolean;
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