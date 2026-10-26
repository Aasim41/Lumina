package com.lumina.smartexpense;

import android.os.Bundle;
import android.view.WindowManager;
import android.Manifest;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.ExistingPeriodicWorkPolicy;
import java.util.concurrent.TimeUnit;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Prevent recent-apps task switcher snapshot leaks and enforce financial privacy
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );

        registerPlugin(NativeSmsPlugin.class);
        registerPlugin(NativeBiometricPlugin.class);
        registerPlugin(NativeUpiPlugin.class);
        super.onCreate(savedInstanceState);

        // Proactively request camera permission so WebView getUserMedia can work
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.CAMERA}, 101);
        }

        // Allow video playback without a user gesture (needed for live camera preview)
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
        }

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
