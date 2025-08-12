import { Model, JSONSchema } from 'objection';
import { User } from './User';

export interface JobAttributes {
  id: string;
  title: string;
  description: string;
  budget: number;
  deadline: Date;
  category: number;
  isRemote: boolean;
  location?: string;
  skills: string[];
  requirements: string[];
  attachments: string[];
  clientId: string;
  status: 'posted' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
  proposals: number;
  acceptedProposalId?: string;
  escrowId?: string;
  metadata: {
    estimatedDuration: string;
    complexity: 'beginner' | 'intermediate' | 'expert';
    priority: 'low' | 'medium' | 'high';
    tags: string[];
    customFields: Record<string, any>;
  };
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export class Job extends Model implements JobAttributes {
  id!: string;
  title!: string;
  description!: string;
  budget!: number;
  deadline!: Date;
  category!: number;
  isRemote!: boolean;
  location?: string;
  skills!: string[];
  requirements!: string[];
  attachments!: string[];
  clientId!: string;
  status!: 'posted' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
  proposals!: number;
  acceptedProposalId?: string;
  escrowId?: string;
  metadata!: {
    estimatedDuration: string;
    complexity: 'beginner' | 'intermediate' | 'expert';
    priority: 'low' | 'medium' | 'high';
    tags: string[];
    customFields: Record<string, any>;
  };
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date;

  static tableName = 'jobs';

  static jsonSchema: JSONSchema = {
    type: 'object',
    required: ['title', 'description', 'budget', 'deadline', 'category', 'clientId'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      title: { type: 'string', minLength: 10, maxLength: 200 },
      description: { type: 'string', minLength: 50, maxLength: 5000 },
      budget: { type: 'number', minimum: 1, maximum: 1000000 },
      deadline: { type: 'string', format: 'date-time' },
      category: { type: 'number', minimum: 0, maximum: 10 },
      isRemote: { type: 'boolean' },
      location: { type: 'string', maxLength: 255 },
      skills: { 
        type: 'array', 
        items: { type: 'string', maxLength: 50 },
        maxItems: 20
      },
      requirements: { 
        type: 'array', 
        items: { type: 'string', maxLength: 200 },
        maxItems: 10
      },
      attachments: { 
        type: 'array', 
        items: { type: 'string', format: 'uri' },
        maxItems: 10
      },
      clientId: { type: 'string', format: 'uuid' },
      status: { 
        type: 'string', 
        enum: ['posted', 'in_progress', 'completed', 'cancelled', 'expired'] 
      },
      proposals: { type: 'number', minimum: 0 },
      acceptedProposalId: { type: 'string', format: 'uuid' },
      escrowId: { type: 'string' },
      metadata: {
        type: 'object',
        properties: {
          estimatedDuration: { type: 'string', maxLength: 100 },
          complexity: { 
            type: 'string', 
            enum: ['beginner', 'intermediate', 'expert'] 
          },
          priority: { 
            type: 'string', 
            enum: ['low', 'medium', 'high'] 
          },
          tags: { 
            type: 'array', 
            items: { type: 'string', maxLength: 30 },
            maxItems: 15
          },
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
    const { Proposal } = require('./Proposal');

    return {
      client: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'jobs.clientId',
          to: 'users.id'
        }
      },
      proposals: {
        relation: Model.HasManyRelation,
        modelClass: Proposal,
        join: {
          from: 'jobs.id',
          to: 'proposals.jobId'
        }
      },
      acceptedProposal: {
        relation: Model.BelongsToOneRelation,
        modelClass: Proposal,
        join: {
          from: 'jobs.acceptedProposalId',
          to: 'proposals.id'
        }
      }
    };
  }

  // Lifecycle hooks
  async $beforeInsert(context: any) {
    await super.$beforeInsert(context);
    
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.status = 'posted';
    this.proposals = 0;
    
    // Set default metadata
    this.metadata = {
      estimatedDuration: this.metadata?.estimatedDuration || '1-2 weeks',
      complexity: this.metadata?.complexity || 'intermediate',
      priority: this.metadata?.priority || 'medium',
      tags: this.metadata?.tags || [],
      customFields: this.metadata?.customFields || {}
    };
  }

  async $beforeUpdate(opt: any, context: any) {
    await super.$beforeUpdate(opt, context);
    this.updatedAt = new Date();
  }

  // Business logic methods
  async incrementProposals(): Promise<void> {
    this.proposals += 1;
    await this.$query().patch({ proposals: this.proposals });
  }

  async acceptProposal(proposalId: string): Promise<void> {
    this.status = 'in_progress';
    this.acceptedProposalId = proposalId;
    await this.$query().patch({ 
      status: this.status, 
      acceptedProposalId: this.acceptedProposalId 
    });
  }

  async completeJob(): Promise<void> {
    this.status = 'completed';
    await this.$query().patch({ status: this.status });
  }

  async cancelJob(): Promise<void> {
    this.status = 'cancelled';
    await this.$query().patch({ status: this.status });
  }

  async expireJob(): Promise<void> {
    if (new Date() > this.deadline) {
      this.status = 'expired';
      await this.$query().patch({ status: this.status });
    }
  }

  // Validation methods
  canBeEdited(): boolean {
    return this.status === 'posted' && this.proposals === 0;
  }

  canBeCancelled(): boolean {
    return this.status === 'posted' || this.status === 'in_progress';
  }

  canAcceptProposal(): boolean {
    return this.status === 'posted' && this.proposals > 0;
  }

  // Search and filtering
  static async searchJobs(filters: {
    query?: string;
    category?: number;
    budgetMin?: number;
    budgetMax?: number;
    location?: string;
    isRemote?: boolean;
    skills?: string[];
    status?: string;
    complexity?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      query,
      category,
      budgetMin,
      budgetMax,
      location,
      isRemote,
      skills,
      status,
      complexity,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    let queryBuilder = Job.query()
      .withGraphFetched('client')
      .where('jobs.status', '!=', 'deleted');

    // Text search
    if (query) {
      queryBuilder = queryBuilder.where(function() {
        this.where('jobs.title', 'ilike', `%${query}%`)
          .orWhere('jobs.description', 'ilike', `%${query}%`)
          .orWhere('jobs.skills', '@>', `{${query}}`);
      });
    }

    // Category filter
    if (category !== undefined) {
      queryBuilder = queryBuilder.where('jobs.category', category);
    }

    // Budget range
    if (budgetMin !== undefined) {
      queryBuilder = queryBuilder.where('jobs.budget', '>=', budgetMin);
    }
    if (budgetMax !== undefined) {
      queryBuilder = queryBuilder.where('jobs.budget', '<=', budgetMax);
    }

    // Location filter
    if (location) {
      queryBuilder = queryBuilder.where('jobs.location', 'ilike', `%${location}%`);
    }

    // Remote filter
    if (isRemote !== undefined) {
      queryBuilder = queryBuilder.where('jobs.isRemote', isRemote);
    }

    // Skills filter
    if (skills && skills.length > 0) {
      queryBuilder = queryBuilder.where('jobs.skills', '@>', skills);
    }

    // Status filter
    if (status) {
      queryBuilder = queryBuilder.where('jobs.status', status);
    }

    // Complexity filter
    if (complexity) {
      queryBuilder = queryBuilder.where('jobs.metadata->complexity', complexity);
    }

    // Sorting
    const validSortFields = ['createdAt', 'budget', 'deadline', 'proposals', 'title'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder = queryBuilder.orderBy(`jobs.${sortField}`, sortOrder);

    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder = queryBuilder.offset(offset).limit(limit);

    return queryBuilder;
  }

  // Get jobs by client
  static async getJobsByClient(clientId: string, status?: string) {
    let query = Job.query()
      .where('clientId', clientId)
      .withGraphFetched('proposals')
      .orderBy('createdAt', 'desc');

    if (status) {
      query = query.where('status', status);
    }

    return query;
  }

  // Get jobs for freelancer
  static async getJobsForFreelancer(freelancerId: string, status?: string) {
    let query = Job.query()
      .where('status', 'posted')
      .whereNot('clientId', freelancerId)
      .orderBy('createdAt', 'desc');

    if (status) {
      query = query.where('status', status);
    }

    return query;
  }

  // Get job statistics
  static async getJobStats() {
    const stats = await Job.query()
      .select(
        Job.raw('COUNT(*) as totalJobs'),
        Job.raw('COUNT(CASE WHEN status = \'posted\' THEN 1 END) as openJobs'),
        Job.raw('COUNT(CASE WHEN status = \'in_progress\' THEN 1 END) as activeJobs'),
        Job.raw('COUNT(CASE WHEN status = \'completed\' THEN 1 END) as completedJobs'),
        Job.raw('AVG(budget) as averageBudget'),
        Job.raw('SUM(CASE WHEN status = \'completed\' THEN budget ELSE 0 END) as totalValue')
      )
      .first();

    return stats;
  }

  // Get public job data (without sensitive information)
  get publicData() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      budget: this.budget,
      deadline: this.deadline,
      category: this.category,
      isRemote: this.isRemote,
      location: this.location,
      skills: this.skills,
      requirements: this.requirements,
      status: this.status,
      proposals: this.proposals,
      metadata: {
        estimatedDuration: this.metadata.estimatedDuration,
        complexity: this.metadata.complexity,
        priority: this.metadata.priority,
        tags: this.metadata.tags
      },
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
