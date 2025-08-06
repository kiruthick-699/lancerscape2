import { Job, Notification, NFTBadge, Message } from '@/types';

export const mockJobs: Job[] = [
  {
    id: '1',
    title: 'Mobile App UI Design',
    description: 'Need a modern UI design for a fitness tracking app. Looking for clean, minimalist design with dark mode support.',
    category: 'design',
    budget: 2500,
    deadline: '2025-02-15',
    location: 'remote',
    client: 'FitTech Inc.',
    status: 'posted',
  },
  {
    id: '2',
    title: 'React Native Developer',
    description: 'Build a cross-platform mobile app for food delivery. Experience with maps integration required.',
    category: 'dev',
    budget: 5000,
    deadline: '2025-03-01',
    location: 'remote',
    client: 'DeliveryPro',
    status: 'posted',
  },
  {
    id: '3',
    title: 'Technical Blog Writing',
    description: 'Write 10 technical articles about blockchain development. Each article should be 1500+ words.',
    category: 'writing',
    budget: 1200,
    deadline: '2025-02-28',
    location: 'remote',
    client: 'CryptoNews',
    status: 'accepted',
  },
  {
    id: '4',
    title: 'E-commerce Website',
    description: 'Full-stack development of an e-commerce platform with payment integration.',
    category: 'dev',
    budget: 8000,
    deadline: '2025-04-15',
    location: 'local',
    client: 'ShopMart',
    status: 'in_progress',
  },
];

export const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'job_accepted',
    title: 'Job Accepted',
    description: 'Your proposal for "Mobile App UI Design" was accepted!',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    isRead: false,
  },
  {
    id: '2',
    type: 'payment_released',
    title: 'Payment Released',
    description: '$1,200 has been released for "Technical Blog Writing"',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    isRead: false,
  },
  {
    id: '3',
    type: 'message_received',
    title: 'New Message',
    description: 'Client sent a message about "E-commerce Website"',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    isRead: true,
  },
];

export const mockNFTBadge: NFTBadge = {
  id: 'badge_1',
  name: 'Verified Developer',
  image: 'https://images.pexels.com/photos/844124/pexels-photo-844124.jpeg?auto=compress&cs=tinysrgb&w=100&h=100',
  verified: true,
  rarity: 'epic',
};

export const mockMessages: Message[] = [
  {
    id: '1',
    jobId: '4',
    sender: 'client',
    text: 'Hi! I reviewed your proposal and I\'m excited to work with you on this project.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: '2',
    jobId: '4',
    sender: 'freelancer',
    text: 'Thank you! I\'m looking forward to working on this e-commerce platform. When would be a good time to discuss the requirements in detail?',
    timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
  },
  {
    id: '3',
    jobId: '4',
    sender: 'client',
    text: 'How about tomorrow at 2 PM EST? We can go over the technical specifications and timeline.',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
  {
    id: '4',
    jobId: '4',
    sender: 'freelancer',
    text: 'Perfect! I\'ll prepare some questions about the payment integration requirements.',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
  },
];