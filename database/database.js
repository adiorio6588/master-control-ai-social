const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dataDirectory = path.join(__dirname, "..", "data");
const databasePath = path.join(dataDirectory, "mastercontrol.db");

if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

const database = new Database(databasePath);

database.pragma("journal_mode = WAL");
database.pragma("foreign_keys = ON");

module.exports = database;