const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const dotenv = require("dotenv");
const indexRoute = require("./routes/indexRoute");
const Half_day_checker = require("./cron/Half_day_checker");

// 🧠 Load environment variables only in local development
if (process.env.NODE_ENV !== "production") {
  const envFile = ".env.development";
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
    console.log(`✅ Loaded environment from ${envFile}`);
  } else {
    console.warn("⚠️ .env.development not found");
  }
} else {
  console.log("🚀 Running in production mode (Vercel environment vars)");
}
require("./config/db")();
const app = express();
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL,
      process.env.LOCALHOST_URL,
      process.env.USER_URL,
    ].filter(Boolean),
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use("/images", express.static(path.join(__dirname, "public/images")));
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views"));

// Routes
app.get("/", (req, res) => res.render("dashboard"));
app.use("/", indexRoute);

// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

Half_day_checker();
