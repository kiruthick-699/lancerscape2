# 🚀 Lancerscape2 Production Deployment Guide

This guide provides comprehensive instructions for deploying Lancerscape2 to production with enterprise-grade security, performance, and scalability.

## 📋 Prerequisites

### **System Requirements**
- **CPU**: Minimum 4 cores, Recommended 8+ cores
- **RAM**: Minimum 8GB, Recommended 16GB+
- **Storage**: Minimum 100GB SSD, Recommended 500GB+ SSD
- **Network**: High-speed internet connection with static IP
- **OS**: Ubuntu 20.04 LTS or later, CentOS 8+, or RHEL 8+

### **Software Requirements**
- **Node.js**: 18.x LTS or later
- **PostgreSQL**: 15.x or later
- **Redis**: 7.x or later
- **Nginx**: 1.18+ (for reverse proxy)
- **Docker**: 20.10+ (optional, for containerized deployment)
- **PM2**: For process management
- **Certbot**: For SSL certificates

## 🔒 Security Checklist

### **1. Environment Variables**
```bash
# Generate secure secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Required environment variables
JWT_SECRET=<64+ character random string>
SESSION_SECRET=<64+ character random string>
DB_PASSWORD=<strong database password>
REDIS_PASSWORD=<strong redis password>
METRICS_TOKEN=<secure metrics token>
```

### **2. Network Security**
- [ ] Configure firewall (UFW/iptables)
- [ ] Open only necessary ports (80, 443, 22)
- [ ] Use SSH key authentication only
- [ ] Disable root login
- [ ] Configure fail2ban

### **3. SSL/TLS Configuration**
- [ ] Obtain SSL certificates (Let's Encrypt)
- [ ] Configure automatic renewal
- [ ] Enable HSTS headers
- [ ] Configure secure cipher suites

## 🚀 Deployment Steps

### **Step 1: Server Setup**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git build-essential

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install Nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2
```

### **Step 2: Database Setup**

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE lancerscape2_production;
CREATE USER lancerscape2_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE lancerscape2_production TO lancerscape2_user;
ALTER USER lancerscape2_user CREATEDB;
\q

# Configure PostgreSQL for production
sudo nano /etc/postgresql/15/main/postgresql.conf

# Add/modify these settings:
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### **Step 3: Redis Configuration**

```bash
# Configure Redis for production
sudo nano /etc/redis/redis.conf

# Add/modify these settings:
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
tcp-keepalive 300
timeout 0
tcp-backlog 511

# Restart Redis
sudo systemctl restart redis-server
```

### **Step 4: Application Deployment**

```bash
# Clone repository
git clone https://github.com/yourusername/lancerscape2.git
cd lancerscape2

# Install dependencies
npm install
cd backend && npm install

# Copy production environment
cp backend/env.production.example backend/.env

# Edit environment file
nano backend/.env

# Build application
cd backend && npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### **Step 5: Nginx Configuration**

```nginx
# /etc/nginx/sites-available/lancerscape2
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Client Max Body Size
    client_max_body_size 10M;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    # API Routes
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Authentication Routes (stricter rate limiting)
    location /api/auth/ {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health Check (no rate limiting)
    location /health {
        proxy_pass http://localhost:3000;
        access_log off;
    }

    # Static Files
    location / {
        root /var/www/lancerscape2/frontend;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security: Block sensitive files
    location ~ /\. {
        deny all;
    }

    location ~ \.(env|log|sql)$ {
        deny all;
    }
}
```

### **Step 6: SSL Certificate Setup**

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test automatic renewal
sudo certbot renew --dry-run

# Add to crontab for automatic renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **Step 7: Firewall Configuration**

```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Verify status
sudo ufw status verbose
```

### **Step 8: Monitoring Setup**

```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Configure log rotation
sudo nano /etc/logrotate.d/lancerscape2

# Add configuration:
/var/log/lancerscape2/*.log {
    daily
    missingok
    rotate 90
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
```

## 📊 Performance Optimization

### **1. Database Optimization**

```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_users_username ON users(username);
CREATE INDEX CONCURRENTLY idx_jobs_status ON jobs(status);
CREATE INDEX CONCURRENTLY idx_jobs_category ON jobs(category);
CREATE INDEX CONCURRENTLY idx_proposals_job_id ON proposals(job_id);
CREATE INDEX CONCURRENTLY idx_proposals_freelancer_id ON proposals(freelancer_id);

-- Analyze tables
ANALYZE users;
ANALYZE jobs;
ANALYZE proposals;
```

### **2. Redis Optimization**

```bash
# Configure Redis persistence
sudo nano /etc/redis/redis.conf

# Add/modify:
save 900 1
save 300 10
save 60 10000
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /var/lib/redis

# Enable AOF persistence
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
```

### **3. Application Optimization**

```bash
# Configure PM2 for production
pm2 ecosystem

# Edit ecosystem.config.js:
module.exports = {
  apps: [{
    name: 'lancerscape2-backend',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

## 🔍 Monitoring & Alerting

### **1. Application Monitoring**

```bash
# PM2 monitoring
pm2 monit
pm2 logs

# System monitoring
htop
iotop
nethogs
```

### **2. Log Monitoring**

```bash
# Real-time log monitoring
tail -f /var/log/lancerscape2/combined.log
tail -f /var/log/lancerscape2/error.log

# Log analysis
grep "ERROR" /var/log/lancerscape2/combined.log | tail -100
grep "slow_query" /var/log/lancerscape2/performance.log
```

### **3. Health Checks**

```bash
# Test health endpoint
curl -s https://yourdomain.com/health | jq

# Test metrics endpoint
curl -H "Authorization: Bearer YOUR_METRICS_TOKEN" \
     https://yourdomain.com/metrics | jq
```

## 🚨 Backup & Recovery

### **1. Database Backup**

```bash
# Create backup script
sudo nano /usr/local/bin/backup-db.sh

#!/bin/bash
BACKUP_DIR="/var/backups/lancerscape2"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="lancerscape2_production"

mkdir -p $BACKUP_DIR
pg_dump -U lancerscape2_user -h localhost $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Keep only last 30 days of backups
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +30 -delete

# Make executable
sudo chmod +x /usr/local/bin/backup-db.sh

# Add to crontab
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-db.sh
```

### **2. Application Backup**

```bash
# Backup application files
sudo tar -czf /var/backups/lancerscape2/app_backup_$(date +%Y%m%d_%H%M%S).tar.gz \
    /opt/lancerscape2 \
    /etc/nginx/sites-available/lancerscape2 \
    /etc/systemd/system/pm2-root.service
```

## 🔄 Scaling Strategies

### **1. Horizontal Scaling**

```bash
# Load balancer configuration (HAProxy)
sudo apt install -y haproxy

# Configure multiple application instances
# Use PM2 cluster mode
pm2 start ecosystem.config.js --instances 4
```

### **2. Database Scaling**

```bash
# Read replicas for read-heavy workloads
# Connection pooling with PgBouncer
sudo apt install -y pgbouncer

# Configure connection pooling
sudo nano /etc/pgbouncer/pgbouncer.ini
```

### **3. Caching Strategy**

```bash
# Redis clustering for high availability
# Configure Redis Sentinel for failover
# Implement application-level caching
```

## 🛡️ Security Hardening

### **1. Regular Security Updates**

```bash
# Automated security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Configure automatic security updates
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

### **2. Intrusion Detection**

```bash
# Install and configure fail2ban
sudo apt install -y fail2ban

# Configure fail2ban for Nginx
sudo nano /etc/fail2ban/jail.local

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 3600
```

### **3. File Integrity Monitoring**

```bash
# Install AIDE for file integrity monitoring
sudo apt install -y aide

# Initialize AIDE database
sudo aideinit

# Add to crontab for regular checks
sudo crontab -e
# Add: 0 2 * * * /usr/bin/aide --check
```

## 📈 Performance Monitoring

### **1. Application Metrics**

```bash
# Monitor application performance
pm2 monit

# Check memory usage
pm2 show lancerscape2-backend

# Monitor logs
pm2 logs --lines 100
```

### **2. System Metrics**

```bash
# Install system monitoring
sudo apt install -y sysstat

# Enable system statistics collection
sudo systemctl enable sysstat
sudo systemctl start sysstat

# View system statistics
sar -u 1 5  # CPU usage
sar -r 1 5  # Memory usage
sar -b 1 5  # I/O statistics
```

## 🚀 Deployment Checklist

### **Pre-Deployment**
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] SSL certificates obtained
- [ ] Environment variables configured
- [ ] Database migrations ready

