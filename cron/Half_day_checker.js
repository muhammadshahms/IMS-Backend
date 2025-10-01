const cron = require('node-cron');
const Attendance = require("../models/AttModel");
const userModel = require("../models/userModel");

const Half_day_checker = () => {

    cron.schedule('0 22 * * *', async () => {
        try {
            console.log("🕒 Starting Half Day Checker Cron Job...");

            const now = new Date();
            const date = new Date(now);
            date.setHours(0, 0, 0, 0); // normalize to midnight (store only date)

            const users = await userModel.find();
            if (!users || users.length === 0) {
                console.log("⚠️ No users found for half-day check.");
                return;
            }

            for (const user of users) {
                const attendance = await Attendance.findOne({ date, user: user._id });

                if (attendance && attendance.checkInTime && !attendance.checkOutTime) {
                    attendance.status = 'Half day';
                    await attendance.save();
                    console.log(`✅ Marked half day for user: {${user.bq_id}-${user.name}}`);
                }
            }

            console.log("✅ Half Day Checker Cron Job completed.");
        } catch (err) {
            console.error('❌ Cron job failed:', err);
        }
    });
};

module.exports = Half_day_checker;
