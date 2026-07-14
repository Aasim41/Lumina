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

export async function scheduleSubscriptionNotification(merchant: string, amount: number, billingDay: number, idStr: string) {
  try {
    const { display } = await LocalNotifications.checkPermissions();
    if (display !== 'granted') return;

    const now = new Date();
    let nextBillingDate = new Date(now.getFullYear(), now.getMonth(), billingDay, 9, 0, 0); // 9:00 AM
    
    if (now.getDate() >= billingDay) {
      nextBillingDate = new Date(now.getFullYear(), now.getMonth() + 1, billingDay, 9, 0, 0);
    }

    // Convert UUID string to integer ID for Capacitor
    let id = 0;
    for (let i = 0; i < idStr.length; i++) {
      id = (id + idStr.charCodeAt(i)) % 100000;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          title: 'Subscription Due Today',
          body: `Your ${merchant} subscription (₹${amount}) is due today!`,
          id,
          schedule: { at: nextBillingDate, repeats: true, every: 'month' },
        },
      ],
    });
  } catch (e) {
    console.log('Notifications not supported');
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
          body: 'It\\'s the 1st of the month! Time to review your envelope budgets.',
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
