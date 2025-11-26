const express = require("express");
const router = express.Router();
const postController = require("../controllers/postcontroller");
const upload = require("../config/multerconfig");
const PMcontroller = require("../controllers/PMcontroller");
const { TeamController } = require("../controllers/teamcontroller");
const { ProjectController } = require("../controllers/projectcontroller");
const validate = require("../middlewares/FormValidator")
const { TeamSchema, UpdateTeamSchema } = require("../validators/teamvalidations");
const { ProjectSchema, UpdateProjectSchema } = require("../validators/ProjectValidations");
const adminController = require("../controllers/adminController");


router.post("/login", adminController.loginAdmin)
router.post("/create", adminController.createAdmin)

//admin access posts
router.post("/post", upload.single('image'), postController.createPost)
router.get("/post", postController.getPosts)
router.put("/post/:id", upload.single('image'), postController.updatePost)
router.delete("/post/:id", postController.deletePost)

//admin access PMs
router.post("/pm", PMcontroller.createPM)
router.get("/pm", PMcontroller.getPMs)
router.put("/pm/:id", PMcontroller.updatePM)
router.delete("/pm/:id", PMcontroller.deletePM)


router.get("/team", TeamController.teamGet)
router.post("/createteam", validate(TeamSchema), TeamController.createteamPost)
router.delete("/team/:id", TeamController.deleteteam);
router.put("/team/:id", validate(UpdateTeamSchema), TeamController.updateteam);
router.get("/team/fields", TeamController.fields);

router.get("/project", ProjectController.getProjects)
router.post("/createproject", validate(ProjectSchema), ProjectController.projectPost)
router.put("/project/:id", validate(UpdateProjectSchema), ProjectController.updateProject)
router.delete("/project/:id", ProjectController.deleteProject)


module.exports = router;