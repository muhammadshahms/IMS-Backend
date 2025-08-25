const Project = require("../models/projectModel");
ProjectController = {}


ProjectController.getProjects = async (req, res) => {
  
  try {
    const project = await Project.find().populate("teamName","teamName").populate("PM" , "name")
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Error Fetching Projects', error });
  }
};

ProjectController.projectPost = async (req, res) => {
  try {
    const { title, description, teamName, PM } = req.validatedData;

    // Check if team name already exists
    const existingTeam = await Project.findOne({ teamName });
    if (existingTeam) {
      return res.status(400).json({
        message: "Another project is already assigned to this team , please choose another team.",
      });
    }

    const existingPM = await Project.findOne({ PM });
    if (existingPM) {
      return res.status(400).json({
        message: "Project Manager  is already assigned to another project.",
      });
    }


    // Create project
    await Project.create({
      title,
      description,
      teamName,
      PM
    });

    return res.status(200).json({ message: "Project assigned successfully" });
  } catch (error) {
    console.error("Error assigning project:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

module.exports = { ProjectController };
