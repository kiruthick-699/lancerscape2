# 🧪 Lancerscape2 Testing Guide

This guide covers all aspects of testing the Lancerscape2 application, including unit tests, integration tests, end-to-end tests, and manual testing procedures.

## 📋 Testing Overview

### Test Types

1. **Unit Tests** - Individual component and function testing
2. **Integration Tests** - API endpoint and service testing
3. **End-to-End Tests** - Complete user workflow testing
4. **Manual Testing** - User acceptance testing
5. **Performance Testing** - Load and stress testing
6. **Security Testing** - Vulnerability and penetration testing

## 🏗️ Test Structure

```
lancerscape2/
├── backend/
│   ├── src/
│   │   ├── __tests__/           # Backend tests
│   │   │   ├── unit/            # Unit tests
│   │   │   ├── integration/     # Integration tests
│   │   │   └── e2e/             # End-to-end tests
│   │   └── ...
│   └── tests/                   # Test utilities and fixtures
├── app/
│   ├── __tests__/               # Frontend tests
│   │   ├── components/          # Component tests
│   │   ├── screens/             # Screen tests
│   │   └── utils/               # Utility tests
│   └── ...
└── contracts/
    ├── test/                    # Smart contract tests
    └── ...
```

## 🚀 Quick Start Testing

### 1. Run All Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd ..
npm test

# Smart contract tests
cd contracts
npm test
```

### 2. Run Specific Test Types

```bash
# Backend unit tests only
cd backend
npm run test:unit

# Backend integration tests only
npm run test:integration

# Frontend component tests only
cd ..
npm run test:components
```

## 🔧 Backend Testing

### Unit Tests

**Location:** `backend/src/__tests__/unit/`

**Test Files:**
- `auth.test.ts` - Authentication service tests
- `user.test.ts` - User model tests
- `job.test.ts` - Job service tests
- `email.test.ts` - Email service tests
- `blockchain.test.ts` - Blockchain service tests

**Running Unit Tests:**

```bash
cd backend
npm run test:unit
```

**Example Unit Test:**

```typescript
// backend/src/__tests__/unit/auth.test.ts
import { AuthService } from '../../services/authService';
import { User } from '../../models/User';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  describe('login', () => {
    it('should authenticate valid user credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      const result = await authService.login(email, password);

      expect(result.user).toBeDefined();
      expect(result.tokens).toBeDefined();
      expect(result.user.email).toBe(email);
    });

    it('should reject invalid credentials', async () => {
      const email = 'test@example.com';
      const password = 'wrongpassword';

      await expect(authService.login(email, password))
        .rejects
        .toThrow('Invalid credentials');
    });
  });
});
```

### Integration Tests

**Location:** `backend/src/__tests__/integration/`

**Test Files:**
- `auth.test.ts` - Authentication API tests
- `jobs.test.ts` - Jobs API tests
- `users.test.ts` - Users API tests
- `payments.test.ts` - Payments API tests

**Running Integration Tests:**

```bash
cd backend
npm run test:integration
```

**Example Integration Test:**

```typescript
// backend/src/__tests__/integration/auth.test.ts
import request from 'supertest';
import { app } from '../../index';
import { User } from '../../models/User';

describe('Auth API', () => {
  beforeEach(async () => {
    // Clean up database
    await User.query().delete();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
        userType: 'client'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
    });

    it('should reject duplicate email', async () => {
      // First registration
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
        userType: 'client'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });
});
```

### End-to-End Tests

**Location:** `backend/src/__tests__/e2e/`

**Test Files:**
- `workflow.test.ts` - Complete user workflows
- `job-posting.test.ts` - Job posting workflow
- `payment.test.ts` - Payment workflow

**Running E2E Tests:**

```bash
cd backend
npm run test:e2e
```

## 🎨 Frontend Testing

### Component Tests

**Location:** `app/__tests__/components/`

**Test Files:**
- `JobCard.test.tsx` - Job card component tests
- `JobPostingForm.test.tsx` - Job posting form tests
- `WalletConnectButton.test.tsx` - Wallet connection tests

**Running Component Tests:**

```bash
npm run test:components
```

**Example Component Test:**

```typescript
// app/__tests__/components/JobCard.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import JobCard from '../../components/JobCard';

const mockJob = {
  id: 1,
  title: 'Test Job',
  description: 'Test description',
  budget: '100',
  deadline: Date.now() + 86400000,
  category: 0,
  isRemote: false,
  client: '0x123...',
  status: 'open'
};

