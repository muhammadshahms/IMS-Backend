const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");
const validateObjectId = require("../middlewares/validateObjectId");

router.post("/checkin/:_id",  attendanceController.checkin);
router.post("/checkout/:_id", validateObjectId('_id'), attendanceController.checkout);
router.get("/status/:_id", validateObjectId('_id'), attendanceController.getAttendanceStatus);
router.get("/status", attendanceController.getAllUserStatus);
router.get("/history", attendanceController.getAttendanceHistory);
router.get("/history/:id", validateObjectId('id'), attendanceController.getUserHistoryById);
router.get("/history/by-name/:name", attendanceController.getUserHistoryByName);
router.put("/update/:attendanceId", validateObjectId('attendanceId'), attendanceController.updateAttendanceRecord);
router.delete("/delete/:attendanceId", validateObjectId('attendanceId'), attendanceController.deleteAttendanceRecord);

module.exports = router;