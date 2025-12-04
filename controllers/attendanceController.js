const Att = require("../models/AttModel");
const User = require("../models/userModel");
const AttendanceSettings = require("../models/AttendanceSettingsModel");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const paginate = require("../utils/paginate");

const attendanceController = {};

// ✅ Helper function to validate ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) &&
    /^[0-9a-fA-F]{24}$/.test(id);
};

// ✅ Get settings (cached for performance)
let cachedSettings = null;
let cacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getSettings = async () => {
  const now = Date.now();
  if (cachedSettings && cacheTime && (now - cacheTime) < CACHE_DURATION) {
    return cachedSettings;
  }
  cachedSettings = await AttendanceSettings.getSettings();
  cacheTime = now;
  return cachedSettings;
};

// ✅ Helper: Get user's assigned shift config
const getUserShiftConfig = async (user) => {
  if (!user || !user.shift) return null;
  const settings = await getSettings();
  return settings.shifts[user.shift] || null;
};

// ✅ Helper: Check if current time is within shift hours
const isWithinShiftHours = async (now, shiftConfig) => {
  const settings = await getSettings();
  const hour = now.hour();
  const earliestCheckIn = shiftConfig.startHour - (settings.allowEarlyCheckIn / 60);
  const latestCheckIn = shiftConfig.endHour - 1;
  return hour >= earliestCheckIn && hour < latestCheckIn;
};

// ✅ FIXED: Calculate attendance status with proper early leave detection
const calculateStatus = (checkInTime, checkOutTime, shiftConfig, now) => {
  const checkIn = moment(checkInTime).tz("Asia/Karachi");
  const checkOut = checkOutTime ? moment(checkOutTime).tz("Asia/Karachi") : null;
  const currentTime = now || moment().tz("Asia/Karachi");

  // **FIX: Shift times based on check-in date, handle cross-day properly**
  const shiftStart = checkIn.clone().set({ hour: shiftConfig.startHour, minute: 0, second: 0 });
  let shiftEnd = checkIn.clone().set({ hour: shiftConfig.endHour, minute: 0, second: 0 });

  // If shift end time is less than start time, it means shift crosses midnight
  if (shiftConfig.endHour <= shiftConfig.startHour) {
    shiftEnd.add(1, 'day');
  }

  // Late threshold calculation
  const lateThreshold = shiftStart.clone().add(shiftConfig.lateThresholdMinutes, 'minutes');
  const isLate = checkIn.isAfter(lateThreshold);

  let lateByMinutes = 0;
  if (isLate) {
    lateByMinutes = checkIn.diff(lateThreshold, 'minutes');
  }

  let isEarlyLeave = false;
  let earlyByMinutes = 0;
  let hoursWorked = 0;
  let noCheckoutLate = false;

  if (checkOut) {
    // **FIX: Early leave threshold - subtract minutes from shift END time**
    const earlyLeaveThreshold = shiftEnd.clone().subtract(shiftConfig.earlyLeaveThresholdMinutes, 'minutes');
    isEarlyLeave = checkOut.isBefore(earlyLeaveThreshold);

    if (isEarlyLeave) {
      earlyByMinutes = earlyLeaveThreshold.diff(checkOut, 'minutes');
    }

    hoursWorked = checkOut.diff(checkIn, 'hours', true);
  } else {
    // No checkout - check if we should mark as late
    const noCheckoutThreshold = shiftEnd.clone().add(shiftConfig.noCheckoutLateMinutes || 60, 'minutes');
    if (currentTime.isAfter(noCheckoutThreshold)) {
      noCheckoutLate = true;
      // Calculate hours as if they left at shift end
      hoursWorked = shiftEnd.diff(checkIn, 'hours', true);
    } else {
      // Still within grace period, calculate current hours
      hoursWorked = currentTime.diff(checkIn, 'hours', true);
    }
  }

  // Determine final status
  let status = 'Present';

  if (!checkOut) {
    if (noCheckoutLate) {
      status = isLate ? 'Late + No Checkout' : 'No Checkout';
    } else {
      status = isLate ? 'Late' : 'Present';
    }
  } else if (hoursWorked < shiftConfig.minHoursForPresent) {
    status = 'Incomplete';
  } else if (isLate && isEarlyLeave) {
    status = 'Late + Early Leave';
  } else if (isLate) {
    status = 'Late';
  } else if (isEarlyLeave) {
    status = 'Early Leave';
  }

  return {
    status,
    isLate,
    isEarlyLeave,
    noCheckoutLate,
    hoursWorked: Math.round(hoursWorked * 100) / 100,
    lateByMinutes,
    earlyByMinutes
  };
};

