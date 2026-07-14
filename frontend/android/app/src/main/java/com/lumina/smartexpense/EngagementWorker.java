package com.lumina.smartexpense;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.util.Random;

public class EngagementWorker extends Worker {
    private static final String CHANNEL_ID = "lumina_engagement_alerts";
    
    private final String[] MESSAGES = {
        "Did you hit your budget goals today? Open Lumina to check! 📈",
        "Keep your streak alive! Log your cash expenses now. 🔥",
        "Your financial co-pilot is missing you. Check your recent insights! 💡",
        "Have you reviewed your upcoming subscriptions? Tap to view. 🔔",
        "Review your recent transactions! Correcting categories improves your AI insights. 🤖",
        "Lumina AI works better when your transactions are categorized correctly. Tap to review! ✨"
    };

    public EngagementWorker(
        @NonNull Context context,
        @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        sendEngagementNotification();
        return Result.success();
    }

    private void sendEngagementNotification() {
        Context context = getApplicationContext();
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

        notificationManager.notify((int) System.currentTimeMillis(), builder.build());
    }
}
