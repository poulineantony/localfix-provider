package com.localfixprovider

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import kotlin.random.Random

object LocalFixNotificationHelper {
    const val EXTRA_NOTIFICATION_ID = "localfix_notification_id"
    const val EXTRA_NOTIFICATION_TITLE = "localfix_notification_title"
    const val EXTRA_NOTIFICATION_BODY = "localfix_notification_body"
    const val EXTRA_NOTIFICATION_CHANNEL = "localfix_notification_channel"
    const val EXTRA_NOTIFICATION_DATA = "localfix_notification_data"

    private const val CHANNEL_GENERAL = "localfix_general"
    private const val CHANNEL_SECURITY = "localfix_security"
    private const val CHANNEL_BOOKING = "localfix_booking"
    private const val CHANNEL_NEW_JOB = "localfix_new_job"
    private const val CHANNEL_REMINDER = "localfix_reminder"
    private const val CHANNEL_SOS = "localfix_sos"

    private fun getCustomSoundUri(context: Context): Uri {
        return Uri.parse("android.resource://${context.packageName}/${R.raw.ios_subtle_ping}")
    }

    fun ensureChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val soundUri = getCustomSoundUri(context)
        val audioAttributes = AudioAttributes.Builder()
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
            .build()

        val bookingVibration = longArrayOf(0, 400, 200, 400, 200, 400)

        val channels = listOf(
            NotificationChannel(CHANNEL_GENERAL, "General Updates", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "General LocalFix updates"
                setSound(soundUri, audioAttributes)
            },
            NotificationChannel(CHANNEL_SECURITY, "Security Alerts", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Login and account security alerts"
            },
            // Standard booking status updates
            NotificationChannel(CHANNEL_BOOKING, "Booking Updates", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Booking status changes"
                setSound(soundUri, audioAttributes)
                enableVibration(true)
                vibrationPattern = bookingVibration
            },
            // NEW JOB REQUEST — max importance so it appears as heads-up even when app is open
            NotificationChannel(CHANNEL_NEW_JOB, "New Job Requests", NotificationManager.IMPORTANCE_MAX).apply {
                description = "New incoming job requests from customers"
                setSound(soundUri, audioAttributes)
                enableVibration(true)
                vibrationPattern = bookingVibration
                setBypassDnd(true)
            },
            NotificationChannel(CHANNEL_REMINDER, "Reminders", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "Upcoming service and job reminders"
            },
            NotificationChannel(CHANNEL_SOS, "SOS Alerts", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Emergency booking alerts"
                setSound(soundUri, audioAttributes)
            },
        )

        notificationManager.createNotificationChannels(channels)
    }

    private fun resolveChannel(channelId: String?): String = when (channelId) {
        CHANNEL_SECURITY, "security" -> CHANNEL_SECURITY
        CHANNEL_NEW_JOB, "new_job" -> CHANNEL_NEW_JOB
        CHANNEL_BOOKING, "booking" -> CHANNEL_BOOKING
        CHANNEL_REMINDER, "reminder" -> CHANNEL_REMINDER
        CHANNEL_SOS, "sos" -> CHANNEL_SOS
        else -> CHANNEL_GENERAL
    }

    fun showNotification(
        context: Context,
        title: String,
        body: String,
        channelId: String?,
        dataJson: String?,
        notificationId: Int = Random.nextInt(100000, 999999),
    ) {
        ensureChannels(context)

        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            ?: Intent(context, MainActivity::class.java)
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        launchIntent.putExtra(EXTRA_NOTIFICATION_ID, notificationId)
        launchIntent.putExtra(EXTRA_NOTIFICATION_TITLE, title)
        launchIntent.putExtra(EXTRA_NOTIFICATION_BODY, body)
        launchIntent.putExtra(EXTRA_NOTIFICATION_CHANNEL, resolveChannel(channelId))
        launchIntent.putExtra(EXTRA_NOTIFICATION_DATA, dataJson ?: "{}")

        val pendingIntentFlags = PendingIntent.FLAG_UPDATE_CURRENT or
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        val pendingIntent = PendingIntent.getActivity(context, notificationId, launchIntent, pendingIntentFlags)

        val resolvedChannel = resolveChannel(channelId)
        val builder = NotificationCompat.Builder(context, resolvedChannel)
            .setSmallIcon(context.applicationInfo.icon)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setDefaults(NotificationCompat.DEFAULT_VIBRATE or NotificationCompat.DEFAULT_LIGHTS)
            .setSound(getCustomSoundUri(context))

        NotificationManagerCompat.from(context).notify(notificationId, builder.build())
    }

    fun scheduleNotification(
        context: Context,
        notificationId: Int,
        title: String,
        body: String,
        triggerAtMs: Long,
        channelId: String?,
        dataJson: String?,
    ) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, ScheduledNotificationReceiver::class.java).apply {
            putExtra(EXTRA_NOTIFICATION_ID, notificationId)
            putExtra(EXTRA_NOTIFICATION_TITLE, title)
            putExtra(EXTRA_NOTIFICATION_BODY, body)
            putExtra(EXTRA_NOTIFICATION_CHANNEL, resolveChannel(channelId))
            putExtra(EXTRA_NOTIFICATION_DATA, dataJson ?: "{}")
        }

        val pendingIntentFlags = PendingIntent.FLAG_UPDATE_CURRENT or
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        val pendingIntent = PendingIntent.getBroadcast(context, notificationId, intent, pendingIntentFlags)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent)
        } else {
            alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent)
        }
    }
}
