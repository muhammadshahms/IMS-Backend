const Att = require("../models/AttModel");
const User = require("../models/userModel");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const paginate = require("../utils/paginate");

const attendanceController = {};

// ✅ Helper function to validate ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) &&
    /^[0-9a-fA-F]{24}$/.test(id);
};

// ✅ 1. Check-In
attendanceController.checkin = async (req, res) => {
  try {
    const { _id } = req.params;
    const allowedIPs = [
      process.env.IP_ADDRESS_ONE,
      process.env.IP_ADDRESS_TWO,
    ];

    const clientIP =
      req.headers["x-forwarded-for"]?.split(",")[0] || req.connection.remoteAddress;

    console.log("Client IP:", clientIP);

    if (!allowedIPs.includes(clientIP)) {
      return res.status(403).json({ error: "Attendance only allowed from incubation network" });
    }

    if (!_id || _id === 'undefined' || _id === 'null') {
      return res.status(400).json({ error: "User ID is required" });
    }

    if (!isValidObjectId(_id)) {
      return res.status(400).json({ error: "Invalid User ID format" });
    }

    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const now = moment().tz("Asia/Karachi");
    const today = now.format("YYYY-MM-DD");

    const startOfDay = now.clone().startOf("day").toDate();
    const endOfDay = now.clone().endOf("day").toDate();
    const fourPM = now.clone().set({ hour: 16, minute: 0, second: 0, millisecond: 0 });

    console.log("Server time (Karachi):", now.format());
    console.log("Is late?", now.isAfter(fourPM));

    // Find today's attendance
    let att = await Att.findOne({
      user: _id,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    if (att && att.checkInTime) {
      return res.status(400).json({ error: "Already checked in today" });
    }

    const status = now.isBefore(fourPM) ? "Present" : "Late";

    if (!att) {
      att = await Att.create({
        user: _id,
        checkInTime: now.toDate(),
        status,
      });
    } else {
      att.checkInTime = now.toDate();
      att.status = status;
      await att.save();
    }

    res.json({ message: "Check-in successful", att });
  } catch (err) {
    console.error("Check-in error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
};

// ✅ 2. Check-Out
attendanceController.checkout = async (req, res) => {
  try {
    const { _id } = req.params;
    const allowedIPs = [
      process.env.IP_ADDRESS_ONE,
      process.env.IP_ADDRESS_TWO,
    ];

    const clientIP =
      req.headers["x-forwarded-for"]?.split(",")[0] || req.connection.remoteAddress;

    console.log("Client IP:", clientIP);

    if (!allowedIPs.includes(clientIP)) {
      return res.status(403).json({ error: "Attendance only allowed from incubation network" });
    }

    if (!_id || _id === 'undefined' || _id === 'null') {
      return res.status(400).json({ error: "User ID is required" });
    }

    if (!isValidObjectId(_id)) {
      return res.status(400).json({ error: "Invalid User ID format" });
    }

    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    let att = await Att.findOne({
      user: _id,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    if (!att) return res.status(400).json({ error: "Not checked in today" });
    if (att.checkOutTime)
      return res.status(400).json({ error: "Already checked out" });

    att.checkOutTime = now;
    await att.save();

    res.json({ message: "Check-out successful", att });
  } catch (err) {
    console.error("Check-out error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
};

// ✅ 3. Get Single User's Today's Status
attendanceController.getAttendanceStatus = async (req, res) => {
  try {
    const { _id } = req.params;

    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const attendance = await Att.findOne({
      user: _id,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    if (!attendance) {
      return res.json({
        status: "N/A",
        checkInTime: null,
        checkOutTime: null,
      });
    }

    res.json({
      status: attendance.status,
      checkInTime: attendance.checkInTime,
      checkOutTime: attendance.checkOutTime,
    });
  } catch (err) {
    console.error("Get status error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
};

// ✅ 4. Get All Users' Today's Status (Already has pagination)
attendanceController.getAllUserStatus = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const total = await User.countDocuments();
    const users = await User.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const userIds = users.map(u => u._id);
    const attendances = await Att.find({
      user: { $in: userIds },
      checkInTime: { $gte: today },
    }).lean();

    const attendanceMap = new Map(
      attendances.map(att => [att.user.toString(), att])
    );

    const userStatuses = users.map(user => {
      const attendance = attendanceMap.get(user._id.toString());
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: attendance ? attendance.status : "Absent",
        checkInTime: attendance?.checkInTime || null,
        checkOutTime: attendance?.checkOutTime || null,
      };
    });

    res.json({
      data: userStatuses,
      pagination: {
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        limit,
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching statuses:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};

// ✅ 5. Get Full Attendance History (Already uses paginate utility)
attendanceController.getAttendanceHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await paginate({
      model: Att,
      page,
      limit,
      query: {},
      sort: { createdAt: -1 },
      populate: { path: "user", select: "name email" }
    });

    res.status(200).json(result);

  } catch (err) {
    console.error("Get history error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
};

// ✅ 6. Get Specific User History By Name (NOW WITH PAGINATION)
attendanceController.getUserHistoryByName = async (req, res) => {
  try {
    const { name } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: "Name parameter is required" });
    }

    const user = await User.findOne({ name: { $regex: new RegExp(name, "i") } });

    if (!user) return res.status(404).json({ error: "User not found" });

    const result = await paginate({
      model: Att,
      page,
      limit,
      query: { user: user._id },
      sort: { createdAt: -1 },
      populate: null
    });

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        banoqabilId: user.bq_id,
      },
      history: result.data,
      pagination: result.pagination
    });
  } catch (err) {
    console.error("Get user history by name error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
};

// ✅ 7. Get User History By ID (NOW WITH PAGINATION)
attendanceController.getUserHistoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ error: "User ID is required" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid User ID format" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const result = await paginate({
      model: Att,
      page,
      limit,
      query: { user: user._id },
      sort: { createdAt: -1 },
      populate: null
    });

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        banoqabilId: user.bq_id,
      },
      history: result.data,
      pagination: result.pagination
    });
  } catch (err) {
    console.error("Get user history by ID error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
};

// ✅ 8. Update Attendance Record (Admin use)
attendanceController.updateAttendanceRecord = async (req, res) => {
  try {
    const { attendanceId } = req.params;

    if (!attendanceId || attendanceId === 'undefined' || attendanceId === 'null') {
      return res.status(400).json({ error: "Attendance ID is required" });
    }

    if (!isValidObjectId(attendanceId)) {
      return res.status(400).json({ error: "Invalid Attendance ID format" });
    }

    const { checkInTime, checkOutTime, status } = req.body;

    const updated = await Att.findByIdAndUpdate(
      attendanceId,
      { checkInTime, checkOutTime, status },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Record not found" });
    res.json({ message: "Record updated", updated });
  } catch (err) {
    console.error("Update attendance error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
};

// ✅ 9. Delete Attendance Record
attendanceController.deleteAttendanceRecord = async (req, res) => {
  try {
    const { attendanceId } = req.params;

    if (!attendanceId || attendanceId === 'undefined' || attendanceId === 'null') {
      return res.status(400).json({ error: "Attendance ID is required" });
    }

    if (!isValidObjectId(attendanceId)) {
      return res.status(400).json({ error: "Invalid Attendance ID format" });
    }

    const deleted = await Att.findByIdAndDelete(attendanceId);
    if (!deleted) return res.status(404).json({ error: "Record not found" });

    res.json({ message: "Attendance record deleted" });
  } catch (err) {
    console.error("Delete attendance error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
};

module.exports = attendanceController;