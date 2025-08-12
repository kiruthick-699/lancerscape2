import { Model, JSONSchema } from 'objection';
import { User } from './User';
import { Job } from './Job';

export interface ProposalAttributes {
  id: string;
  jobId: string;
  freelancerId: string;
  proposedAmount: number;
  coverLetter: string;
  deliveryTime: string;
  attachments: string[];
  portfolio: string[];
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  acceptedAt?: Date;
  rejectedAt?: Date;
  withdrawnAt?: Date;
  rejectionReason?: string;
  metadata: {
    milestones: Array<{
      title: string;
      description: string;
      amount: number;
      dueDate: Date;
    }>;
    skills: string[];
    experience: string;
    availability: string;
    customFields: Record<string, any>;
  };
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export class Proposal extends Model implements ProposalAttributes {
  id!: string;
  jobId!: string;
  freelancerId!: string;
  proposedAmount!: number;
  coverLetter!: string;
  deliveryTime!: string;
  attachments!: string[];
  portfolio!: string[];
  status!: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  acceptedAt?: Date;
  rejectedAt?: Date;
  withdrawnAt?: Date;
  rejectionReason?: string;
  metadata!: {
    milestones: Array<{
      title: string;
      description: string;
      amount: number;
      dueDate: Date;
    }>;
    skills: string[];
    experience: string;
    availability: string;
    customFields: Record<string, any>;
  };
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date;

  static tableName = 'proposals';

  static jsonSchema: JSONSchema = {
    type: 'object',
    required: ['jobId', 'freelancerId', 'proposedAmount', 'coverLetter', 'deliveryTime'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      jobId: { type: 'string', format: 'uuid' },
      freelancerId: { type: 'string', format: 'uuid' },
      proposedAmount: { type: 'number', minimum: 1, maximum: 1000000 },
      coverLetter: { type: 'string', minLength: 100, maxLength: 2000 },
      deliveryTime: { type: 'string', maxLength: 100 },
      attachments: { 
        type: 'array', 
        items: { type: 'string', format: 'uri' },
        maxItems: 10
      },
      portfolio: { 
        type: 'array', 
        items: { type: 'string', format: 'uri' },
        maxItems: 20
      },
      status: { 
        type: 'string', 
        enum: ['pending', 'accepted', 'rejected', 'withdrawn'] 
      },
      acceptedAt: { type: 'string', format: 'date-time' },
      rejectedAt: { type: 'string', format: 'date-time' },
      withdrawnAt: { type: 'string', format: 'date-time' },
      rejectionReason: { type: 'string', maxLength: 500 },
      metadata: {
        type: 'object',
        properties: {
          milestones: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', maxLength: 100 },
                description: { type: 'string', maxLength: 500 },
                amount: { type: 'number', minimum: 1 },
                dueDate: { type: 'string', format: 'date-time' }
              }
            },
            maxItems: 10
          },
          skills: { 
            type: 'array', 
            items: { type: 'string', maxLength: 50 },
            maxItems: 15
          },
          experience: { type: 'string', maxLength: 500 },
          availability: { type: 'string', maxLength: 200 },
          customFields: { type: 'object' }
        }
      },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      deletedAt: { type: 'string', format: 'date-time' }
    }
  };

  static get relationMappings() {
    const { User } = require('./User');
    const { Job } = require('./Job');

    return {
      job: {
        relation: Model.BelongsToOneRelation,
        modelClass: Job,
        join: {
          from: 'proposals.jobId',
          to: 'jobs.id'
        }
      },
      freelancer: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'proposals.freelancerId',
          to: 'users.id'
        }
      }
    };
  }

  // Lifecycle hooks
  async $beforeInsert(context: any) {
    await super.$beforeInsert(context);
    
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.status = 'pending';
    
    // Set default metadata
    this.metadata = {
      milestones: this.metadata?.milestones || [],
      skills: this.metadata?.skills || [],
      experience: this.metadata?.experience || '',
      availability: this.metadata?.availability || 'Immediate',
      customFields: this.metadata?.customFields || {}
    };
  }

  async $beforeUpdate(opt: any, context: any) {
    await super.$beforeUpdate(opt, context);
    this.updatedAt = new Date();
  }

  // Business logic methods
  async accept(): Promise<void> {
    this.status = 'accepted';
    this.acceptedAt = new Date();
    await this.$query().patch({ 
      status: this.status, 
      acceptedAt: this.acceptedAt 
    });

    // Update job status
    const job = await Job.query().findById(this.jobId);
    if (job) {
      await job.acceptProposal(this.id);
    }
  }

  async reject(reason: string): Promise<void> {
    this.status = 'rejected';
    this.rejectedAt = new Date();
    this.rejectionReason = reason;
    await this.$query().patch({ 
      status: this.status, 
      rejectedAt: this.rejectedAt,
      rejectionReason: this.rejectionReason
    });
  }

  async withdraw(): Promise<void> {
    this.status = 'withdrawn';
    this.withdrawnAt = new Date();
    await this.$query().patch({ 
      status: this.status, 
      withdrawnAt: this.withdrawnAt 
    });
  }

  // Validation methods
  canBeAccepted(): boolean {
    return this.status === 'pending';
  }

  canBeRejected(): boolean {
    return this.status === 'pending';
  }

  canBeWithdrawn(): boolean {
    return this.status === 'pending';
  }

  canBeEdited(): boolean {
    return this.status === 'pending';
  }

  // Search and filtering
  static async getProposalsByJob(jobId: string, status?: string) {
    let query = Proposal.query()
      .where('jobId', jobId)
      .withGraphFetched('freelancer')
      .orderBy('createdAt', 'desc');

    if (status) {
      query = query.where('status', status);
    }

    return query;
  }

  static async getProposalsByFreelancer(freelancerId: string, status?: string) {
    let query = Proposal.query()
      .where('freelancerId', freelancerId)
      .withGraphFetched('job')
      .orderBy('createdAt', 'desc');

    if (status) {
      query = query.where('status', status);
    }

    return query;
  }

  static async searchProposals(filters: {
    jobId?: string;
    freelancerId?: string;
    status?: string;
    minAmount?: number;
    maxAmount?: number;
    skills?: string[];
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      jobId,
      freelancerId,
      status,
      minAmount,
      maxAmount,
      skills,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    let queryBuilder = Proposal.query()
      .withGraphFetched('[job, freelancer]')
      .where('proposals.status', '!=', 'deleted');

    // Job filter
    if (jobId) {
      queryBuilder = queryBuilder.where('proposals.jobId', jobId);
    }

    // Freelancer filter
    if (freelancerId) {
      queryBuilder = queryBuilder.where('proposals.freelancerId', freelancerId);
    }

    // Status filter
    if (status) {
      queryBuilder = queryBuilder.where('proposals.status', status);
    }

    // Amount range
    if (minAmount !== undefined) {
      queryBuilder = queryBuilder.where('proposals.proposedAmount', '>=', minAmount);
    }
    if (maxAmount !== undefined) {
      queryBuilder = queryBuilder.where('proposals.proposedAmount', '<=', maxAmount);
    }

    // Skills filter
    if (skills && skills.length > 0) {
      queryBuilder = queryBuilder.where('proposals.metadata->skills', '@>', skills);
    }

    // Sorting
    const validSortFields = ['createdAt', 'proposedAmount', 'deliveryTime'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder = queryBuilder.orderBy(`proposals.${sortField}`, sortOrder);

    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder = queryBuilder.offset(offset).limit(limit);

    return queryBuilder;
  }

  // Get proposal statistics
  static async getProposalStats() {
    const stats = await Proposal.query()
      .select(
        Proposal.raw('COUNT(*) as totalProposals'),
        Proposal.raw('COUNT(CASE WHEN status = \'pending\' THEN 1 END) as pendingProposals'),
        Proposal.raw('COUNT(CASE WHEN status = \'accepted\' THEN 1 END) as acceptedProposals'),
        Proposal.raw('COUNT(CASE WHEN status = \'rejected\' THEN 1 END) as rejectedProposals'),
        Proposal.raw('AVG(proposedAmount) as averageAmount'),
        Proposal.raw('SUM(CASE WHEN status = \'accepted\' THEN proposedAmount ELSE 0 END) as totalAcceptedValue')
      )
      .first();

    return stats;
  }

  // Get public proposal data (without sensitive information)
  get publicData() {
    return {
      id: this.id,
      jobId: this.jobId,
      freelancerId: this.freelancerId,
      proposedAmount: this.proposedAmount,
      coverLetter: this.coverLetter,
      deliveryTime: this.deliveryTime,
      attachments: this.attachments,
      portfolio: this.portfolio,
      status: this.status,
      metadata: {
        milestones: this.metadata.milestones,
        skills: this.metadata.skills,
        experience: this.metadata.experience,
        availability: this.metadata.availability
      },
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Get proposal for client (includes freelancer info)
  get clientView() {
    return {
      ...this.publicData,
      freelancer: this.freelancer ? {
        id: this.freelancer.id,
        username: this.freelancer.username,
        firstName: this.freelancer.firstName,
        lastName: this.freelancer.lastName,
        avatar: this.freelancer.avatar,
        reputationScore: this.freelancer.reputationScore,
        averageRating: this.freelancer.averageRating,
        completedJobs: this.freelancer.completedJobs,
        skills: this.freelancer.skills
      } : null
    };
  }
}
