const express = require("express");
const router = express.Router();

const database = require("../database/database");

router.get("/businesses", (req, res) => {
    try {
        const businesses = database
            .prepare(`
                SELECT
                    id,
                    name,
                    emoji,
                    prompt,
                    created_at,
                    updated_at
                FROM businesses
                ORDER BY name ASC
            `)
            .all();

        res.json(businesses);
    } catch (error) {
        console.error("Business loading error:", error);

        res.status(500).json({
            error: "Unable to load businesses."
        });
    }
});

router.post("/businesses", (req, res) => {
    try {
        const { name, emoji = "", prompt } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                error: "Business name is required."
            });
        }

        if (!prompt || !prompt.trim()) {
            return res.status(400).json({
                error: "Business prompt is required."
            });
        }

        const result = database
            .prepare(`
                INSERT INTO businesses (
                    name,
                    emoji,
                    prompt
                )
                VALUES (?, ?, ?)
            `)
            .run(
                name.trim(),
                emoji.trim(),
                prompt.trim()
            );

        const business = database
            .prepare(`
                SELECT *
                FROM businesses
                WHERE id = ?
            `)
            .get(result.lastInsertRowid);

        res.status(201).json(business);
    } catch (error) {
        console.error("Business creation error:", error);

        if (error.message.includes("UNIQUE constraint failed")) {
            return res.status(409).json({
                error: "A business with that name already exists."
            });
        }

        res.status(500).json({
            error: "Unable to create business."
        });
    }
});

router.put("/businesses/:id", (req, res) => {
    try {
        const businessId = Number(req.params.id);
        const { name, emoji = "", prompt } = req.body;

        if (!Number.isInteger(businessId)) {
            return res.status(400).json({
                error: "Invalid business ID."
            });
        }

        if (!name || !name.trim()) {
            return res.status(400).json({
                error: "Business name is required."
            });
        }

        if (!prompt || !prompt.trim()) {
            return res.status(400).json({
                error: "Business prompt is required."
            });
        }

        const result = database
            .prepare(`
                UPDATE businesses
                SET
                    name = ?,
                    emoji = ?,
                    prompt = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `)
            .run(
                name.trim(),
                emoji.trim(),
                prompt.trim(),
                businessId
            );

        if (result.changes === 0) {
            return res.status(404).json({
                error: "Business not found."
            });
        }

        const business = database
            .prepare(`
                SELECT *
                FROM businesses
                WHERE id = ?
            `)
            .get(businessId);

        res.json(business);
    } catch (error) {
        console.error("Business update error:", error);

        if (error.message.includes("UNIQUE constraint failed")) {
            return res.status(409).json({
                error: "A business with that name already exists."
            });
        }

        res.status(500).json({
            error: "Unable to update business."
        });
    }
});

router.delete("/businesses/:id", (req, res) => {
    try {
        const businessId = Number(req.params.id);

        if (!Number.isInteger(businessId)) {
            return res.status(400).json({
                error: "Invalid business ID."
            });
        }

        const result = database
            .prepare(`
                DELETE FROM businesses
                WHERE id = ?
            `)
            .run(businessId);

        if (result.changes === 0) {
            return res.status(404).json({
                error: "Business not found."
            });
        }

        res.json({
            success: true,
            message: "Business deleted."
        });
    } catch (error) {
        console.error("Business deletion error:", error);

        res.status(500).json({
            error: "Unable to delete business."
        });
    }
});

module.exports = router;