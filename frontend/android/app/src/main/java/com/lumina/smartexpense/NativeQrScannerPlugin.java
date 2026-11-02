package com.lumina.smartexpense;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;

import androidx.activity.result.ActivityResult;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "NativeQrScanner",
    permissions = {
        @Permission(
            alias = "camera",
            strings = { Manifest.permission.CAMERA }
        )
    }
)
public class NativeQrScannerPlugin extends Plugin {

    @PluginMethod
    public void scan(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            requestPermissionForAlias("camera", call, "cameraPermCallback");
        } else {
            launchScanner(call);
        }
    }

    @PermissionCallback
    private void cameraPermCallback(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED) {
            launchScanner(call);
        } else {
            call.reject("Camera permission is required to scan QR codes");
        }
    }

    private void launchScanner(PluginCall call) {
        Intent intent = new Intent(getContext(), QrScannerActivity.class);
        startActivityForResult(call, intent, "scanResult");
    }

    @ActivityCallback
    private void scanResult(PluginCall call, ActivityResult result) {
        if (call == null) return;

        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            String qrValue = result.getData().getStringExtra("qr_value");
            if (qrValue != null && !qrValue.isEmpty()) {
                JSObject ret = new JSObject();
                ret.put("value", qrValue);
                ret.put("success", true);
                call.resolve(ret);
            } else {
                call.reject("No QR code detected");
            }
        } else {
            // User cancelled
            JSObject ret = new JSObject();
            ret.put("value", "");
            ret.put("success", false);
            ret.put("cancelled", true);
            call.resolve(ret);
        }
    }
}

