package com.lumina.smartexpense;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.util.Random;
import java.util.concurrent.TimeUnit;

public class EngagementWorker extends Worker {
    private static final String CHANNEL_ID = "lumina_engagement_alerts";
    public static final int ENGAGEMENT_NOTIFICATION_ID = 2001;
    private static final String PREFS_NAME = "lumina_engagement_prefs";
    private static final String KEY_LAST_SENT = "last_notification_time";
    private static final long MIN_INTERVAL_MS = TimeUnit.HOURS.toMillis(20); // At most once every 20 hours
    
    private final String[] MESSAGES = {
        "Did you hit your budget goals today? Open Lumina to check! 📈",
        "Keep your streak alive! Log your cash expenses now. 🔥",
        "Your financial co-pilot is ready. Check your recent insights! 💡",
        "Have you reviewed your upcoming subscriptions? Tap to view. 🔔",
        "Review your recent transactions to keep your envelope budgets on target! 🎯",
        "Track your financial health with monthly trends and smart category caps. 📊"
    };

    public EngagementWorker(
        @NonNull Context context,
        @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        long lastSent = prefs.getLong(KEY_LAST_SENT, 0L);
        long now = System.currentTimeMillis();

        // Enforce strict cooldown: never send if notified within last 20 hours
        if (now - lastSent < MIN_INTERVAL_MS) {
            return Result.success();
        }

        sendEngagementNotification(context);
        prefs.edit().putLong(KEY_LAST_SENT, now).apply();
        return Result.success();
    }

    private void sendEngagementNotification(Context context) {
        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Engagement Alerts",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            channel.setDescription("Periodic reminders to check your finances");
            notificationManager.createNotificationChannel(channel);
        }

        Intent openAppIntent = new Intent(context, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context, 
            0, 
            openAppIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        int messageIndex = new Random().nextInt(MESSAGES.length);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info) 
                .setContentTitle("Lumina Finance")
                .setContentText(MESSAGES[messageIndex])
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true);

        // Deterministic ID so notifications update rather than stacking infinitely
        notificationManager.notify(ENGAGEMENT_NOTIFICATION_ID, builder.build());
    }
}
