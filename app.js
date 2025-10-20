const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const dotenv = require("dotenv");

const indexRoute = require("./routes/indexRoute");
const Half_day_checker = require("./cron/Half_day_checker");

// 🧠 Load environment variables dynamically
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
  console.log(`✅ Loaded environment from ${envFile}`);
} else {
  console.log("⚙️ Using system environment variables");
}

// 🗄️ Connect to Database
require("./config/db")();

// 🚀 Initialize App
const app = express();

// 🖼️ Serve Static Files
app.use("/images", express.static(path.join(__dirname, "public/images")));

// 🍪 Parse Cookies
app.use(cookieParser());

// 🌐 CORS Setup
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL,
      process.env.LOCALHOST_URL,
      process.env.USER_URL,
    ].filter(Boolean), // removes undefined URLs
    credentials: true,
  })
);

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

app.use("/", indexRoute);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});


Half_day_checker()