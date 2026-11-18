package com.lumina.smartexpense;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.HashSet;
import java.util.List;

@CapacitorPlugin(name = "NativeUpi")
public class NativeUpiPlugin extends Plugin {

    @PluginMethod
    public void launchUpi(PluginCall call) {
        String uriStr = call.getString("uri");
        String packageName = call.getString("packageName");

        if (uriStr == null || uriStr.isEmpty()) {
            call.reject("URI is required");
            return;
        }

        Uri uri = Uri.parse(uriStr);
        PackageManager pm = getContext().getPackageManager();

        // Check if a specific package was requested and is actually installed
        boolean isPackageInstalled = false;
        if (packageName != null && !packageName.isEmpty() && !packageName.equalsIgnoreCase("any")) {
            try {
                Intent checkIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("upi://pay"));
                checkIntent.setPackage(packageName);
                List<ResolveInfo> matches = pm.queryIntentActivities(checkIntent, 0);
                if (matches != null && !matches.isEmpty()) {
                    isPackageInstalled = true;
                } else {
                    pm.getPackageInfo(packageName, 0);
                    isPackageInstalled = true;
                }
            } catch (Exception ignored) {
                isPackageInstalled = false;
            }
        }

        try {
            Intent intent;
            if (isPackageInstalled) {
                // Direct Target Launch: open the selected UPI app
                intent = new Intent(Intent.ACTION_VIEW, uri);
                intent.setPackage(packageName);
            } else {
                // System Chooser: user chose "any" or requested app was not installed
                Intent baseIntent = new Intent(Intent.ACTION_VIEW, uri);
                intent = Intent.createChooser(baseIntent, "Pay via UPI");
            }

            // Use startActivityForResult via Capacitor's saveCall + @ActivityCallback pattern.
            // Google Pay and other UPI apps return payment status (SUCCESS/FAILURE/SUBMITTED)
            // through onActivityResult. Using startActivityForResult instead of plain startActivity
            // signals to the target app that this is a legitimate payment intent from an app
            // expecting a response, which is the officially recommended approach per
            // Google Pay for India developer documentation.
            startActivityForResult(call, intent, "onUpiPaymentResult");

        } catch (Exception e) {
            // Fallback: query any intent activity that can handle upi://pay
            try {
                Intent testIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("upi://pay"));
                List<ResolveInfo> matches = pm.queryIntentActivities(testIntent, 0);

                if (matches != null && !matches.isEmpty()) {
                    String firstPkg = matches.get(0).activityInfo.packageName;
                    Intent directIntent = new Intent(Intent.ACTION_VIEW, uri);
                    directIntent.setPackage(firstPkg);
                    startActivityForResult(call, directIntent, "onUpiPaymentResult");
                    return;
                }
            } catch (Exception ignored) {}

            // Ultimate fallback
            try {
                Intent fallbackIntent = new Intent(Intent.ACTION_VIEW, uri);
                Intent fallbackChooser = Intent.createChooser(fallbackIntent, "Pay via UPI");
                startActivityForResult(call, fallbackChooser, "onUpiPaymentResult");
            } catch (Exception ex) {
                call.reject("Failed to open UPI app: " + ex.getMessage());
            }
        }
    }

    @ActivityCallback
    private void onUpiPaymentResult(PluginCall call, ActivityResult result) {
        if (call == null) return;

        JSObject ret = new JSObject();
        ret.put("success", true);

        // Parse the response from the UPI app if available
        Intent data = result.getData();
        int resultCode = result.getResultCode();

        if (data != null) {
            // Google Pay returns "response" as a query string: Status=SUCCESS&txnId=...
            // PhonePe returns "Status" directly as an extra
            String response = data.getStringExtra("response");
            String status = data.getStringExtra("Status");

            if (response != null) {
                ret.put("response", response);
                // Parse status from response string
                if (response.toLowerCase().contains("status=success")) {
                    ret.put("status", "SUCCESS");
                } else if (response.toLowerCase().contains("status=submitted")) {
                    ret.put("status", "SUBMITTED");
                } else if (response.toLowerCase().contains("status=failure")) {
                    ret.put("status", "FAILURE");
                    ret.put("success", false);
                }
            } else if (status != null) {
                ret.put("status", status);
                if (status.equalsIgnoreCase("FAILURE")) {
                    ret.put("success", false);
                }
            }
        }

        // If user pressed back / cancelled without completing payment
        if (resultCode == Activity.RESULT_CANCELED && data == null) {
            ret.put("status", "CANCELLED");
            // Still report success=true because the app DID open successfully;
            // the user just chose not to complete the payment.
        }

        call.resolve(ret);
    }

    @PluginMethod
    public void getInstalledUpiApps(PluginCall call) {
        JSArray list = new JSArray();
        try {
            PackageManager pm = getContext().getPackageManager();
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("upi://pay"));
            List<ResolveInfo> activities = pm.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY);
            if (activities == null || activities.isEmpty()) {
                activities = pm.queryIntentActivities(intent, 0);
            }

            HashSet<String> seen = new HashSet<>();
            if (activities != null) {
                for (ResolveInfo info : activities) {
                    if (info.activityInfo != null && info.activityInfo.packageName != null) {
                        String pkg = info.activityInfo.packageName;
                        if (!seen.contains(pkg)) {
                            seen.add(pkg);
                            JSObject app = new JSObject();
                            app.put("packageName", pkg);
                            app.put("name", info.loadLabel(pm).toString());
                            list.put(app);
                        }
                    }
                }
            }
        } catch (Exception ignored) {}

        JSObject ret = new JSObject();
        ret.put("apps", list);
        call.resolve(ret);
    }

    @PluginMethod
    public void openApp(PluginCall call) {
        String packageName = call.getString("packageName");
        if (packageName == null || packageName.isEmpty()) {
            call.reject("Package name is required");
            return;
        }

        try {
            PackageManager pm = getContext().getPackageManager();
            Intent launchIntent = pm.getLaunchIntentForPackage(packageName);
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
                if (getActivity() != null) {
                    getActivity().startActivity(launchIntent);
                } else {
                    getContext().startActivity(launchIntent);
                }

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("openedPackage", packageName);
                call.resolve(ret);
            } else {
                call.reject("App not installed: " + packageName);
            }
        } catch (Exception e) {
            call.reject("Failed to open app: " + e.getMessage());
        }
    }
}
