const userModel = require("../models/userModel");
const bcrypt = require("bcrypt");
const { UsertokenGenerator } = require("../utils/token");
const paginate = require("../utils/paginate");
const mongoose = require("mongoose");

const authController = {};

// ✅ Helper function to validate ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
};

// ✅ Signup - Create new user
authController.signupPost = async (req, res) => {
  try {
    const { bq_id, name, email, password, phone, CNIC, course, gender, shift } = req.validatedData;

    // Check if BQ ID already exists
    const existingbq_id = await userModel.findOne({ bq_id });
    if (existingbq_id) {
      return res.status(400).json({
        field: "bq_id",
        message: "This BQ Id is not available, please try another"
      });
    }

    // Check if email already exists
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        field: "email",
        message: "This Email is Already Registered"
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // Create user
    await userModel.create({ 
      bq_id, 
      name, 
      email, 
      password: hash, 
      phone, 
      CNIC, 
      course, 
      gender, 
      shift 
    });

    return res.status(201).json({ message: "Account created successfully" });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({ message: "Server Error", details: error.message });
  }
};

// ✅ Get enum values for form dropdowns
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
    return res.status(500).json({ message: "Server Error", details: error.message });
  }
};

// ✅ Get all users with pagination
authController.signupGet = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await paginate({
      model: userModel,
      page,
      limit,
      query: {}, // get all users
      sort: { createdAt: -1, _id: 1 }, // latest users first
      populate: null
    });
    
    res.status(200).json(result);

  } catch (error) {
    console.error("Error Fetching Users:", error);
    res.status(500).json({ message: 'Error Fetching Users', details: error.message });
  }
};

// ✅ Login - FIXED: Check user exists BEFORE password comparison
authController.loginPost = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user - MUST happen first
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid Email or Password' });
    }

    // Compare password - only after confirming user exists
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Email or Password' });
    }

    // Generate token
    const token = UsertokenGenerator(user);
    
    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Send response
    res.status(200).json({
      message: "Login successful",
      user: { 
        id: user._id, 
        email: user.email, 
        name: user.name,
        bq_id: user.bq_id 
      },
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Server Error', details: error.message });
  }
};

// ✅ Get current logged-in user
authController.loginGet = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await userModel.findById(userId).select('-password'); // Exclude password
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    return res.status(200).json({
      message: "User fetched successfully",
      user,
    });
  } catch (err) {
    console.error('Error fetching user:', err);
    return res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
};

// ✅ Logout
authController.logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });
    
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ message: 'Server Error', details: error.message });
  }
};

// ✅ Update user - FIXED: Added validation and duplicate checks
authController.updateUser = async (req, res) => {
  try {
    const { _id } = req.params;
    const { bq_id, name, email, phone, CNIC, course, gender, shift } = req.body;

    // Validate ObjectId
    if (!_id || _id === 'undefined' || _id === 'null') {
      return res.status(400).json({ error: "User ID is required" });
    }

    if (!isValidObjectId(_id)) {
      return res.status(400).json({ error: "Invalid User ID format" });
    }

    // Check if user exists
    const user = await userModel.findById(_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if new email is already taken by another user
    if (email && email !== user.email) {
      const existingEmail = await userModel.findOne({ 
        email, 
        _id: { $ne: _id } // Exclude current user
      });
      if (existingEmail) {
        return res.status(400).json({
          field: "email",
          message: "This email is already registered to another user"
        });
      }
    }

    // Check if new BQ ID is already taken by another user
    if (bq_id && bq_id !== user.bq_id) {
      const existingBqId = await userModel.findOne({ 
        bq_id, 
        _id: { $ne: _id } 
      });
      if (existingBqId) {
        return res.status(400).json({
          field: "bq_id",
          message: "This BQ ID is already registered to another user"
        });
      }
    }

    // Update user
    await userModel.findByIdAndUpdate(
      _id, 
      { bq_id, name, email, phone, CNIC, course, gender, shift },
      { new: true, runValidators: true }
    );

    res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server Error', details: error.message });
  }
};

// ✅ Delete user - FIXED: Added validation
authController.deleteUser = async (req, res) => {
  try {
    const { _id } = req.params;

    // Validate ObjectId
    if (!_id || _id === 'undefined' || _id === 'null') {
      return res.status(400).json({ error: "User ID is required" });
    }

    if (!isValidObjectId(_id)) {
      return res.status(400).json({ error: "Invalid User ID format" });
    }

    // Delete user
    const deleted = await userModel.findByIdAndDelete(_id);
    
    if (!deleted) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server Error', details: error.message });
  }
};

module.exports = authController;