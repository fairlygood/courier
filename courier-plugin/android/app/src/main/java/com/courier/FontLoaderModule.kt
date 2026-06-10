package com.courier

import android.graphics.Typeface
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.views.text.ReactFontManager
import java.io.File

class FontLoaderModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "FontLoaderModule"

    @ReactMethod
    fun loadFont(fontFamily: String, filePath: String, promise: Promise) {
        try {
            val file = File(filePath)
            if (!file.exists()) {
                promise.reject("FONT_NOT_FOUND", "Font file not found: $filePath")
                return
            }
            val typeface = Typeface.createFromFile(file)
            ReactFontManager.getInstance().setTypeface(fontFamily, Typeface.NORMAL, typeface)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("FONT_LOAD_ERROR", e.message)
        }
    }
}
