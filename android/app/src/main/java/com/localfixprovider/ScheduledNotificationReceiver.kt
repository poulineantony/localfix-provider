package com.localfixprovider

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class ScheduledNotificationReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val notificationId = intent.getIntExtra(LocalFixNotificationHelper.EXTRA_NOTIFICATION_ID, 100001)
        val title = intent.getStringExtra(LocalFixNotificationHelper.EXTRA_NOTIFICATION_TITLE) ?: "LocalFix Provider"
        val body = intent.getStringExtra(LocalFixNotificationHelper.EXTRA_NOTIFICATION_BODY) ?: "Reminder"
        val channelId = intent.getStringExtra(LocalFixNotificationHelper.EXTRA_NOTIFICATION_CHANNEL)
        val dataJson = intent.getStringExtra(LocalFixNotificationHelper.EXTRA_NOTIFICATION_DATA)

        LocalFixNotificationHelper.showNotification(
            context,
            title,
            body,
            channelId,
            dataJson,
            notificationId,
        )
    }
}
