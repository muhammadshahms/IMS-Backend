const Att = require("../models/AttModel");
const userModel = require("../models/userModel");

AttController = {}

AttController.checkin = async (req, res) => {
    try {
        const { _id } = req.params;
      let user =   await userModel.findById(_id);
      if(!user){
           return res.status(400).json({ error: 'User not found' });
      }
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));
        let att = await Att.findOne({
            user: user._id,
            date: { $gte: startOfDay, $lt: endOfDay }
        })

        if (att && att.checkInTime) {
            return res.status(400).json({ error: 'Already checked in today' });
        }
        if (!att) {
            att = new Att({
                user: user._id,
                date: new Date(),
                checkInTime: new Date(),
                status: 'Present'
            });
        } else {
            att.checkInTime = new Date();
            att.status = 'Present';
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

module.exports = AttController