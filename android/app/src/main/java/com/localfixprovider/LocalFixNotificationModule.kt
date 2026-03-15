package com.localfixprovider

import android.os.Build
import android.provider.Settings
import androidx.core.content.pm.PackageInfoCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.google.firebase.messaging.FirebaseMessaging
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.abs

class LocalFixNotificationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "LocalFixNotifications"

    @ReactMethod
    fun getDeviceInfo(promise: Promise) {
        try {
            val packageInfo = reactContext.packageManager.getPackageInfo(reactContext.packageName, 0)
            val deviceInfo = Arguments.createMap()

            deviceInfo.putString(
                "deviceId",
                Settings.Secure.getString(reactContext.contentResolver, Settings.Secure.ANDROID_ID)
                    ?: Build.ID
            )
            deviceInfo.putString("deviceModel", Build.MODEL ?: "Android")
            deviceInfo.putString("manufacturer", Build.MANUFACTURER ?: "Unknown")
            deviceInfo.putString("brand", Build.BRAND ?: "Unknown")
            deviceInfo.putString("deviceName", Build.DEVICE ?: Build.MODEL ?: "Android")
            deviceInfo.putString("platform", "android")
            deviceInfo.putString("osVersion", Build.VERSION.RELEASE ?: "0")
            deviceInfo.putInt("sdkInt", Build.VERSION.SDK_INT)
            deviceInfo.putString("appVersion", packageInfo.versionName ?: "1.0.0")
            deviceInfo.putString("buildNumber", PackageInfoCompat.getLongVersionCode(packageInfo).toString())
            deviceInfo.putBoolean("isEmulator", isProbablyEmulator())

            promise.resolve(deviceInfo)
        } catch (error: Exception) {
            promise.reject("DEVICE_INFO_ERROR", error)
        }
    }

    @ReactMethod
    fun getFcmToken(promise: Promise) {
        FirebaseMessaging.getInstance().token
            .addOnCompleteListener { task ->
                if (!task.isSuccessful) {
                    promise.reject("FCM_TOKEN_ERROR", task.exception)
                    return@addOnCompleteListener
                }

                promise.resolve(task.result)
            }
    }

    @ReactMethod
    fun displayLocalNotification(
        title: String,
        body: String,
        channelId: String?,
        data: ReadableMap?,
        promise: Promise,
    ) {
        try {
            LocalFixNotificationHelper.showNotification(
                reactContext,
                title,
                body,
                channelId,
                toJsonString(data),
            )
            promise.resolve(true)
        } catch (error: Exception) {
            promise.reject("DISPLAY_NOTIFICATION_ERROR", error)
        }
    }

    @ReactMethod
    fun scheduleLocalNotification(
        notificationKey: String,
        title: String,
        body: String,
        triggerAtMs: Double,
        channelId: String?,
        data: ReadableMap?,
        promise: Promise,
    ) {
        try {
            val notificationId = abs(notificationKey.hashCode())
            LocalFixNotificationHelper.scheduleNotification(
                reactContext,
                notificationId,
                title,
                body,
                triggerAtMs.toLong(),
                channelId,
                toJsonString(data),
            )
            promise.resolve(true)
        } catch (error: Exception) {
            promise.reject("SCHEDULE_NOTIFICATION_ERROR", error)
        }
    }

    private fun toJsonString(map: ReadableMap?): String {
        if (map == null) {
            return "{}"
        }

        val json = JSONObject()
        val iterator = map.keySetIterator()

        while (iterator.hasNextKey()) {
            val key = iterator.nextKey()
            when (map.getType(key)) {
                ReadableType.Null -> json.put(key, JSONObject.NULL)
                ReadableType.Boolean -> json.put(key, map.getBoolean(key))
                ReadableType.Number -> json.put(key, map.getDouble(key))
                ReadableType.String -> json.put(key, map.getString(key))
                ReadableType.Map -> json.put(key, map.getMap(key)?.toHashMap())
                ReadableType.Array -> json.put(key, JSONArray(map.getArray(key)?.toArrayList()))
            }
        }

        return json.toString()
    }

    private fun isProbablyEmulator(): Boolean {
        return Build.FINGERPRINT.startsWith("generic")
            || Build.FINGERPRINT.lowercase().contains("emulator")
            || Build.MODEL.contains("Emulator")
            || Build.MODEL.contains("Android SDK built for x86")
            || Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic")
            || "google_sdk" == Build.PRODUCT
    }
}
