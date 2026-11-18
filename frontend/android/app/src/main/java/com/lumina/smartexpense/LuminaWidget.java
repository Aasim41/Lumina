package com.lumina.smartexpense;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;

public class LuminaWidget extends AppWidgetProvider {

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        // Capacitor Preferences plugin saves values to a shared preference file named "CapacitorStorage"
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String remainingStr = prefs.getString("remaining_budget", "0");
        String streakStr = prefs.getString("current_streak", "0");
        
        float amount = 0;
        try {
            amount = Float.parseFloat(remainingStr);
        } catch (NumberFormatException e) {
            amount = 0;
        }

        int streak = 0;
        try {
            streak = Integer.parseInt(streakStr);
        } catch (NumberFormatException e) {
            streak = 0;
        }
        
        String displayAmount = "₹" + Math.round(amount);
        String displayStreak = "🔥 " + streak + (streak == 1 ? " day" : " days");

        // Construct the RemoteViews object
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.lumina_widget);
        views.setTextViewText(R.id.widget_budget_text, displayAmount);
        views.setTextViewText(R.id.widget_streak_text, displayStreak);

        // Intent to launch the app directly into the "Add Expense" modal
        Intent addIntent = new Intent(context, MainActivity.class);
        addIntent.setAction(Intent.ACTION_VIEW);
        addIntent.setData(Uri.parse("https://localhost/?action=add"));
        addIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            0,
            addIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_add_button, pendingIntent);

        // Tapping the widget background opens the app home screen
        Intent mainIntent = new Intent(context, MainActivity.class);
        mainIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent mainPendingIntent = PendingIntent.getActivity(
            context,
            1,
            mainIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, mainPendingIntent);

        // Instruct the widget manager to update the widget
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }
}