// ✅ 1. Check-In
attendanceController.checkin = async (req, res) => {
  try {
    const { _id } = req.params;
    const settings = await getSettings();

    // IP validation
    const allowedIPs = [
      process.env.IP_ADDRESS_ONE,
      process.env.IP_ADDRESS_TWO,
      ...settings.allowedIPs
    ].filter(Boolean);

    const clientIP = req.headers["x-forwarded-for"]?.split(",")[0] || req.connection.remoteAddress;
    console.log("Client IP:", clientIP);

    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
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

    const shiftConfig = await getUserShiftConfig(user);
    if (!shiftConfig) {
      return res.status(400).json({
        error: "No shift assigned to your profile. Please contact admin.",
        availableShifts: Object.keys(settings.shifts)
      });
    }

    const now = moment().tz(settings.timezone);

    if (!await isWithinShiftHours(now, shiftConfig)) {
      return res.status(400).json({
        error: `Check-in is only allowed during your ${user.shift} shift hours`,
        yourShift: {
          name: user.shift,
          start: `${shiftConfig.startHour}:00`,
          end: `${shiftConfig.endHour}:00`
        },
        currentTime: now.format("hh:mm A")
      });
    }

    const startOfDay = now.clone().startOf("day").toDate();
    const endOfDay = now.clone().endOf("day").toDate();

    let att = await Att.findOne({
      user: _id,
      shift: user.shift,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    if (att && att.checkInTime) {
      return res.status(400).json({
        error: `Already checked in for ${user.shift} shift today`,
        checkInTime: moment(att.checkInTime).tz(settings.timezone).format("hh:mm A")
      });
    }

    const { status, isLate, lateByMinutes } = calculateStatus(now.toDate(), null, shiftConfig, now);

    if (!att) {
      att = await Att.create({
        user: _id,
        shift: user.shift,
        checkInTime: now.toDate(),
        status,
        isLate,
        isEarlyLeave: false,
        hoursWorked: 0
      });
    } else {
      att.checkInTime = now.toDate();
      att.status = status;
      att.isLate = isLate;
      await att.save();
    }

    res.json({
      message: `Check-in successful for ${user.shift} shift`,
      att,
      shiftInfo: {
        shift: user.shift,
        shiftStart: `${shiftConfig.startHour}:00`,
        shiftEnd: `${shiftConfig.endHour}:00`,
        isLate,
        lateBy: isLate ? `${lateByMinutes} minutes` : null,
        checkInTime: now.format("hh:mm A")
      }
    });
  } catch (err) {
    console.error("Check-in error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
};

// ✅ 2. Check-Out
attendanceController.checkout = async (req, res) => {
  try {
    const { _id } = req.params;
    const settings = await getSettings();

    const allowedIPs = [
      process.env.IP_ADDRESS_ONE,
      process.env.IP_ADDRESS_TWO,
      ...settings.allowedIPs
    ].filter(Boolean);

    const clientIP = req.headers["x-forwarded-for"]?.split(",")[0] || req.connection.remoteAddress;

    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      return res.status(403).json({ error: "Attendance only allowed from incubation network" });
    }

    if (!_id || !isValidObjectId(_id)) {
      return res.status(400).json({ error: "Valid User ID is required" });
    }

    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const now = moment().tz(settings.timezone);
    const startOfDay = now.clone().startOf("day").toDate();
    const endOfDay = now.clone().endOf("day").toDate();

    let att = await Att.findOne({
      user: _id,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      checkInTime: { $ne: null },
      checkOutTime: null
    });

    if (!att) {
      return res.status(400).json({ error: "No active check-in found for today" });
    }

    const shiftConfig = settings.shifts[att.shift];
    if (!shiftConfig) {
      return res.status(500).json({ error: "Invalid shift data" });
    }

    att.checkOutTime = now.toDate();

    const { status, isLate, isEarlyLeave, hoursWorked, earlyByMinutes } = calculateStatus(
      att.checkInTime,
      att.checkOutTime,
      shiftConfig,
      now
    );

    att.status = status;
    att.isLate = isLate;
    att.isEarlyLeave = isEarlyLeave;
    att.hoursWorked = hoursWorked;

    await att.save();

    res.json({
      message: "Check-out successful",
      att,
      summary: {
        shift: att.shift,
        checkInTime: moment(att.checkInTime).tz(settings.timezone).format("hh:mm A"),
        checkOutTime: now.format("hh:mm A"),
        hoursWorked: hoursWorked.toFixed(2) + " hours",
        status,
        isLate,
        isEarlyLeave,
        earlyBy: isEarlyLeave ? `${earlyByMinutes} minutes` : null,
        validAttendance: hoursWorked >= shiftConfig.minHoursForPresent
      }
    });
  } catch (err) {
    console.error("Check-out error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
};

// ✅ 3. Get Single User's Today's Status
attendanceController.getAttendanceStatus = async (req, res) => {
  try {
    const { _id } = req.params;
    const settings = await getSettings();

    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const now = moment().tz(settings.timezone);
    const startOfDay = now.clone().startOf("day").toDate();
    const endOfDay = now.clone().endOf("day").toDate();

    const shiftConfig = await getUserShiftConfig(user);

    const attendance = await Att.findOne({
      user: _id,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    if (!attendance) {
      return res.json({
        status: "No Check-in",
        checkInTime: null,
        checkOutTime: null,
        userShift: user.shift || null,
        shiftTiming: shiftConfig ? {
          start: `${shiftConfig.startHour}:00`,
          end: `${shiftConfig.endHour}:00`
        } : null,
        canCheckIn: shiftConfig ? await isWithinShiftHours(now, shiftConfig) : false
      });
    }

    // Recalculate status for no-checkout late detection
    const attShiftConfig = settings.shifts[attendance.shift];
    if (attShiftConfig && !attendance.checkOutTime) {
      const { status, noCheckoutLate, hoursWorked } = calculateStatus(
        attendance.checkInTime,
        null,
        attShiftConfig,
        now
      );

      // Update if status changed
      if (noCheckoutLate && attendance.status !== status) {
        attendance.status = status;
        attendance.hoursWorked = hoursWorked;
        await attendance.save();
      }
    }

    res.json({
      status: attendance.status,
      checkInTime: attendance.checkInTime,
      checkOutTime: attendance.checkOutTime,
      shift: attendance.shift,
      hoursWorked: attendance.hoursWorked,
      isLate: attendance.isLate,
      isEarlyLeave: attendance.isEarlyLeave,
      userShift: user.shift || null,
      shiftTiming: shiftConfig ? {
        start: `${shiftConfig.startHour}:00`,
        end: `${shiftConfig.endHour}:00`
      } : null,
      canCheckIn: false
    });
  } catch (err) {
    console.error("Get status error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
};

// ✅ 4. Get All Users' Today's Status
attendanceController.getAllUserStatus = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const settings = await getSettings();

    const now = moment().tz(settings.timezone);
    const today = now.clone().startOf("day").toDate();
    const endOfDay = now.clone().endOf("day").toDate();

    const total = await User.countDocuments();
    const users = await User.find()
      .sort({ shift: 1, name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const userIds = users.map(u => u._id);
    const attendances = await Att.find({
      user: { $in: userIds },
      createdAt: { $gte: today, $lte: endOfDay },
    }).lean();

    const attendanceMap = new Map();
    attendances.forEach(att => attendanceMap.set(att.user.toString(), att));

    const userStatuses = users.map(user => {
      const userAtt = attendanceMap.get(user._id.toString());
      const shiftConfig = settings.shifts[user.shift];

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        assignedShift: user.shift || null,
        shiftTiming: shiftConfig ? `${shiftConfig.startHour}:00 - ${shiftConfig.endHour}:00` : null,
        status: userAtt ? userAtt.status : "Absent",
        checkInTime: userAtt?.checkInTime || null,
        checkOutTime: userAtt?.checkOutTime || null,
        hoursWorked: userAtt?.hoursWorked || 0,
        isLate: userAtt?.isLate || false,
        isEarlyLeave: userAtt?.isEarlyLeave || false
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

// ✅ 5. Get Full Attendance History
attendanceController.getAttendanceHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await paginate({
      model: Att,
      page,
      limit,
      query: {},
      sort: { createdAt: -1, _id: 1 },
      populate: { path: "user", select: "name email shift" }
    });

    res.status(200).json(result);
  } catch (err) {
    console.error("Get history error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
};

// ✅ 6. Get User History By Name
attendanceController.getUserHistoryByName = async (req, res) => {
  try {
    const { name } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!name?.trim()) {
      return res.status(400).json({ error: "Name parameter is required" });
    }

    const user = await User.findOne({ name: { $regex: new RegExp(name, "i") } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const result = await paginate({
      model: Att,
      page,
      limit,
      query: { user: user._id },
      sort: { createdAt: -1, _id: 1 },
      populate: null
    });

    res.json({
      user: { _id: user._id, name: user.name, email: user.email, shift: user.shift },
      history: result.data,
      pagination: result.pagination
    });
  } catch (err) {
    console.error("Get user history by name error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
};

// ✅ 7. Get User History By ID
attendanceController.getUserHistoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ error: "Valid User ID is required" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const result = await paginate({
      model: Att,
      page,
      limit,
      query: { user: user._id },
      sort: { createdAt: -1, _id: 1 },
      populate: null
    });

    // Calculate total hours (dynamically from check-in/out times to handle old data)
    const totalHoursResult = await Att.aggregate([
      {
        $match: {
          user: user._id,
          checkInTime: { $ne: null },
          checkOutTime: { $ne: null }
        }
      },
      {
        $project: {
          duration: {
            $divide: [
              { $subtract: ["$checkOutTime", "$checkInTime"] },
              1000 * 60 * 60 // Convert milliseconds to hours
            ]
          }
        }
      },
      { $group: { _id: null, total: { $sum: "$duration" } } }
    ]);
    const totalHours = totalHoursResult.length > 0 ? totalHoursResult[0].total : 0;

    res.json({
      user: { _id: user._id, name: user.name, email: user.email, shift: user.shift },
      history: result.data,
      pagination: result.pagination,
      totalHours: Math.round(totalHours * 100) / 100
    });
  } catch (err) {
    console.error("Get user history by ID error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
};

// ✅ 8. Update Attendance Record (Admin)
attendanceController.updateAttendanceRecord = async (req, res) => {
  try {
    const { attendanceId } = req.params;

    if (!attendanceId || !isValidObjectId(attendanceId)) {
      return res.status(400).json({ error: "Valid Attendance ID is required" });
    }

    const settings = await getSettings();
    const { checkInTime, checkOutTime, status, shift } = req.body;

    const updateData = {};
    if (checkInTime) updateData.checkInTime = checkInTime;
    if (checkOutTime) updateData.checkOutTime = checkOutTime;
    if (status) updateData.status = status;
    if (shift) updateData.shift = shift;

    if (checkInTime && checkOutTime && shift && settings.shifts[shift]) {
      const calculated = calculateStatus(checkInTime, checkOutTime, settings.shifts[shift]);
      updateData.status = calculated.status;
      updateData.isLate = calculated.isLate;
      updateData.isEarlyLeave = calculated.isEarlyLeave;
      updateData.hoursWorked = calculated.hoursWorked;
    }

    const updated = await Att.findByIdAndUpdate(attendanceId, updateData, { new: true });
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

    if (!attendanceId || !isValidObjectId(attendanceId)) {
      return res.status(400).json({ error: "Valid Attendance ID is required" });
    }

    const deleted = await Att.findByIdAndDelete(attendanceId);
    if (!deleted) return res.status(404).json({ error: "Record not found" });

    res.json({ message: "Attendance record deleted" });
  } catch (err) {
    console.error("Delete attendance error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
};

// ✅ 10. Get Shift Info (Frontend)
attendanceController.getShiftInfo = async (req, res) => {
  try {
    const settings = await getSettings();
    const now = moment().tz(settings.timezone);

    const shifts = {};
    for (const [key, config] of Object.entries(settings.shifts)) {
      shifts[key] = {
        name: config.name,
        start: `${config.startHour}:00`,
        end: `${config.endHour}:00`,
        lateAfter: `${config.startHour + config.lateThresholdMinutes / 60}:00`,
        earlyLeaveBefore: `${config.endHour - config.earlyLeaveThresholdMinutes / 60}:00`,
        minHours: config.minHoursForPresent
      };
    }

    res.json({
      currentTime: now.format("YYYY-MM-DD hh:mm:ss A"),
      timezone: settings.timezone,
      shifts
    });
  } catch (err) {
    console.error("Get shift info error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
};

// ✅ 11. Get/Update Attendance Settings (Admin)
attendanceController.getSettings = async (req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (err) {
    console.error("Get settings error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
};

attendanceController.updateSettings = async (req, res) => {
  try {
    const updates = req.body;

    let settings = await AttendanceSettings.findOne({ isActive: true });
    if (!settings) {
      settings = await AttendanceSettings.getSettings();
    }

    // Update allowed fields
    if (updates.shifts) {
      for (const [shiftName, shiftData] of Object.entries(updates.shifts)) {
        if (settings.shifts[shiftName]) {
          Object.assign(settings.shifts[shiftName], shiftData);
        }
      }
    }
    if (updates.allowEarlyCheckIn !== undefined) settings.allowEarlyCheckIn = updates.allowEarlyCheckIn;
    if (updates.timezone) settings.timezone = updates.timezone;
    if (updates.allowedIPs) settings.allowedIPs = updates.allowedIPs;

    await settings.save();

    // Clear cache
    cachedSettings = null;
    cacheTime = null;

    res.json({ message: "Settings updated", settings });
  } catch (err) {
    console.error("Update settings error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
};

module.exports = attendanceController;