const express = require("express");
const likeController = require("../controllers/likeController");
const { protect, optionalProtect } = require("../middlewares/auth");

const router = express.Router();

// Test route
router.get("/test", (req, res) => res.send("Like route working"));

// Toggle like (like/unlike)
router.post("/toggle/:postId", protect, likeController.toggleLike);

// Get likes for a post (Public but checks auth status)
router.get("/post/:postId", (req, res, next) => {
    console.log("👉 Like route hit:", req.params.postId);
    next();
}, optionalProtect, likeController.getLikesByPost);

module.exports = router;