describe('JobCard', () => {
  it('renders job information correctly', () => {
    const { getByText } = render(<JobCard job={mockJob} />);

    expect(getByText('Test Job')).toBeTruthy();
    expect(getByText('Test description')).toBeTruthy();
    expect(getByText('100 ETH')).toBeTruthy();
  });

  it('handles job selection', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <JobCard job={mockJob} onSelect={onSelect} />
    );

    fireEvent.press(getByText('Test Job'));
    expect(onSelect).toHaveBeenCalledWith(mockJob);
  });
});
```

### Screen Tests

**Location:** `app/__tests__/screens/`

**Test Files:**
- `LoginScreen.test.tsx` - Login screen tests
- `RegisterScreen.test.tsx` - Register screen tests
- `DashboardScreen.test.tsx` - Dashboard screen tests

**Running Screen Tests:**

```bash
npm run test:screens
```

## 🔗 Smart Contract Testing

### Contract Tests

**Location:** `contracts/test/`

**Test Files:**
- `JobPosting.test.js` - Job posting contract tests
- `Escrow.test.js` - Escrow contract tests
- `Reputation.test.js` - Reputation contract tests

**Running Contract Tests:**

```bash
cd contracts
npm test
```

**Example Contract Test:**

```javascript
// contracts/test/JobPosting.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("JobPosting", function () {
  let JobPosting;
  let jobPosting;
  let owner;
  let client;
  let freelancer;

  beforeEach(async function () {
    [owner, client, freelancer] = await ethers.getSigners();
    JobPosting = await ethers.getContractFactory("JobPosting");
    jobPosting = await JobPosting.deploy();
    await jobPosting.deployed();
  });

  describe("Job Posting", function () {
    it("Should allow posting a job", async function () {
      const title = "Test Job";
      const description = "Test Description";
      const budget = ethers.utils.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      const category = 0;
      const isRemote = false;

      await expect(
        jobPosting.connect(client).postJob(
          title,
          description,
          budget,
          deadline,
          category,
          isRemote
        )
      ).to.emit(jobPosting, "JobPosted");

      const job = await jobPosting.getJob(0);
      expect(job.title).to.equal(title);
      expect(job.client).to.equal(client.address);
    });
  });
});
```

## 🧪 Manual Testing

### User Acceptance Testing

**Test Scenarios:**

1. **User Registration and Login**
   - [ ] User can register with valid information
   - [ ] User receives email verification
   - [ ] User can login with verified account
   - [ ] User cannot login with unverified account
   - [ ] User can reset password

2. **Job Posting**
   - [ ] User can post a new job
   - [ ] Job appears in job listings
   - [ ] Job form validates required fields
   - [ ] Job can be edited by owner
   - [ ] Job can be deleted by owner

3. **Job Browsing**
   - [ ] Users can browse available jobs
   - [ ] Jobs can be filtered by category
   - [ ] Jobs can be searched by title
   - [ ] Job details are displayed correctly

4. **Proposal Submission**
   - [ ] Freelancers can submit proposals
   - [ ] Proposals are visible to job owners
   - [ ] Proposals can be accepted/rejected
   - [ ] Proposal status is updated

5. **Payment Processing**
   - [ ] Payments can be made through escrow
   - [ ] Payments are released upon completion
   - [ ] Disputes can be raised
   - [ ] Refunds are processed correctly

6. **Wallet Integration**
   - [ ] Users can connect MetaMask wallet
   - [ ] Wallet address is displayed
   - [ ] Blockchain transactions work
   - [ ] Gas fees are calculated correctly

### Cross-Platform Testing

**Platforms to Test:**
- [ ] iOS Simulator
- [ ] Android Emulator
- [ ] Web Browser
- [ ] Physical iOS Device
- [ ] Physical Android Device

## 📊 Performance Testing

### Load Testing

**Tools:**
- Artillery.js
- Apache JMeter
- K6

**Test Scenarios:**
- Concurrent user registration
- Job posting under load
- API endpoint performance
- Database query optimization

**Running Load Tests:**

```bash
# Install Artillery
npm install -g artillery

# Run load test
artillery run load-tests/api-load-test.yml
```

### Stress Testing

**Test Scenarios:**
- Maximum concurrent users
- Database connection limits
- Memory usage under load
- CPU utilization

## 🔒 Security Testing

### Vulnerability Testing

**Tools:**
- OWASP ZAP
- Burp Suite
- npm audit

**Test Areas:**
- SQL injection
- XSS attacks
- CSRF protection
- Authentication bypass
- Authorization checks

**Running Security Tests:**

```bash
# npm audit
npm audit

# OWASP ZAP (requires installation)
zap-cli quick-scan --self-contained http://localhost:3000
```

### Penetration Testing

**Test Scenarios:**
- Authentication bypass
- Privilege escalation
- Data exposure
- API security
- Blockchain security

## 📈 Test Coverage

### Coverage Reports

**Backend Coverage:**

```bash
cd backend
npm run test:coverage
```

**Frontend Coverage:**

```bash
npm run test:coverage
```

**Target Coverage:**
- Unit Tests: >90%
- Integration Tests: >80%
- E2E Tests: >70%

## 🚀 Continuous Integration

### GitHub Actions

**Workflow:** `.github/workflows/test.yml`

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: |
        npm ci
        cd backend && npm ci
    
    - name: Run backend tests
      run: |
        cd backend
        npm run test:coverage
    
    - name: Run frontend tests
      run: npm run test:coverage
    
    - name: Run contract tests
      run: |
        cd contracts
        npm test
```

## 📝 Test Documentation

### Test Reports

**Generated Reports:**
- Coverage reports in `coverage/`
- Test results in `test-results/`
- Performance reports in `performance/`

### Test Maintenance

**Regular Tasks:**
- Update tests when features change
- Review and update test data
- Monitor test performance
- Update test documentation

## 🆘 Troubleshooting

### Common Test Issues

1. **Database Connection Issues**
   - Ensure test database is running
   - Check database credentials
   - Verify migrations are up to date

2. **Test Environment Issues**
   - Check environment variables
   - Verify test data setup
   - Ensure services are running

3. **Async Test Issues**
   - Use proper async/await patterns
   - Handle promises correctly
   - Add appropriate timeouts

### Getting Help

1. Check test logs for errors
2. Review test documentation
3. Consult the testing team
4. Check GitHub issues

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Hardhat Testing](https://hardhat.org/tutorial/testing-contracts)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Artillery Documentation](https://www.artillery.io/docs) 