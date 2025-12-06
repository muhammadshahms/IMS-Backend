const express = require("express");
const router = express.Router();
const userRoute = require("./user.route");
const adminRoute = require("./admin.route");
const attendanceRoute = require("./attendance.route")
const commentRoutes = require("./comment.route");
const mediaRoute = require("./media.route");

router.use("/api/user", userRoute);
router.use("/api/admin", adminRoute);
router.use("/api/attendance", attendanceRoute)
router.use('/api/comments', commentRoutes);
router.use('/api/media', mediaRoute);

module.exports = router;
