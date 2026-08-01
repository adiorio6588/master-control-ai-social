const express = require("express");
const router = express.Router();

const database = require("../database/database");

/*
 * GET /api/businesses
 * Return every business.
 */
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
        console.error("Load businesses error:", error);

        res.status(500).json({
            error: "Unable to load businesses."
        });
    }
});

/*
 * GET /api/businesses/:id
 * Return one business.
 */
router.get("/businesses/:id", (req, res) => {
    try {
        const businessId = Number(req.params.id);

        if (!businessId) {
            return res.status(400).json({
                error: "A valid business ID is required."
            });
        }

        const business = getBusinessById(businessId);

        if (!business) {
            return res.status(404).json({
                error: "Business not found."
            });
        }

        res.json(business);
    } catch (error) {
        console.error("Load business error:", error);

        res.status(500).json({
            error: "Unable to load the business."
        });
    }
});

/*
 * POST /api/businesses
 * Create a new business.
 */
router.post("/businesses", (req, res) => {
    try {
        const {
            name,
            emoji = "🏢",
            prompt
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                error: "Business name is required."
            });
        }

        if (!prompt || !prompt.trim()) {
            return res.status(400).json({
                error: "Business AI instructions are required."
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
                emoji.trim() || "🏢",
                prompt.trim()
            );

        const business = getBusinessById(
            result.lastInsertRowid
        );

        res.status(201).json(business);
    } catch (error) {
        console.error("Create business error:", error);

        if (
            error.code === "SQLITE_CONSTRAINT_UNIQUE" ||
            String(error.message).includes(
                "UNIQUE constraint failed"
            )
        ) {
            return res.status(409).json({
                error:
                    "A business with this name already exists."
            });
        }

        res.status(500).json({
            error: "Unable to create the business."
        });
    }
});

/*
 * PUT /api/businesses/:id
 * Update an existing business.
 */
router.put("/businesses/:id", (req, res) => {
    try {
        const businessId = Number(req.params.id);

        const {
            name,
            emoji,
            prompt
        } = req.body;

        if (!businessId) {
            return res.status(400).json({
                error: "A valid business ID is required."
            });
        }

        const existingBusiness =
            getBusinessById(businessId);

        if (!existingBusiness) {
            return res.status(404).json({
                error: "Business not found."
            });
        }

        const updatedName =
            name !== undefined
                ? name.trim()
                : existingBusiness.name;

        const updatedEmoji =
            emoji !== undefined
                ? emoji.trim() || "🏢"
                : existingBusiness.emoji;

        const updatedPrompt =
            prompt !== undefined
                ? prompt.trim()
                : existingBusiness.prompt;

        if (!updatedName) {
            return res.status(400).json({
                error: "Business name is required."
            });
        }

        if (!updatedPrompt) {
            return res.status(400).json({
                error: "Business AI instructions are required."
            });
        }

        database
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
                updatedName,
                updatedEmoji,
                updatedPrompt,
                businessId
            );

        res.json(getBusinessById(businessId));
    } catch (error) {
        console.error("Update business error:", error);

        if (
            error.code === "SQLITE_CONSTRAINT_UNIQUE" ||
            String(error.message).includes(
                "UNIQUE constraint failed"
            )
        ) {
            return res.status(409).json({
                error:
                    "A business with this name already exists."
            });
        }

        res.status(500).json({
            error: "Unable to update the business."
        });
    }
});

function getBusinessById(businessId) {
    return database
        .prepare(`
            SELECT
                id,
                name,
                emoji,
                prompt,
                created_at,
                updated_at
            FROM businesses
            WHERE id = ?
        `)
        .get(Number(businessId));
}

module.exports = router;