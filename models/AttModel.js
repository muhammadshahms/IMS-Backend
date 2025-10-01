const mongoose = require("mongoose");

const AttSchema = mongoose.Schema({
     user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  checkInTime: {
    type: Date,
    default: null
  },
  checkOutTime: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['Present', 'Absent','Late','Half day'],
    default: 'Absent'
  },
})

AttSchema.index({user:1,date:1},{unique:true})

module.exports = mongoose.model('Attendance',AttSchema)