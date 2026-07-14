package com.lumina.smartexpense;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.ExistingPeriodicWorkPolicy;
import java.util.concurrent.TimeUnit;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeSmsPlugin.class);
        super.onCreate(savedInstanceState);
        
        PeriodicWorkRequest engagementRequest =
            new PeriodicWorkRequest.Builder(EngagementWorker.class, 12, TimeUnit.HOURS)
                .build();
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "LuminaEngagementWorker",
            ExistingPeriodicWorkPolicy.KEEP,
            engagementRequest
        );
    }
}
