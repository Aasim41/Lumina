import { LocalNotifications } from '@capacitor/local-notifications';

export async function requestNotificationPermissions() {
  if (typeof window === 'undefined') return;
  try {
    const { display } = await LocalNotifications.checkPermissions();
    if (display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }
  } catch (e) {
    console.log('Push notifications not available on this platform');
  }
}

export async function scheduleImmediateNotification(title: string, body: string, id: number = 9999) {
  try {
    const { display } = await LocalNotifications.checkPermissions();
    if (display !== 'granted') return;

    const notifId = (Math.abs(id) % 90000) + 10000;
    try {
      await LocalNotifications.cancel({ notifications: [{ id: notifId }] });
    } catch {}

    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: notifId,
          smallIcon: 'ic_stat_icon_config_sample',
        },
      ],
    });
  } catch (e) {
    console.log('Notifications not supported');
  }
}

export async function scheduleSubscriptionReminders(subscriptions: any[], currencyFormat: (amt: number) => string) {
  try {
    const { display } = await LocalNotifications.checkPermissions();
    if (display !== 'granted') return;

    if (!subscriptions || subscriptions.length === 0) return;

    const notificationsToSchedule = [];
    const notificationsToCancel: { id: number }[] = [];

    for (const sub of subscriptions) {
      if (!sub.billing_day || !sub.merchant) continue;

      // Stable deterministic numeric ID based on sub.id or merchant
      const idStr = String(sub.id || sub.merchant);
      let hash = 0;
      for (let i = 0; i < idStr.length; i++) {
        hash = (hash * 31 + idStr.charCodeAt(i)) >>> 0;
      }
      const notifId = 100000 + (hash % 800000);
      notificationsToCancel.push({ id: notifId });

      const now = new Date();
      // Calculate target billing date
      let targetBillingYear = now.getFullYear();
      let targetBillingMonth = now.getMonth();

      // If billing date minus 3 days is in the past for this month, target next month's cycle
      let reminderDate = new Date(targetBillingYear, targetBillingMonth, sub.billing_day - 3, 9, 0, 0);
      if (reminderDate.getTime() <= now.getTime()) {
        targetBillingMonth += 1;
        reminderDate = new Date(targetBillingYear, targetBillingMonth, sub.billing_day - 3, 9, 0, 0);
      }

      // Check if we already scheduled this cycle to prevent infinite rescheduling churn
      const cycleKey = `sub_notif_${notifId}_${reminderDate.toISOString().slice(0, 10)}`;
      if (typeof window !== 'undefined' && localStorage.getItem(cycleKey)) {
        continue;
      }

      notificationsToSchedule.push({
        title: 'Upcoming Subscription 🔔',
        body: `Your ${sub.merchant} subscription (${currencyFormat(sub.amount)}) bills in 3 days.`,
        id: notifId,
        schedule: { at: reminderDate },
        smallIcon: 'ic_stat_icon_config_sample',
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem(cycleKey, 'scheduled');
      }
    }

    // Cancel old pending alarms for these subscription IDs before scheduling fresh ones
    if (notificationsToCancel.length > 0) {
      try {
        await LocalNotifications.cancel({ notifications: notificationsToCancel });
      } catch {}
    }

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule,
      });
    }
  } catch (e) {
    console.log('Notifications not supported', e);
  }
}

