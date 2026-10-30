package com.lumina.smartexpense;

import android.Manifest;
import android.database.Cursor;
import android.net.Uri;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "NativeSms",
    permissions = {
        @Permission(
            alias = "sms",
            strings = { Manifest.permission.READ_SMS }
        )
    }
)
public class NativeSmsPlugin extends Plugin {

    @PluginMethod
    public void getSms(PluginCall call) {
        if (getPermissionState("sms") != PermissionState.GRANTED) {
            requestPermissionForAlias("sms", call, "smsPermsCallback");
        } else {
            readSmsAndResolve(call);
        }
    }

    @PermissionCallback
    private void smsPermsCallback(PluginCall call) {
        if (getPermissionState("sms") == PermissionState.GRANTED) {
            readSmsAndResolve(call);
        } else {
            call.reject("Permission is required to read SMS");
        }
    }

    private void readSmsAndResolve(PluginCall call) {
        JSArray smsList = new JSArray();
        Cursor cursor = null;
        try {
            Uri uri = Uri.parse("content://sms/inbox");
            String[] projection = new String[]{ "body", "address", "date" };
            cursor = getContext().getContentResolver().query(uri, projection, null, null, "date DESC");
            
            if (cursor != null) {
                int indexBody = cursor.getColumnIndex("body");
                int indexAddress = cursor.getColumnIndex("address");
                int indexDate = cursor.getColumnIndex("date");
                int count = 0;
                
                while (cursor.moveToNext() && count < 500) {
                    String body = indexBody != -1 ? cursor.getString(indexBody) : "";
                    String address = indexAddress != -1 ? cursor.getString(indexAddress) : "";
                    String date = indexDate != -1 ? cursor.getString(indexDate) : "";
                    
                    if (body != null && !body.trim().isEmpty()) {
                        JSObject sms = new JSObject();
                        sms.put("body", body);
                        sms.put("address", address != null ? address : "");
                        sms.put("date", date != null ? date : "");
                        smsList.put(sms);
                        count++;
                    }
                }
            }
        } catch (Exception e) {
            call.reject("Failed to read SMS: " + e.getMessage(), e);
            return;
        } finally {
            if (cursor != null) {
                try {
                    cursor.close();
                } catch (Exception ignored) {}
            }
        }
        
        JSObject ret = new JSObject();
        ret.put("smsList", smsList);
        call.resolve(ret);
    }
}
