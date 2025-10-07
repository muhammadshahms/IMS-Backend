const Att = require("../models/AttModel");
const userModel = require("../models/userModel");

attController = {}

attController.checkin = async (req, res) => {
    try {
        const { _id } = req.params;
        let user = await userModel.findById(_id);
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }

        const now = new Date();
        const date = new Date(now);
        date.setHours(0, 0, 0, 0); // reset time → store only date
        const fourPM = new Date(now);
        fourPM.setHours(16, 0, 0, 0);


        let att = await Att.findOne({
            user: user._id,
            date
        })

        if (att && att.checkInTime) {
            return res.status(400).json({ error: 'Already checked in today' });
        }
        if (!att) {
            att = new Att({
                user: user._id,
                date,
                checkInTime: now,
                status : now < fourPM ? 'Present' : 'Late'
            });
        } else {
            att.checkInTime = now;
            console.log(att.checkInTime)
            att.status =  now < fourPM ? 'Present' : 'Late';
        }
        // console.log(att.save);

        await att.save();

        res.json({ message: 'Check-in successful', att });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

attController.checkout = async (req, res) => {
    try {
        const { _id } = req.params;
        let user = await userModel.findById(_id);
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }
        const now = new Date();
        const date = new Date(now);
        date.setHours(0, 0, 0, 0); // reset time → store only date



        let att = await Att.findOne({
            user: user._id,
            date
        })

        if (!att) {
            return res.status(400).json({ error: "Not checked in today" })
        }

        if(att && att.checkOutTime){
            return res.status(400).json({ error: "Checked out already" })

        }

        if (att && att.checkInTime) {
            att.checkOutTime = now
        }
        await att.save();

        res.json({ message: 'Check-out successful', att });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}



attController.getAllUserStatus = async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
  
      // ✅ Step 1: Get all users
      const users = await userModel.find().lean();
  
      // ✅ Step 2: For each user, find today's attendance
      const userStatuses = await Promise.all(
        users.map(async (user) => {
          const attendance = await Att.findOne({
            user: user._id,
            date: today
          }).lean();
  
          return {
            _id: user._id,
            name: user.name,
            bq_id: user.bq_id,
            email: user.email,
            phone: user.phone,
            CNIC: user.CNIC,
            course: user.course,
            status: attendance ? attendance.status : "Absent"  // 👈 Default absent if no check-in
          };
        })
      );
  
      res.json(userStatuses);
    } catch (error) {
      console.error("Error fetching statuses:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };


module.exports = attController