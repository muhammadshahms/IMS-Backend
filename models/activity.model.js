const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        enum: ['login', 'logout'],
        required: true
    },
    // Device Information
    device: {
        type: {
            type: String,
            enum: ['desktop', 'mobile', 'tablet', 'unknown'],
            default: 'unknown'
        },
        browser: String,
        os: String,
        platform: String
    },
    // Network Information
    ip: {
        type: String,
        required: true
    },
    location: {
        country: String,
        region: String,
        city: String,
        timezone: String,
        coordinates: {
            latitude: Number,
            longitude: Number
        }
    },
    // User Agent
    userAgent: String,

    // Session Information
    sessionId: String,

    // Timestamps
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for better query performance
activitySchema.index({ userId: 1, timestamp: -1 });
activitySchema.index({ action: 1 });
activitySchema.index({ 'device.type': 1 });

const Activity = mongoose.model('Activity', activitySchema, 'loginactivities');

module.exports = Activity;
