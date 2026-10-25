package mx.citymap.app;

import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Own the native insets so both hosted pages and bundled assets are safe.
        // SystemBars.insetsHandling is disabled to avoid applying the inset twice.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        View webContainer = (View) getBridge().getWebView().getParent();
        ViewCompat.setOnApplyWindowInsetsListener(webContainer, (view, insets) -> {
            Insets bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            Insets keyboard = insets.getInsets(WindowInsetsCompat.Type.ime());
            view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, keyboard.bottom));

            // The WebView already fits inside the safe rectangle. Do not expose
            // the same system/keyboard insets to CSS or apply them a second time.
            return new WindowInsetsCompat.Builder(insets)
                .setInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout(), Insets.NONE)
                .setInsets(WindowInsetsCompat.Type.ime(), Insets.NONE)
                .build();
        });
        ViewCompat.requestApplyInsets(webContainer);
    }
}
