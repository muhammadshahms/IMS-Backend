const mongoose = require("mongoose");

const likeSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
        },
        post: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "userpost",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index to ensure a user can only like a post once
likeSchema.index({ user: 1, post: 1 }, { unique: true });

// Index for efficient querying of likes by post
likeSchema.index({ post: 1, createdAt: -1 });

const likeModel = mongoose.model("like", likeSchema);

module.exports = likeModel;
