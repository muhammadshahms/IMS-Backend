const webpush = require('web-push');
const Subscription = require('../models/subscription.model');

// Setup web-push
// These should ideally be in process.env
const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

if (publicVapidKey && privateVapidKey) {
    webpush.setVapidDetails(
        'mailto:test@example.com',
        publicVapidKey,
        privateVapidKey
    );
}

exports.subscribe = async (req, res) => {
    try {
        const subscription = req.body;
        const userId = req.user.id; // From auth middleware

        // Check if subscription already exists
        const existingSub = await Subscription.findOne({ endpoint: subscription.endpoint });

        if (existingSub) {
            // Update user if changed (optional, but good practice)
            if (existingSub.userId.toString() !== userId) {
                existingSub.userId = userId;
                await existingSub.save();
            }
            return res.status(200).json({ message: 'Subscription updated' });
        }

        const newSubscription = new Subscription({
            userId: userId,
            endpoint: subscription.endpoint,
            keys: subscription.keys
        });

        await newSubscription.save();
        res.status(201).json({ message: 'Subscription saved' });
    } catch (error) {
        console.error('Error saving subscription:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Internal/Test function to send push
exports.sendPushNotification = async (userId, payload) => {
    try {
        const subscriptions = await Subscription.find({ userId: userId });
        console.log(`Sending push to user ${userId}, found ${subscriptions.length} subscriptions`);

        const notifications = subscriptions.map(sub => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: sub.keys
            };
            return webpush.sendNotification(pushSubscription, JSON.stringify(payload))
                .catch(err => {
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        // Subscription is gone, delete it
                        Subscription.deleteOne({ _id: sub._id }).exec();
                    }
                    console.error('Error sending push', err);
                });
        });

        await Promise.all(notifications);
    } catch (err) {
        console.error('Error finding subscriptions', err);
    }
};
