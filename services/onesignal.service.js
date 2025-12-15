const axios = require('axios');

// REPLACE THESE WITH YOUR ONESIGNAL CREDENTIALS
const ONE_SIGNAL_APP_ID = "62b37eb6-08ac-40c0-8099-3ea1d1959dd6";
const ONE_SIGNAL_API_KEY = "os_v2_app_mkzx5nqivrambaezh2q5dfm523qckrwhxguedz4euae6hxu4drw4ul4izsolv2noyq7h5nxblrqm4egeycn6hmvp3fyxwd4mr4fnedi";

/**
 * Send a notification via OneSignal
 * @param {string} userId - The user ID (database ID) to target
 * @param {object} payload - Notification payload { title, body, icon, data, url }
 */
const sendNotification = async (userId, payload) => {
    const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Basic ${ONE_SIGNAL_API_KEY}`
    };

    // Construct OneSignal payload
    const body = {
        app_id: ONE_SIGNAL_APP_ID,
        include_external_user_ids: [userId.toString()], // Target users by their setExternalUserId
        contents: { en: payload.body },
        headings: { en: payload.title },
        data: payload.data || {},
        // UI Customization
        small_icon: "ic_stat_onesignal_default", // Default Android icon resource
        large_icon: payload.icon, // Network URL to sender's avatar
        chrome_web_icon: payload.icon,
        chrome_web_badge: payload.badge || payload.icon,
        url: payload.data?.url, // Deep link URL
        channel_for_external_user_ids: "push",
        priority: 10 // High Priority
    };

    try {
        const response = await axios.post("https://onesignal.com/api/v1/notifications", body, { headers });
        console.log("✅ OneSignal push sent:", response.data);
        return response.data;
    } catch (error) {
        console.error("❌ OneSignal push error:", error.response?.data || error.message);
    }
};

module.exports = { sendNotification };
