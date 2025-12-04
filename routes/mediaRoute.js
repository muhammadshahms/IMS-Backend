const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth");
const mediaController = require("../controllers/mediaController");

// Get user's media
router.get("/", protect, mediaController.getMediaByUser);

// Delete media
router.delete("/:id", protect, mediaController.deleteMedia);

module.exports = router;
