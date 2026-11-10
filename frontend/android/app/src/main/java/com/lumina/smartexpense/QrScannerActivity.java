package com.lumina.smartexpense;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.Size;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageButton;

import androidx.annotation.NonNull;
import androidx.annotation.OptIn;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.Camera;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ExperimentalGetImage;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.ImageProxy;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.content.ContextCompat;

import com.google.common.util.concurrent.ListenableFuture;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScannerOptions;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.common.InputImage;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Full-screen camera activity with real-time ML Kit QR code scanning.
 * Processes frames at ~30fps using CameraX ImageAnalysis + Google ML Kit
 * barcode scanner (same C++ NNAPI engine as Google Pay).
 *
 * Returns the raw QR value via RESULT_OK intent extra "qr_value".
 */
public class QrScannerActivity extends AppCompatActivity {

    private PreviewView previewView;
    private ExecutorService cameraExecutor;
    private BarcodeScanner barcodeScanner;
    private Camera camera;
    private boolean isFlashOn = false;
    private volatile boolean scanComplete = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Zero-latency instant window transition (bypasses Android default 300ms window animation)
        overridePendingTransition(0, 0);

        // Full-screen immersive
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        );

        setContentView(R.layout.activity_qr_scanner);

        previewView = findViewById(R.id.previewView);
        ImageButton btnClose = findViewById(R.id.btnClose);
        ImageButton btnFlash = findViewById(R.id.btnFlash);

        btnClose.setOnClickListener(v -> {
            setResult(RESULT_CANCELED);
            finish();
            overridePendingTransition(0, 0);
        });

        btnFlash.setOnClickListener(v -> {
            if (camera != null && camera.getCameraInfo().hasFlashUnit()) {
                isFlashOn = !isFlashOn;
                camera.getCameraControl().enableTorch(isFlashOn);
                btnFlash.setAlpha(isFlashOn ? 1.0f : 0.6f);
            }
        });

        // Initialize ML Kit barcode scanner — QR-only for maximum speed
        BarcodeScannerOptions options = new BarcodeScannerOptions.Builder()
                .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                .build();
        barcodeScanner = BarcodeScanning.getClient(options);

        cameraExecutor = Executors.newSingleThreadExecutor();

        startCamera();
    }

    private void startCamera() {
        ListenableFuture<ProcessCameraProvider> cameraProviderFuture =
                ProcessCameraProvider.getInstance(this);

        cameraProviderFuture.addListener(() -> {
            try {
                ProcessCameraProvider cameraProvider = cameraProviderFuture.get();

                // Preview use case
                Preview preview = new Preview.Builder()
                        .build();
                preview.setSurfaceProvider(previewView.getSurfaceProvider());

                // Image analysis use case — process every frame for QR codes
                ImageAnalysis imageAnalysis = new ImageAnalysis.Builder()
                        .setTargetResolution(new Size(1280, 720))
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build();

                imageAnalysis.setAnalyzer(cameraExecutor, this::analyzeFrame);

                // Select back camera
                CameraSelector cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA;

                // Unbind all before rebinding
                cameraProvider.unbindAll();

                // Bind use cases to camera lifecycle
                camera = cameraProvider.bindToLifecycle(
                        this, cameraSelector, preview, imageAnalysis);

            } catch (Exception e) {
                e.printStackTrace();
                setResult(RESULT_CANCELED);
                finish();
            }
        }, ContextCompat.getMainExecutor(this));
    }

    @OptIn(markerClass = ExperimentalGetImage.class)
    private void analyzeFrame(@NonNull ImageProxy imageProxy) {
        if (scanComplete) {
            imageProxy.close();
            return;
        }

        android.media.Image mediaImage = imageProxy.getImage();
        if (mediaImage == null) {
            imageProxy.close();
            return;
        }

        InputImage inputImage = InputImage.fromMediaImage(
                mediaImage, imageProxy.getImageInfo().getRotationDegrees());

        barcodeScanner.process(inputImage)
                .addOnSuccessListener(barcodes -> {
                    if (scanComplete) return;

                    for (Barcode barcode : barcodes) {
                        String rawValue = barcode.getRawValue();
                        if (rawValue != null && !rawValue.isEmpty()) {
                            scanComplete = true;
                            onQrDetected(rawValue);
                            break;
                        }
                    }
                })
                .addOnCompleteListener(task -> imageProxy.close());
    }

    private void onQrDetected(String rawValue) {
        // Haptic feedback — short vibration burst
        vibrateShort();

        // Return result to the Capacitor plugin instantly without window exit lag
        Intent resultIntent = new Intent();
        resultIntent.putExtra("qr_value", rawValue);
        setResult(RESULT_OK, resultIntent);
        finish();
        overridePendingTransition(0, 0);
    }

    @Override
    public void onBackPressed() {
        super.onBackPressed();
        overridePendingTransition(0, 0);
    }

    private void vibrateShort() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vm = (VibratorManager) getSystemService(VIBRATOR_MANAGER_SERVICE);
                if (vm != null) {
                    vm.getDefaultVibrator().vibrate(
                            VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE));
                }
            } else {
                Vibrator v = (Vibrator) getSystemService(VIBRATOR_SERVICE);
                if (v != null && v.hasVibrator()) {
                    v.vibrate(VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE));
                }
            }
        } catch (Exception ignored) {
            // Vibration is non-critical
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (cameraExecutor != null) {
            cameraExecutor.shutdown();
        }
        if (barcodeScanner != null) {
            barcodeScanner.close();
        }
    }
}

