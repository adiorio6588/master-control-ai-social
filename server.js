require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const initializeDatabase = require("./database/init");

const aiRoutes = require("./routes/ai");
const businessRoutes = require("./routes/businesses");
const historyRoutes = require("./routes/history");
const rulesRoutes = require("./routes/rules");

const app = express();
const PORT = process.env.PORT || 3000;

initializeDatabase();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", aiRoutes);
app.use("/api", businessRoutes);
app.use("/api", historyRoutes);
app.use("/api", rulesRoutes);

app.get("/api/status", (req, res) => {
    res.json({
        status: "online",
        message: "Master Control AI is running"
    });
});

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
    console.log("");
    console.log("=================================");
    console.log(" Master Control AI");
    console.log(` Running on http://localhost:${PORT}`);
    console.log("=================================");
    console.log("");
});