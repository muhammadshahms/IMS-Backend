const express = require("express");
const router = express.Router();
const authController = require("../controllers/authcontroller")
const attController = require("../controllers/attendanceController")
const validate = require("../middlewares/FormValidator")
const { registerSchema, updateRegisterSchema } = require("../validators/authvalidations");
const { protect } = require("../middlewares/auth");
const userPostController = require("../controllers/userPostController");
const { uploadPostImage, uploadAvatar } = require("../config/multerconfig");

//admin access users
router.get("/signup", authController.signupGet)
router.post("/signup", validate(registerSchema), authController.signupPost)
router.post("/login", authController.loginPost)
router.get("/profile", protect, authController.loginGet)

router.post("/logout", authController.logout)
router.put("/update/:_id", validate(updateRegisterSchema), authController.updateUser)
router.delete("/delete/:_id", authController.deleteUser)
router.get("/enums", authController.getenums)

// Avatar upload route
router.post("/avatar", protect, uploadAvatar.single('avatar'), authController.updateAvatar);

// Post routes with image upload
router.post("/createpost", protect, uploadPostImage.single('image'), userPostController.createUserPost);
router.get("/getuserpost", protect, userPostController.getUserPosts);
router.put("/updateuserpost", protect, uploadPostImage.single('image'), userPostController.updateUserPost);
router.delete("/deleteuserpost", protect, userPostController.deleteUserPost);


module.exports = router;