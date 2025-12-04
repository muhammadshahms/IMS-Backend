const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const dotenv = require("dotenv");
const http = require("http");

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

const indexRoute = require("./routes/indexRoute");
const commentRoute = require("./routes/commentRoute");
const likeRoute = require("./routes/likeRoute");
const Half_day_checker = require("./cron/Half_day_checker");
const { initializeSocket } = require("./socket");
require("./config/db")();
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);
console.log("✅ Socket.IO initialized");

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
app.use("/api/comments", commentRoute);
app.use("/api/likes", likeRoute);

// Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

Half_day_checker();
