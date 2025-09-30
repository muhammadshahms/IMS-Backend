const cron = require('node-cron')
const Attendance = require("../models/AttModel");
const userModel = require("../models/userModel");


const Half_day_checker = () => {
    cron.schedule('0 9 * * *', async () => {
        try {
            const now = new Date();
            const date = new Date(now);
            date.setHours(0, 0, 0, 0); // reset time → store only date
            const users = await userModel.find()
            if (!users) {
                return res.status(400).json({ error: 'User not found' });
            }

            users.forEach((user) => {
                const attedance = Attendance.findOne({
                    date,
                    user : user._id
                })

                
            })
        }
        catch (err) {
            console.error('❌ Cron job failed', err);
        }
    })
}