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

export async function scheduleImmediateNotification(title: string, body: string, id: number = new Date().getTime()) {
  try {
    const { display } = await LocalNotifications.checkPermissions();
    if (display !== 'granted') return;

    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: id % 100000,
          schedule: { at: new Date(Date.now() + 1000) }, // 1 second from now
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

    // Clear old subscription notifications (IDs 100000 - 999999 range)
    // For simplicity, we just schedule them, but in a real app we'd keep track of IDs to clear.
    const notificationsToSchedule = [];

    for (const sub of subscriptions) {
      const now = new Date();
      let nextBillingDate = new Date(now.getFullYear(), now.getMonth(), sub.billing_day, 9, 0, 0); 
      
      if (now.getDate() > sub.billing_day - 3) {
        nextBillingDate = new Date(now.getFullYear(), now.getMonth() + 1, sub.billing_day, 9, 0, 0);
      }

      const reminderDate = new Date(nextBillingDate);
      reminderDate.setDate(reminderDate.getDate() - 3);

      let id = 0;
      const idStr = sub.id || String(Math.random());
      for (let i = 0; i < idStr.length; i++) {
        id = (id + idStr.charCodeAt(i)) % 100000;
      }
      id += 100000; // Offset for subscription reminders

      notificationsToSchedule.push({
        title: 'Upcoming Subscription',
        body: `Your ${sub.merchant} subscription (${currencyFormat(sub.amount)}) is billing in 3 days. Want to cancel it?`,
        id: id,
        schedule: { at: reminderDate, repeats: true, every: 'month' },
        smallIcon: 'ic_stat_icon_config_sample',
      });
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
      const totalLimit = b.amount + b.rollover_balance;
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
