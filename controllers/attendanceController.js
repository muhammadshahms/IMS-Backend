const Att = require("../models/AttModel");
const User = require("../models/userModel");

const attendanceController = {};

// ✅ 1. Check-In
attendanceController.checkin = async (req, res) => {
  try {
    const { _id } = req.params;
    const user = await User.findById(_id);
    if (!user) return res.status(400).json({ error: "User not found" });

    const now = new Date();
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    const fourPM = new Date(now);
    fourPM.setHours(16, 0, 0, 0);

    let att = await Att.findOne({ user: _id, date });
    if (att && att.checkInTime) {
      return res.status(400).json({ error: "Already checked in today" });
    }

    if (!att) {
      att = await Att.create({
        user: _id,
        date,
        checkInTime: now,
        status: now < fourPM ? "Present" : "Late",
      });
    } else {
      att.checkInTime = now;
      att.status = now < fourPM ? "Present" : "Late";
    }

    await att.save();
    res.json({ message: "Check-in successful", att });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ 2. Check-Out
attendanceController.checkout = async (req, res) => {
  try {
    const { _id } = req.params;
    const user = await User.findById(_id);
    if (!user) return res.status(400).json({ error: "User not found" });

    const now = new Date();
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);

    let att = await Att.findOne({ user: _id, date });
    if (!att) return res.status(400).json({ error: "Not checked in today" });
    if (att.checkOutTime)
      return res.status(400).json({ error: "Already checked out" });

    att.checkOutTime = now;
    await att.save();

    res.json({ message: "Check-out successful", att });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ 3. Get Single User's Today's Status
attendanceController.getAttendanceStatus = async (req, res) => {
  try {
    const { _id } = req.params; // userId route mein bhejna hoga
    if (!_id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Att.findOne({ user: _id, date: today });
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
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ 4. Get All Users' Today's Status
attendanceController.getAllUserStatus = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const users = await User.find().lean();

    const userStatuses = await Promise.all(
      users.map(async (user) => {
        const attendance = await Att.findOne({
          user: user._id,
          date: today,
        }).lean();

        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          status: attendance ? attendance.status : "Absent",
          checkInTime: attendance?.checkInTime || null,
          checkOutTime: attendance?.checkOutTime || null,
        };
      })
    );

    res.json(userStatuses);
  } catch (error) {
    console.error("Error fetching statuses:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ 5. Get Full Attendance History (All Users)
attendanceController.getAttendanceHistory = async (req, res) => {
  try {
    const records = await Att.find()
      .populate("user", "name email") // 👈 Ensure `user` field is ObjectId ref
      .sort({ date: -1 });

    res.json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
``

// ✅ 6. Get Specific User History By Name
attendanceController.getUserHistoryByName = async (req, res) => {
  try {
    const { name } = req.params;

    // 👇 Case-insensitive name search
    const user = await User.findOne({ name: { $regex: new RegExp(name, "i") } });

    if (!user) return res.status(404).json({ error: "User not found" });

    const records = await Att.find({ user: user._id }).sort({ date: -1 });

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        banoqabilId: user.bq_id,
      },
      history: records,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

attendanceController.getUserHistoryById = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findOne({ _id: id })
    if (!user) return res.status(404).json({ error: "User not found" });
    const records = await Att.find({ user: user._id }).sort({ date: -1 });
    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        banoqabilId: user.bq_id,
      },
      history: records,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
// ✅ 7. Update Attendance Record (Admin use)
attendanceController.updateAttendanceRecord = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const { checkInTime, checkOutTime, status } = req.body;

    const updated = await Att.findByIdAndUpdate(
      attendanceId,
      { checkInTime, checkOutTime, status },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Record not found" });
    res.json({ message: "Record updated", updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ 8. Delete Attendance Record
attendanceController.deleteAttendanceRecord = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const deleted = await Att.findByIdAndDelete(attendanceId);
    if (!deleted) return res.status(404).json({ error: "Record not found" });

    res.json({ message: "Attendance record deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = attendanceController;
