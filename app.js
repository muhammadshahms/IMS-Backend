const express = require("express");
const cors = require("cors");
const indexRoute = require("./routes/indexRoute");
const Half_day_checker = require("./cron/Half_day_checker");
require("dotenv").config();
require("./config/db")();
const path = require('path');
const cookieParser = require("cookie-parser");



const app = express();
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use(cookieParser())
app.use(cors({
  origin: [process.env.FRONTEND_URL, process.env.LOCALHOST_URL, process.env.USER_URL],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views"));

// Dashboard Route
app.get("/", (req, res) => {
  res.render("dashboard");
});

// Example endpoints
// app.get("/admin/team", (req, res) => res.send("Teams Endpoint"));
// app.get("/admin/projects", (req, res) => res.send("Projects Endpoint"));
// app.get("/admin/pm", (req, res) => res.send("PM Endpoint"));
// app.get("/user/signup", (req, res) => res.send("Signup Endpoint"));

app.get("/", (req, res) => {
  res.send("Hello, I am a Server"); 
});

app.use("/", indexRoute);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});


Half_day_checker()