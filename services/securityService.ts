import { ethers } from 'ethers';

export interface SecurityConfig {
  maxJobBudget: number;
  maxJobDuration: number;
  minJobDuration: number;
  rateLimitWindow: number;
  rateLimitMax: number;
  allowedOrigins: string[];
}

export class SecurityService {
  private config: SecurityConfig;
  private rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  // Input validation and sanitization
  validateJobInputs(data: {
    title: string;
    description: string;
    budget: string;
    deadline: string;
    category: number;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Title validation
    if (!data.title || data.title.trim().length === 0) {
      errors.push('Title is required');
    } else if (data.title.length > 200) {
      errors.push('Title must be less than 200 characters');
    }

    // Description validation
    if (!data.description || data.description.trim().length === 0) {
      errors.push('Description is required');
    } else if (data.description.length > 2000) {
      errors.push('Description must be less than 2000 characters');
    }

    // Budget validation
    const budget = parseFloat(data.budget);
    if (isNaN(budget) || budget <= 0) {
      errors.push('Budget must be a positive number');
    } else if (budget > this.config.maxJobBudget) {
      errors.push(`Budget cannot exceed ${this.config.maxJobBudget} ETH`);
    }

    // Deadline validation
    const deadline = new Date(data.deadline);
    const now = new Date();
    const minDeadline = new Date(now.getTime() + this.config.minJobDuration * 1000);
    const maxDeadline = new Date(now.getTime() + this.config.maxJobDuration * 1000);

    if (isNaN(deadline.getTime())) {
      errors.push('Invalid deadline format');
    } else if (deadline <= minDeadline) {
      errors.push(`Deadline must be at least ${this.config.minJobDuration / 3600} hours from now`);
    } else if (deadline > maxDeadline) {
      errors.push(`Deadline cannot be more than ${this.config.maxJobDuration / 86400} days from now`);
    }

    // Category validation
    if (data.category < 0 || data.category > 4) {
      errors.push('Invalid category');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateProposalInputs(data: {
    proposedAmount: string;
    coverLetter: string;
    deliveryTime: string;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Proposed amount validation
    const proposedAmount = parseFloat(data.proposedAmount);
    if (isNaN(proposedAmount) || proposedAmount <= 0) {
      errors.push('Proposed amount must be a positive number');
    }

    // Cover letter validation
    if (!data.coverLetter || data.coverLetter.trim().length === 0) {
      errors.push('Cover letter is required');
    } else if (data.coverLetter.length > 1000) {
      errors.push('Cover letter must be less than 1000 characters');
    }

    // Delivery time validation
    const deliveryTime = parseInt(data.deliveryTime);
    if (isNaN(deliveryTime) || deliveryTime <= 0) {
      errors.push('Delivery time must be a positive number');
    } else if (deliveryTime > 365) {
      errors.push('Delivery time cannot exceed 365 days');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Rate limiting
  checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const userLimit = this.rateLimitMap.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      // Reset or create new rate limit entry
      this.rateLimitMap.set(userId, {
        count: 1,
        resetTime: now + this.config.rateLimitWindow
      });
      return {
        allowed: true,
        remaining: this.config.rateLimitMax - 1,
        resetTime: now + this.config.rateLimitWindow
      };
    }

    if (userLimit.count >= this.config.rateLimitMax) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: userLimit.resetTime
      };
    }

    // Increment count
    userLimit.count++;
    this.rateLimitMap.set(userId, userLimit);

    return {
      allowed: true,
      remaining: this.config.rateLimitMax - userLimit.count,
      resetTime: userLimit.resetTime
    };
  }

  // Wallet address validation
  validateWalletAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  // Transaction validation
  validateTransaction(tx: {
    to: string;
    value: string;
    data: string;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate recipient address
    if (!this.validateWalletAddress(tx.to)) {
      errors.push('Invalid recipient address');
    }

    // Validate value
    try {
      const value = ethers.parseEther(tx.value);
      if (value <= 0n) {
        errors.push('Transaction value must be positive');
      }
    } catch {
      errors.push('Invalid transaction value');
    }

    // Validate data (if present)
    if (tx.data && tx.data.length > 0) {
      if (!tx.data.startsWith('0x')) {
        errors.push('Transaction data must be hex encoded');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // XSS prevention
  sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  // SQL injection prevention (for backend)
  sanitizeSQL(input: string): string {
    return input
      .replace(/'/g, "''") // Escape single quotes
      .replace(/--/g, '') // Remove SQL comments
      .replace(/;/g, '') // Remove semicolons
      .trim();
  }

  // CSRF token validation
  validateCSRFToken(token: string, expectedToken: string): boolean {
    return token === expectedToken;
  }

  // JWT token validation
  validateJWTToken(token: string): { isValid: boolean; payload?: any; error?: string } {
    try {
      // This is a simplified validation - in production, use a proper JWT library
      if (!token || token.split('.').length !== 3) {
        return { isValid: false, error: 'Invalid token format' };
      }

      // Decode payload (base64)
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // Check expiration
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return { isValid: false, error: 'Token expired' };
      }

      return { isValid: true, payload };
    } catch (error) {
      return { isValid: false, error: 'Invalid token' };
    }
  }

  // Password strength validation
  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // IP address validation
  validateIPAddress(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  // File upload validation
  validateFileUpload(file: File): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

    if (file.size > maxSize) {
      errors.push('File size must be less than 10MB');
    }

    if (!allowedTypes.includes(file.type)) {
      errors.push('File type not allowed');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Clean up rate limit map (call periodically)
  cleanupRateLimits(): void {
    const now = Date.now();
    for (const [userId, limit] of this.rateLimitMap.entries()) {
      if (now > limit.resetTime) {
        this.rateLimitMap.delete(userId);
      }
    }
  }

  // Get security statistics
  getSecurityStats(): {
    activeRateLimits: number;
    totalValidations: number;
    securityScore: number;
  } {
    const activeRateLimits = this.rateLimitMap.size;
    const totalValidations = 0; // This would be tracked in production
    const securityScore = Math.max(0, 100 - activeRateLimits * 5); // Simple scoring

    return {
      activeRateLimits,
      totalValidations,
      securityScore
    };
  }
}

// Default security configuration
export const defaultSecurityConfig: SecurityConfig = {
  maxJobBudget: 100, // 100 ETH
  maxJobDuration: 365 * 24 * 60 * 60, // 365 days in seconds
  minJobDuration: 60 * 60, // 1 hour in seconds
  rateLimitWindow: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100, // 100 requests per window
  allowedOrigins: (process.env.EXPO_PUBLIC_ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map(o => o.trim())
};

// Export singleton instance
export const securityService = new SecurityService(defaultSecurityConfig); 