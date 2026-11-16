package com.lumina.smartexpense;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.HashSet;
import java.util.List;

@CapacitorPlugin(name = "NativeUpi")
public class NativeUpiPlugin extends Plugin {

    private static final int UPI_REQUEST_CODE = 1001;

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
                pm.getPackageInfo(packageName, 0);
                isPackageInstalled = true;
            } catch (Exception ignored) {
                isPackageInstalled = false;
            }
        }

        try {
            if (isPackageInstalled) {
                // 1. Direct Target Launch: open the selected UPI app immediately with verified package
                Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                intent.setPackage(packageName);
                intent.addCategory(Intent.CATEGORY_DEFAULT);
                intent.addCategory(Intent.CATEGORY_BROWSABLE);

                // Crucial NPCI UPI Intent requirement:
                // Launch via startActivityForResult so Android passes the caller package identity
                // (getCallingPackage() == "com.lumina.smartexpense") and brings the target activity
                // directly to the FOREGROUND window over MainActivity instead of detaching into background.
                getActivity().startActivityForResult(intent, UPI_REQUEST_CODE);
                getActivity().overridePendingTransition(0, 0);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("targetedPackage", packageName);
                ret.put("direct", true);
                call.resolve(ret);
                return;
            }

            // 2. System Chooser Launch: user chose "any" or requested app was not installed
            Intent baseIntent = new Intent(Intent.ACTION_VIEW, uri);
            baseIntent.addCategory(Intent.CATEGORY_DEFAULT);
            baseIntent.addCategory(Intent.CATEGORY_BROWSABLE);

            Intent chooser = Intent.createChooser(baseIntent, "Pay via UPI");
            getActivity().startActivityForResult(chooser, UPI_REQUEST_CODE);
            getActivity().overridePendingTransition(0, 0);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("targetedPackage", "any");
            ret.put("chooser", true);
            call.resolve(ret);

        } catch (Exception e) {
            // 3. Fallback: query any intent activity that can handle upi://pay and launch directly
            try {
                Intent testIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("upi://pay"));
                testIntent.addCategory(Intent.CATEGORY_DEFAULT);
                List<ResolveInfo> matches = pm.queryIntentActivities(testIntent, 0);

                if (matches != null && !matches.isEmpty()) {
                    String firstPkg = matches.get(0).activityInfo.packageName;
                    Intent directIntent = new Intent(Intent.ACTION_VIEW, uri);
                    directIntent.setPackage(firstPkg);
                    directIntent.addCategory(Intent.CATEGORY_DEFAULT);
                    directIntent.addCategory(Intent.CATEGORY_BROWSABLE);

                    getActivity().startActivityForResult(directIntent, UPI_REQUEST_CODE);
                    getActivity().overridePendingTransition(0, 0);

                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    ret.put("targetedPackage", firstPkg);
                    ret.put("fallback", true);
                    call.resolve(ret);
                    return;
                }
            } catch (Exception ignored) {}

            // 4. Ultimate fallback: standard startActivity with chooser
            try {
                Intent fallbackIntent = new Intent(Intent.ACTION_VIEW, uri);
                Intent fallbackChooser = Intent.createChooser(fallbackIntent, "Pay via UPI");
                getActivity().startActivity(fallbackChooser);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("targetedPackage", "any");
                ret.put("ultimate_fallback", true);
                call.resolve(ret);
                return;
            } catch (Exception ex) {
                call.reject("Failed to open UPI app: " + ex.getMessage());
            }
        }
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
}
