const userModel = require("../models/userModel")
const bcrypt = require("bcrypt");
const { UsertokenGenerator } = require("../utils/token");



const authController = {};

authController.signupPost = async (req, res) => {
  try {

    const { bq_id, name, email, password, phone, CNIC, course, gender, shift } = req.validatedData

    const existingbq_id = await userModel.findOne({ bq_id });
    if (existingbq_id) {
      return res.status(400).json({
        field: "bq_id",
        message: "This BQ Id is not available, please try another"
      });
    }

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        field: "email",
        message: "This Email is Already Registered"
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    await userModel.create({ bq_id, name, email, password: hash, phone, CNIC, course, gender, shift });

    return res.status(200).json({ message: "Account created successfully" });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

authController.getenums = async (req, res) => {
  try {
    const courseOptions = userModel.schema.path("course").enumValues;
    const genderOptions = userModel.schema.path("gender").enumValues;
    const shiftOptions = userModel.schema.path("shift").enumValues;

    return res.status(200).json({
      courses: courseOptions,
      genders: genderOptions,
      shifts: shiftOptions
    });
  } catch (error) {
    console.error("Error fetching course enums:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

authController.signupGet = async (req, res) => {
  try {
    const users = await userModel.find()
    res.json(users)
  } catch (error) {
    res.status(500).json({ message: 'Error Fetching Users', error })
  }
}

authController.loginPost = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!user || !isMatch) {
      return res.status(400).json({ message: 'Invalid Email or Password' });
    }
    const token = UsertokenGenerator(user)
    res.cookie("token", token, {
      httpOnly: true, // prevents JS access
      secure: process.env.NODE_ENV === "production", // only send over HTTPS in production
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // cross-domain cookie
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });


    // ✅ You can send user info separately if needed
    res.status(200).json({
      message: "Login successful",
      user: { id: user._id, email: user.email, name: user.name },
    })
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Server Error' });
  }
}

authController.loginGet = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({
      message: "User fetched successfully",
      user,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
}

authController.logout = async (req, res) => {
  try {
    res.clearCookie("token");
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ message: 'Server Error' });
  }
}

authController.updateUser = async (req, res) => {
  try {
    const { _id } = req.params;
    const { bq_id, name, email, phone, CNIC, course, gender, shift } = req.body;
    await userModel.findByIdAndUpdate(_id, { bq_id, name, email, phone, CNIC, course, gender, shift });
    res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server Error' });
  }
}

authController.deleteUser = async (req, res) => {
  try {
    const { _id } = req.params;
    await userModel.findByIdAndDelete(_id);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server Error' });
  }
}

module.exports = authController;