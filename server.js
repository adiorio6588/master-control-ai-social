require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const initializeDatabase = require("./database/init");

const aiRoutes = require("./routes/ai");
const businessRoutes = require("./routes/businesses");
const historyRoutes = require("./routes/history");
const rulesRoutes = require("./routes/rules");
const commentsRoutes = require("./routes/comments");

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize SQLite.
initializeDatabase();

// Middleware.
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes.
app.use("/api", aiRoutes);
app.use("/api", businessRoutes);
app.use("/api", historyRoutes);
app.use("/api", rulesRoutes);
app.use("/api", commentsRoutes);

// Server status.
app.get("/api/status", (req, res) => {
    res.json({
        status: "online",
        message: "Master Control AI is running"
    });
});

// Frontend files.
app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

// Start server.
app.listen(PORT, () => {
    console.log("");
    console.log("=================================");
    console.log(" Master Control AI");
    console.log(` Running on http://localhost:${PORT}`);
    console.log("=================================");
    console.log("");
});