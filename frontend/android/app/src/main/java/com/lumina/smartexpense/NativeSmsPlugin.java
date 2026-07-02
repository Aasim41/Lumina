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
        try {
            Uri uri = Uri.parse("content://sms/inbox");
            // Only fetch last 200 messages for performance
            Cursor cursor = getContext().getContentResolver().query(uri, null, null, null, "date DESC LIMIT 200");
            
            if (cursor != null) {
                int indexBody = cursor.getColumnIndex("body");
                int indexAddress = cursor.getColumnIndex("address");
                int indexDate = cursor.getColumnIndex("date");
                
                while (cursor.moveToNext()) {
                    JSObject sms = new JSObject();
                    sms.put("body", cursor.getString(indexBody));
                    sms.put("address", cursor.getString(indexAddress));
                    sms.put("date", cursor.getString(indexDate));
                    smsList.put(sms);
                }
                cursor.close();
            }
        } catch (Exception e) {
            call.reject("Failed to read SMS: " + e.getMessage(), e);
            return;
        }
        
        JSObject ret = new JSObject();
        ret.put("smsList", smsList);
        call.resolve(ret);
    }
}
