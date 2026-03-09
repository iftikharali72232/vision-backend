/**
 * Cron Service
 * Scheduled jobs for SaaS management:
 * - Trial expiry reminders (3 days before)
 * - Subscription expiry reminders (7, 3, 1 day before)
 * - Auto-suspend expired tenants (7 days after expiry)
 * - Clean expired tokens
 */

const cron = require('node-cron');
const { systemPrisma } = require('../config/database');
const emailService = require('./email.service');

class CronService {
  constructor() {
    this.jobs = [];
  }

  /**
   * Start all cron jobs
   */
  start() {
    console.log('[Cron] Starting scheduled jobs...');

    // Run subscription checks daily at 9:00 AM
    this.jobs.push(
      cron.schedule('0 9 * * *', () => {
        this.checkTrialExpiry();
        this.checkSubscriptionExpiry();
        this.autoSuspendExpired();
      }, { timezone: 'Asia/Karachi' })
    );

    // Clean expired tokens every day at 2:00 AM
    this.jobs.push(
      cron.schedule('0 2 * * *', () => {
        this.cleanExpiredTokens();
      }, { timezone: 'Asia/Karachi' })
    );

    // Run an immediate check on startup (delayed 30s to let DB connect)
    setTimeout(() => {
      this.checkTrialExpiry();
      this.checkSubscriptionExpiry();
    }, 30000);

    console.log('[Cron] Scheduled jobs started successfully');
  }

  /**
   * Stop all cron jobs
   */
  stop() {
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    console.log('[Cron] All scheduled jobs stopped');
  }

  /**
   * Check for trial accounts about to expire (3 days before)
   */
  async checkTrialExpiry() {
    try {
      const now = new Date();
      const threeDaysFromNow = new Date(now);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      // Find trial companies expiring in next 3 days
      const expiringTrials = await systemPrisma.company.findMany({
        where: {
          status: 'trial',
          subscriptionEndsAt: {
            gte: now,
            lte: threeDaysFromNow,
          }
        },
        include: {
          users: {
            where: { isMaster: true },
            take: 1,
          }
        }
      });

      for (const company of expiringTrials) {
        const master = company.users[0];
        if (!master) continue;

        const daysLeft = Math.ceil((company.subscriptionEndsAt - now) / (1000 * 60 * 60 * 24));
        
        console.log(`[Cron] Trial expiring: ${company.name} (${daysLeft} days left)`);
        await emailService.sendTrialExpiring(
          master.email,
          master.name,
          company.name,
          daysLeft
        );
      }

      if (expiringTrials.length > 0) {
        console.log(`[Cron] Sent ${expiringTrials.length} trial expiry reminder(s)`);
      }
    } catch (error) {
      console.error('[Cron] Error checking trial expiry:', error.message);
    }
  }

  /**
   * Check for subscriptions about to expire (7, 3, 1 day before)
   */
  async checkSubscriptionExpiry() {
    try {
      const now = new Date();
      const reminderDays = [7, 3, 1];

      for (const days of reminderDays) {
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + days);
        
        // Find companies expiring on exactly this day
        const dayStart = new Date(targetDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(targetDate);
        dayEnd.setHours(23, 59, 59, 999);

        const expiringCompanies = await systemPrisma.company.findMany({
          where: {
            status: 'active',
            subscriptionEndsAt: {
              gte: dayStart,
              lte: dayEnd,
            }
          },
          include: {
            users: {
              where: { isMaster: true },
              take: 1,
            }
          }
        });

        for (const company of expiringCompanies) {
          const master = company.users[0];
          if (!master) continue;

          console.log(`[Cron] Subscription expiring: ${company.name} (${days} days left)`);
          await emailService.sendSubscriptionExpiryReminder(
            master.email,
            master.name,
            company.name,
            days
          );
        }
      }
    } catch (error) {
      console.error('[Cron] Error checking subscription expiry:', error.message);
    }
  }

  /**
   * Auto-suspend companies 7 days after subscription expiry
   */
  async autoSuspendExpired() {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Find active/trial companies expired more than 7 days ago
      const expiredCompanies = await systemPrisma.company.findMany({
        where: {
          status: { in: ['active', 'trial'] },
          subscriptionEndsAt: {
            lt: sevenDaysAgo,
          }
        },
        include: {
          users: {
            where: { isMaster: true },
            take: 1,
          }
        }
      });

      for (const company of expiredCompanies) {
        // Suspend the company
        await systemPrisma.company.update({
          where: { id: company.id },
          data: { status: 'suspended' }
        });

        // Send notification email
        const master = company.users[0];
        if (master) {
          await emailService.sendSubscriptionExpired(
            master.email,
            master.name,
            company.name
          );
        }

        console.log(`[Cron] Auto-suspended: ${company.name} (expired ${Math.ceil((now - company.subscriptionEndsAt) / (1000 * 60 * 60 * 24))} days ago)`);
      }

      if (expiredCompanies.length > 0) {
        console.log(`[Cron] Auto-suspended ${expiredCompanies.length} company(ies)`);
      }
    } catch (error) {
      console.error('[Cron] Error auto-suspending:', error.message);
    }
  }

  /**
   * Clean expired & revoked tokens older than 7 days
   */
  async cleanExpiredTokens() {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const result = await systemPrisma.token.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { isRevoked: true, createdAt: { lt: sevenDaysAgo } },
          ]
        }
      });

      if (result.count > 0) {
        console.log(`[Cron] Cleaned ${result.count} expired/revoked token(s)`);
      }
    } catch (error) {
      console.error('[Cron] Error cleaning tokens:', error.message);
    }
  }
}

module.exports = new CronService();
