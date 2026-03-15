package com.localfixprovider

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import org.json.JSONObject

class LocalFixFirebaseMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        super.onNewToken(token)
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        val title = remoteMessage.data["title"]
            ?: remoteMessage.notification?.title
            ?: "LocalFix Provider"
        val body = remoteMessage.data["body"]
            ?: remoteMessage.notification?.body
            ?: "You have a new update."
        val channelId = remoteMessage.data["channelId"] ?: remoteMessage.data["channel"]
        val dataJson = JSONObject(remoteMessage.data as Map<*, *>).toString()

        LocalFixNotificationHelper.showNotification(
            this,
            title,
            body,
            channelId,
            dataJson,
        )
    }
}
