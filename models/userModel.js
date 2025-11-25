const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  bq_id: String,
  incubation_id: {
    type: String,
    unique: true,
  },
  name: String,
  email: String,
  password: String,
  phone: String,
  CNIC: String,
  gender: {
    type: String,
    enum: ["Male", "Female"],
  },
  shift: {
    type: String,
    enum: ["Morning", "Evening"],
  },
  course: {
    type: String,
    enum: [
      "Web Development",
      "Graphic Designing",
      "Digital Marketing",
      "Data Science",
      "Data Analytics",
      "Cyber Security",
      "Mobile App Development",
    ],
    required: true,
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "team",
  },
});

// Pre-save hook to generate incubation_id
userSchema.pre("save", async function (next) {
  if (this.isNew && !this.incubation_id) {
    try {
      // Find the user with the highest incubation_id (excluding null values)
      const lastUser = await this.constructor
        .findOne({ 
          incubation_id: { $exists: true, $ne: null, $regex: /^inc-\d+$/ } 
        })
        .sort({ incubation_id: -1 })
        .limit(1);

      let nextNumber = 1;

      if (lastUser && lastUser.incubation_id) {
        // Extract the number from the last incubation_id (e.g., "inc-0001" -> 1)
        const lastNumber = parseInt(lastUser.incubation_id.split("-")[1]);
        
        // Check if parsing was successful
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }

      // Generate new incubation_id with leading zeros (e.g., "inc-0001")
      this.incubation_id = `inc-${String(nextNumber).padStart(4, "0")}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model("user", userSchema);