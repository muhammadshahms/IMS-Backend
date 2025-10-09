const express = require("express");
const router = express.Router();
const authController = require("../controllers/authcontroller")
const attController = require("../controllers/attendanceController")
const validate = require("../middlewares/FormValidator")
const { registerSchema, updateRegisterSchema } = require("../validators/authvalidations");
const { protect } = require("../middlewares/auth");

//admin access users
router.get("/signup", authController.signupGet)
router.post("/signup", validate(registerSchema), authController.signupPost)
router.post("/login", authController.loginPost)
router.get("/me", protect, (req, res) => {
    res.json(req.user)
})
router.get("/logout", authController.logout)
router.put("/update/:_id", validate(updateRegisterSchema), authController.updateUser)
router.delete("/delete/:_id", authController.deleteUser)
router.get("/course", authController.getCourses)



module.exports = router;