// Starter server.js
const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/status", (req, res) => {
  res.json({
    status: "online",
    message: "Master Control AI is running"
  });
});

app.listen(PORT, () => {
  console.log("");
  console.log("Master Control AI is running!");
  console.log(`Open: http://localhost:${PORT}`);
  console.log("");
});