export async function scheduleDailyEveningRecap(spentToday: number = 0, dailyAllowance: number = 1000, txCount: number = 0) {
  try {
    const { display } = await LocalNotifications.checkPermissions();
    if (display !== 'granted') return;

    // Check if recap for this exact spend state was already scheduled today to avoid churn
    const todayStr = new Date().toISOString().slice(0, 10);
    const recapStateKey = `recap_${todayStr}_${Math.round(spentToday)}_${txCount}`;
    if (typeof window !== 'undefined' && localStorage.getItem('lumina_recap_key') === recapStateKey) {
      return;
    }

    // Target 21:00 (9:00 PM) strictly in the future
    const now = new Date();
    const eveningDate = new Date();
    eveningDate.setHours(21, 0, 0, 0);
    // If it's already past 8:59 PM today, schedule for tomorrow's 9 PM
    if (now.getTime() >= eveningDate.getTime() - 60000) {
      eveningDate.setDate(eveningDate.getDate() + 1);
    }

    let recapBody = `Did you make any purchases today? Check your daily summary.`;
    if (spentToday === 0) {
      recapBody = `Zero spend day! 🏆 You saved your full ₹${dailyAllowance} daily allowance today!`;
    } else if (spentToday <= dailyAllowance) {
      const saved = Math.round(dailyAllowance - spentToday);
      recapBody = `🌙 You spent ₹${Math.round(spentToday)} today (${txCount} txns). You saved ₹${saved} under your daily cap!`;
    } else {
      const over = Math.round(spentToday - dailyAllowance);
      recapBody = `⚠️ Spent ₹${Math.round(spentToday)} today (₹${over} over your daily cap). Rest well & reset tomorrow!`;
    }

    // Cancel existing 9 PM recap
    try {
      await LocalNotifications.cancel({ notifications: [{ id: 1004 }] });
    } catch {}

    await LocalNotifications.schedule({
      notifications: [
        {
          title: '🌙 9 PM Daily Spending Recap',
          body: recapBody,
          id: 1004,
          schedule: { at: eveningDate },
          smallIcon: 'ic_stat_icon_config_sample',
        }
      ]
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('lumina_recap_key', recapStateKey);
    }
  } catch (e) {
    console.log('Evening recap notification not supported or disabled', e);
  }
}

export async function scheduleRecurringNotifications() {
  try {
    const { display } = await LocalNotifications.checkPermissions();
    if (display !== 'granted') return;

    // Clear existing recurring so we don't duplicate
    await LocalNotifications.cancel({ notifications: [{ id: 1001 }, { id: 1002 }, { id: 1003 }] });

    // 1. Daily Reminder (8:00 PM)
    const dailyDate = new Date();
    dailyDate.setHours(20, 0, 0, 0);
    if (new Date() > dailyDate) dailyDate.setDate(dailyDate.getDate() + 1);

    // 2. Weekly Summary (Sunday 10:00 AM)
    const weeklyDate = new Date();
    weeklyDate.setDate(weeklyDate.getDate() + ((7 - weeklyDate.getDay()) % 7)); // Next Sunday
    weeklyDate.setHours(10, 0, 0, 0);
    if (new Date() > weeklyDate) weeklyDate.setDate(weeklyDate.getDate() + 7);

    // 3. Monthly Review (1st of month 10:00 AM)
    const monthlyDate = new Date();
    monthlyDate.setMonth(monthlyDate.getMonth() + 1, 1);
    monthlyDate.setHours(10, 0, 0, 0);

    await LocalNotifications.schedule({
      notifications: [
        {
          title: 'Daily Check-in',
          body: 'Did you make any purchases today? Log them to stay on track!',
          id: 1001,
          schedule: { at: dailyDate, repeats: true, every: 'day' },
        },
        {
          title: 'Weekly Summary Ready',
          body: 'Check out your spending trends for the past week.',
          id: 1002,
          schedule: { at: weeklyDate, repeats: true, every: 'week' },
        },
        {
          title: 'New Month, Fresh Budget!',
          body: "It's the 1st of the month! Time to review your envelope budgets.",
          id: 1003,
          schedule: { at: monthlyDate, repeats: true, every: 'month' },
        }
      ],
    });
  } catch (e) {
    console.log('Notifications not supported');
  }
}

export async function checkBudgetsAndNotify() {
  try {
    const { getCategoryBudgets } = await import('./api');
    const budgets = await getCategoryBudgets();
    
    for (const b of budgets) {
      const totalLimit = b.amount + (b.rollover_balance || 0);
      if (totalLimit <= 0) continue;
      
      const percent = (b.spent_this_month / totalLimit) * 100;
      const key = `notified_${b.category}_${new Date().getMonth()}`;
      
      if (percent >= 100 && localStorage.getItem(key) !== '100') {
        localStorage.setItem(key, '100');
        await scheduleImmediateNotification('Budget Exceeded! ⚠️', `You have exceeded your ${b.category} budget.`);
      } else if (percent >= 80 && percent < 100 && !localStorage.getItem(key)) {
        localStorage.setItem(key, '80');
        await scheduleImmediateNotification('Budget Warning ⚠️', `You have used ${percent.toFixed(0)}% of your ${b.category} budget.`);
      }
    }
  } catch (e) {
    console.error('Failed to check budgets for notifications', e);
  }
}
