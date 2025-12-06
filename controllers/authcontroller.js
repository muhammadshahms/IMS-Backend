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
    const { bq_id, name, email, password, phone, CNIC, course, gender, shift, dob, termsAccepted } = req.validatedData;

    // Check if BQ ID already exists
    const existingbq_id = await userModel.findOne({ bq_id });
    if (existingbq_id) {
      return res.status(400).json({
        errors: { bq_id: "This BQ Id is not available, please try another" } // Standardized error format
      });
    }

    // Check if email already exists
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        errors: { email: "This Email is Already Registered" }
      });
    }

    // Check if CNIC already exists
    const existingCNIC = await userModel.findOne({ CNIC });
    if (existingCNIC) {
      return res.status(400).json({
        errors: { CNIC: "This CNIC is Already Registered" }
      });
    }

    // Validate Age > 12
    const dobDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const m = today.getMonth() - dobDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
      age--;
    }

    if (age <= 12) {
      return res.status(400).json({
        errors: { dob: "You must be greater than 12 years old" }
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
      shift,
      dob,
      termsAccepted
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

// ✅ Login - FIXED: Supports Refresh Token
authController.loginPost = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid Email or Password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Email or Password' });
    }

    // Generate short-lived Access Token (e.g. 15 mins or 1 hour)
    // UsertokenGenerator should ideally create a token with shorter expiry now, or we can explicitly pass it if the utility allows.
    // Assuming UsertokenGenerator creates a standard JWT.
    const accessToken = UsertokenGenerator(user);

    // Default cookie options for Access Token (Session or Short-Lived)
    const accessTokenCookieOptions = {
      httpOnly: false, // Accessible by JS for socket if needed, or httpOnly if handled via API only.
      // NOTE: Original code had httpOnly: true, but client code reads it from storage?
      // Actually client stores it in localStorage/sessionStorage from response body.
      // The cookie set here is primarily for standard web requests if API relies on it.
      // Let's keep it httpOnly for security where possible.
      // But wait, client socket.io auth uses localStorage token.
      // So this cookie is secondary or for SSR/API.
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000 // 1 day default for access token cookie if not remember
    };

    let refreshToken = null;

    if (req.body.remember) {
      // Generate Refresh Token
      const crypto = require('crypto');
      refreshToken = crypto.randomBytes(40).toString('hex');

      // Hash token before saving to DB
      const hashedRefreshToken = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      // Save to User
      user.refreshToken = hashedRefreshToken;
      await user.save();

      // Set Refresh Token Cookie (Long Lived - e.g. 30 days)
      const refreshCookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      };

      res.cookie("refreshToken", refreshToken, refreshCookieOptions);
    } else {
      // If not remember me, ensure we clear any existing refresh token
      user.refreshToken = undefined;
      await user.save();
      res.clearCookie("refreshToken");
    }

    res.cookie("token", accessToken, accessTokenCookieOptions);

    res.status(200).json({
      message: "Login successful",
      token: accessToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        bq_id: user.bq_id,
        avatar: user.avatar
      },
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Server Error', details: error.message });
  }
};

// ✅ Refresh Access Token
authController.refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    const crypto = require('crypto');
    const hashedRefreshToken = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const user = await userModel.findOne({ refreshToken: hashedRefreshToken });

    if (!user) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    // Generate new Access Token
    const accessToken = UsertokenGenerator(user);

    // Update Access Token Cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000
    };

    res.cookie("token", accessToken, cookieOptions);

    res.status(200).json({ accessToken });
  } catch (error) {
    console.error("Error refreshing token:", error);
    res.status(500).json({ message: "Server error" });
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
    // If user is authenticated, clear their refresh token from DB
    // Note: req.user might not be populated if the token is invalid/expired, so we wrap in try/catch or check
    if (req.user && req.user.id) {
      await userModel.findByIdAndUpdate(req.user.id, { refreshToken: undefined });
    }

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    };

    res.clearCookie("token", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);

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

// ✅ Update user avatar
authController.updateAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    // Check if Cloudinary storage was used
    const { isCloudinaryConfigured } = require('../config/multerconfig');

    if (!isCloudinaryConfigured) {
      return res.status(503).json({
        message: "Image upload is not available. Cloudinary credentials are not configured.",
        hint: "Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your .env.development file"
      });
    }

    const avatarUrl = req.file.path; // Cloudinary URL

    // Import media controller for helper functions
    const mediaController = require('./mediaController');

    // Delete old avatar if exists
    await mediaController.deleteOldAvatar(userId);

    // Create new media record for avatar
    await mediaController.createMediaRecord({
      url: avatarUrl,
      publicId: req.file.filename,
      type: 'avatar',
      userId: userId,
      file: req.file,
    });

    // Update user avatar field
    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      { avatar: avatarUrl },
      { new: true }
    ).select('-password');

    res.status(200).json({
      message: "Avatar updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({ message: 'Server Error', details: error.message });
  }
};

module.exports = authController;