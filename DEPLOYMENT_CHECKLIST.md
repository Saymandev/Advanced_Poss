# Deployment Checklist for Coolify

Use this checklist to ensure everything is configured correctly before and after deployment.

## Pre-Deployment

### Backend
- [ ] Dockerfile exists in `backend/Dockerfile`
- [ ] All environment variables documented
- [ ] MongoDB connection string ready
- [ ] Redis connection details ready
- [ ] JWT secrets generated (32+ characters)
- [ ] Stripe API keys ready (if using payments)
- [ ] Email configuration ready (if using emails)
- [ ] Cloudinary credentials ready (if using image uploads)

### Frontend
- [ ] Dockerfile exists in `frontend/Dockerfile`
- [ ] `next.config.js` has `output: 'standalone'`
- [ ] `NEXT_PUBLIC_API_URL` is set correctly
- [ ] `NEXT_PUBLIC_SITE_URL` is set correctly

### Infrastructure
- [ ] Coolify instance is running
- [ ] MongoDB database is set up (Coolify or external)
- [ ] Redis instance is set up (Coolify or external)
- [ ] Domain names are ready (optional but recommended)
- [ ] DNS records are configured (if using custom domains)

## Deployment Steps

### Backend Deployment
- [ ] Created new resource in Coolify
- [ ] Selected Dockerfile build method
- [ ] Set Dockerfile path: `backend/Dockerfile`
- [ ] Set build context: `backend/`
- [ ] Set port: `5000`
- [ ] Added all required environment variables
- [ ] Configured health check: `/health`
- [ ] Set up volumes (uploads, backups)
- [ ] Deployed successfully
- [ ] Health check is passing

### Frontend Deployment
- [ ] Created new resource in Coolify
- [ ] Selected Dockerfile build method
- [ ] Set Dockerfile path: `frontend/Dockerfile`
- [ ] Set build context: `frontend/`
- [ ] Set port: `3000`
- [ ] Added environment variables
- [ ] Set build arguments (NEXT_PUBLIC_API_URL)
- [ ] Deployed successfully
- [ ] Frontend is accessible

### Database Setup
- [ ] MongoDB is accessible from backend
- [ ] Database connection string is correct
- [ ] Redis is accessible from backend
- [ ] Redis credentials are correct

### Domain Configuration
- [ ] Backend domain is configured
- [ ] Frontend domain is configured
- [ ] DNS A records point to Coolify server
- [ ] SSL certificates are issued (automatic in Coolify)
- [ ] HTTPS is working for both domains

## Post-Deployment

### Initial Setup
- [ ] Seeded database with initial data
- [ ] Created super admin user
- [ ] Tested login functionality
- [ ] Verified API endpoints are working
- [ ] Checked CORS configuration

### Stripe Configuration (if using)
- [ ] Stripe webhook URL is configured
- [ ] Webhook secret is set in environment
- [ ] Tested payment flow
- [ ] Verified webhook events are received

### Testing
- [ ] Backend health check: `/health`
- [ ] Frontend loads correctly
- [ ] API calls from frontend work
- [ ] Authentication works
- [ ] File uploads work (if applicable)
- [ ] Images load correctly
- [ ] WebSocket connections work (if applicable)

### Security
- [ ] All default passwords changed
- [ ] Strong JWT secrets are set
- [ ] HTTPS is enabled
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Environment variables are secure

### Monitoring
- [ ] Health checks are configured
- [ ] Logs are accessible
- [ ] Resource usage is monitored
- [ ] Alerts are set up (if needed)

## Troubleshooting

### Common Issues

**Backend won't start:**
- [ ] Check MongoDB connection
- [ ] Verify all required env vars
- [ ] Check logs in Coolify
- [ ] Verify port is not in use

**Frontend build fails:**
- [ ] Check Dockerfile path
- [ ] Verify build context
- [ ] Check environment variables
- [ ] Review build logs

**API calls fail:**
- [ ] Verify NEXT_PUBLIC_API_URL
- [ ] Check CORS settings
- [ ] Verify backend is accessible
- [ ] Check network connectivity

**Database connection fails:**
- [ ] Verify connection string
- [ ] Check network access
- [ ] Verify credentials
- [ ] Check firewall rules

## Maintenance

### Regular Tasks
- [ ] Monitor resource usage
- [ ] Check logs for errors
- [ ] Update dependencies regularly
- [ ] Backup database regularly
- [ ] Review security updates
- [ ] Test backup restoration

### Updates
- [ ] Test updates in staging first
- [ ] Backup before updates
- [ ] Update one service at a time
- [ ] Verify health checks after updates
- [ ] Monitor for issues after updates

## Support Resources

- Coolify Documentation: https://coolify.io/docs
- Coolify GitHub: https://github.com/coollabsio/coolify
- Next.js Deployment: https://nextjs.org/docs/deployment
- NestJS Deployment: https://docs.nestjs.com/recipes/docker

