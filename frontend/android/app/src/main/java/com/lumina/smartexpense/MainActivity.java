package com.lumina.smartexpense;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeSmsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
