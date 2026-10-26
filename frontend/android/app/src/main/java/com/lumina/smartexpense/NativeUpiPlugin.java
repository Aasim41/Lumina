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

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setData(Uri.parse(uriStr));

            // If a specific package is selected and installed, target it directly to bypass system chooser
            if (packageName != null && !packageName.isEmpty() && !packageName.equals("any")) {
                intent.setPackage(packageName);
            }

            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("targetedPackage", packageName != null ? packageName : "any");
            call.resolve(ret);
        } catch (Exception e) {
            // If opening targeted package fails (e.g. app uninstalled), fallback to system chooser
            try {
                Intent fallback = new Intent(Intent.ACTION_VIEW, Uri.parse(uriStr));
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().startActivity(fallback);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("fallback", true);
                call.resolve(ret);
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
            List<ResolveInfo> activities = pm.queryIntentActivities(intent, 0);

            for (ResolveInfo info : activities) {
                if (info.activityInfo != null && info.activityInfo.packageName != null) {
                    JSObject app = new JSObject();
                    app.put("packageName", info.activityInfo.packageName);
                    app.put("name", info.loadLabel(pm).toString());
                    list.put(app);
                }
            }
        } catch (Exception ignored) {}

        JSObject ret = new JSObject();
        ret.put("apps", list);
        call.resolve(ret);
    }
}