### **Deployment**
- [ ] Server provisioned and secured
- [ ] Dependencies installed
- [ ] Application deployed
- [ ] Database configured and migrated
- [ ] Nginx configured and tested
- [ ] SSL certificates installed
- [ ] Firewall configured
- [ ] Monitoring active

### **Post-Deployment**
- [ ] Health checks passing
- [ ] Performance benchmarks met
- [ ] Security scan completed
- [ ] Backup verification successful
- [ ] Team trained on monitoring
- [ ] Documentation updated
- [ ] Support procedures established

## 🔧 Troubleshooting

### **Common Issues**

1. **High Memory Usage**
   ```bash
   # Check memory usage
   free -h
   pm2 show lancerscape2-backend
   
   # Restart with memory limit
   pm2 restart lancerscape2-backend --max-memory-restart 1G
   ```

2. **Database Connection Issues**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Check connection pool
   pm2 logs lancerscape2-backend | grep "database"
   ```

3. **Redis Connection Issues**
   ```bash
   # Check Redis status
   sudo systemctl status redis-server
   
   # Test Redis connection
   redis-cli ping
   ```

4. **Nginx Issues**
   ```bash
   # Check Nginx status
   sudo systemctl status nginx
   
   # Test configuration
   sudo nginx -t
   
   # Check error logs
   sudo tail -f /var/log/nginx/error.log
   ```

## 📞 Support & Maintenance

### **Regular Maintenance Tasks**
- [ ] Weekly security updates
- [ ] Monthly performance review
- [ ] Quarterly security audit
- [ ] Annual disaster recovery test

### **Support Contacts**
- **Technical Issues**: tech-support@yourdomain.com
- **Security Issues**: security@yourdomain.com
- **Emergency**: +1-XXX-XXX-XXXX

---

## 🎯 Success Metrics

### **Performance Targets**
- **Response Time**: < 200ms for 95% of requests
- **Uptime**: > 99.9%
- **Error Rate**: < 0.1%
- **Database Response**: < 50ms

### **Security Targets**
- **Vulnerability Scan**: 0 critical/high vulnerabilities
- **Security Audit**: Passed annually
- **Compliance**: GDPR, SOC 2 compliant

### **Scalability Targets**
- **Concurrent Users**: Support 10,000+ users
- **Database Connections**: Handle 500+ concurrent connections
- **File Uploads**: Support 100MB+ files

---

**Remember**: Production deployment is an ongoing process. Regularly review and update your deployment based on monitoring data, security updates, and performance requirements.
