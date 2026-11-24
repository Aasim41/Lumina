package com.lumina.smartexpense;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.provider.Telephony;
import android.telephony.SmsMessage;
import androidx.core.app.NotificationCompat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

public class SmsReceiver extends BroadcastReceiver {
    private static final String CHANNEL_ID = "lumina_transaction_alerts";
    public static final int TRANSACTION_NOTIFICATION_ID = 5001;
    private static final Pattern TRANSACTION_PATTERN = Pattern.compile("(?i)(debited|spent|credited|INR|rs\\.?\\s*\\d+)");

    // In-memory deduplication cache: hash -> timestamp (60-second window)
    private static final Map<Integer, Long> RECENT_SMS_HASHES = new ConcurrentHashMap<>();
    private static final long DEDUPLICATION_WINDOW_MS = 60_000L;

    private static boolean isDuplicate(String sender, String body) {
        long now = System.currentTimeMillis();
        // Prune stale hashes older than window
        RECENT_SMS_HASHES.entrySet().removeIf(entry -> (now - entry.getValue()) > DEDUPLICATION_WINDOW_MS);

        int hash = (sender != null ? sender.trim() : "").hashCode() * 31 + (body != null ? body.trim() : "").hashCode();
        Long previous = RECENT_SMS_HASHES.putIfAbsent(hash, now);
        if (previous != null && (now - previous) < DEDUPLICATION_WINDOW_MS) {
            return true; // Duplicate detected within 60-second window
        }
        RECENT_SMS_HASHES.put(hash, now);
        return false;
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if ("android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) {
            try {
                SmsMessage[] messages = Telephony.Sms.Intents.getMessagesFromIntent(intent);
                if (messages != null && messages.length > 0) {
                    StringBuilder fullBody = new StringBuilder();
                    String sender = messages[0].getOriginatingAddress();
                    for (SmsMessage msg : messages) {
                        if (msg != null && msg.getMessageBody() != null) {
                            fullBody.append(msg.getMessageBody());
                        }
                    }
                    String messageBody = fullBody.toString();
                    if (TRANSACTION_PATTERN.matcher(messageBody).find()) {
                        // Prevent multi-part or duplicate broadcast triggers
                        if (isDuplicate(sender, messageBody)) {
                            return;
                        }

                        NativeSmsPlugin.onSmsReceived(messageBody, sender);

                        // Only show system tray notification if app is not actively open in foreground
                        if (!NativeSmsPlugin.isForeground()) {
                            sendNotification(context);
                        }
                    }
                }
            } catch (Exception e) {
                // Fallback for older legacy devices
                Bundle bundle = intent.getExtras();
                if (bundle != null) {
                    Object[] pdus = (Object[]) bundle.get("pdus");
                    if (pdus != null) {
                        for (Object pdu : pdus) {
                            SmsMessage smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
                            if (smsMessage != null && smsMessage.getMessageBody() != null) {
                                String body = smsMessage.getMessageBody();
                                String sender = smsMessage.getOriginatingAddress();
                                if (TRANSACTION_PATTERN.matcher(body).find()) {
                                    if (isDuplicate(sender, body)) {
                                        return;
                                    }

                                    NativeSmsPlugin.onSmsReceived(body, sender);

                                    if (!NativeSmsPlugin.isForeground()) {
                                        sendNotification(context);
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private void sendNotification(Context context) {
        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Transaction Alerts",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            channel.setDescription("Alerts for new transactions detected from SMS");
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

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info) 
                .setContentTitle("Smart Expense Tracked! 💰")
                .setContentText("A new transaction was detected from your SMS.")
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true);

        // Deterministic ID so multiple transactions update smoothly rather than stacking duplicate banners
        notificationManager.notify(TRANSACTION_NOTIFICATION_ID, builder.build());
    }
}
