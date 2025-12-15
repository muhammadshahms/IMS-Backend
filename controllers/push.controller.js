const webpush = require('web-push');
const Subscription = require('../models/subscription.model');

// Setup web-push
// These should ideally be in process.env
const publicVapidKey = process.env.VAPID_PUBLIC_KEY || "BJ5669O9M7D6VrHYv42g-Zlc8oWTNlCVFOheoDxzkKsQVWgkablv74_CD-5SNY48YqitZO-5P_9v1aj6x6jQOnw";
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || "G4vyFqmNdED-SOvlVHjhJkHJGZhPnmNifZw4Gu-H5hU";

if (publicVapidKey && privateVapidKey) {
    webpush.setVapidDetails(
        'mailto:test@example.com',
        publicVapidKey,
        privateVapidKey
    );
}

const OneSignalService = require('../services/onesignal.service');

// OneSignal handles subscriptions on the client side.
exports.subscribe = async (req, res) => {
    res.status(200).json({ message: 'Use OneSignal SDK for subscription' });
};

exports.sendTestPush = async (req, res) => {
    try {
        const userId = req.user.id;
        const payload = {
            title: 'Test OneSignal',
            body: 'This is a high-priority test notification!',
            icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
            tag: 'test',
            data: { type: 'test' }
        };

        await OneSignalService.sendNotification(userId, payload);
        res.status(200).json({ message: `Sent test push via OneSignal to user ${userId}` });
    } catch (error) {
        console.error('Error sending test push:', error);
        res.status(500).json({ message: 'Failed to send test push', error: error.message });
    }
};

// Internal function to send push (used by other controllers)
exports.sendPushNotification = async (userId, payload) => {
    try {
        await OneSignalService.sendNotification(userId, payload);
    } catch (err) {
        console.error('Error sending internal push', err);
    }
};
