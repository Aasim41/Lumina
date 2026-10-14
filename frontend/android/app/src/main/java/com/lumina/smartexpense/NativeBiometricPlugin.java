package com.lumina.smartexpense;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.Executor;

@CapacitorPlugin(name = "NativeBiometric")
public class NativeBiometricPlugin extends Plugin {

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        try {
            BiometricManager biometricManager = BiometricManager.from(getContext());
            int canAuth = biometricManager.canAuthenticate(
                BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.BIOMETRIC_WEAK
            );

            boolean isAvailable = (canAuth == BiometricManager.BIOMETRIC_SUCCESS);
            boolean hasEnrolled = (canAuth != BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED);

            ret.put("isAvailable", isAvailable);
            ret.put("hasEnrolled", hasEnrolled);
            ret.put("status", canAuth);
            call.resolve(ret);
        } catch (Exception e) {
            ret.put("isAvailable", false);
            ret.put("hasEnrolled", false);
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                FragmentActivity activity = (FragmentActivity) getActivity();
                Executor executor = ContextCompat.getMainExecutor(getContext());

                String title = call.getString("title", "Unlock Lumina");
                String subtitle = call.getString("subtitle", "Verify your identity to access your finances");
                String cancelText = call.getString("cancelText", "Use PIN");

                BiometricPrompt.PromptInfo.Builder promptBuilder = new BiometricPrompt.PromptInfo.Builder()
                        .setTitle(title)
                        .setSubtitle(subtitle)
                        .setNegativeButtonText(cancelText);

                BiometricPrompt.PromptInfo promptInfo = promptBuilder.build();

                BiometricPrompt biometricPrompt = new BiometricPrompt(activity, executor, new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                        super.onAuthenticationError(errorCode, errString);
                        JSObject err = new JSObject();
                        err.put("success", false);
                        err.put("errorCode", errorCode);
                        err.put("message", errString.toString());
                        call.reject(errString.toString(), String.valueOf(errorCode));
                    }

                    @Override
                    public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                        super.onAuthenticationSucceeded(result);
                        JSObject res = new JSObject();
                        res.put("success", true);
                        call.resolve(res);
                    }

                    @Override
                    public void onAuthenticationFailed() {
                        super.onAuthenticationFailed();
                        // Individual attempt failed; BiometricPrompt stays open until max attempts or cancel
                    }
                });

                biometricPrompt.authenticate(promptInfo);

            } catch (Exception e) {
                call.reject("Biometric authentication error: " + e.getMessage(), e);
            }
        });
    }
}
