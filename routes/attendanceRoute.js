const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");

router.post("/checkin/:_id", attendanceController.checkin);
router.post("/checkout/:_id", attendanceController.checkout);
router.get("/status/:_id", attendanceController.getAttendanceStatus);
router.get("/status", attendanceController.getAllUserStatus);
router.get("/history", attendanceController.getAttendanceHistory);
router.get("/history/:id", attendanceController.getUserHistoryById);
router.get("/history/by-name/:name", attendanceController.getUserHistoryByName);
router.put("/update/:attendanceId", attendanceController.updateAttendanceRecord);
router.delete("/delete/:attendanceId", attendanceController.deleteAttendanceRecord);

module.exports = router;