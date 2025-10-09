const express = require("express");
const router = express.Router();
const userRoute = require("./userRoute");
const adminRoute = require("./adminRoute");
const attendanceRoute = require("./attendanceRoute")

router.use("/api/user", userRoute);
router.use("/api/admin", adminRoute);
router.use("/api/attendance", attendanceRoute)

module.exports = router;
