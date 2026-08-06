const express = require("express");
const router = express.Router();

const database = require("../database/database");

/*
 * GET /api/businesses
 *
 * Return all businesses with live statistics.
 */
router.get("/businesses", (req, res) => {
    try {
        const businesses = database
            .prepare(`
                SELECT
                    businesses.id,
                    businesses.name,
                    businesses.emoji,
                    businesses.prompt,
                    businesses.created_at,
                    businesses.updated_at,

                    COUNT(
                        DISTINCT comments.id
                    ) AS total_comments,

                    COUNT(
                        DISTINCT reply_rules.id
                    ) AS total_rules,

                    COUNT(
                        DISTINCT CASE
                            WHEN comments.reply IS NOT NULL
                            AND TRIM(comments.reply) != ''
                            THEN comments.id
                        END
                    ) AS total_replies,

                    COUNT(
                        DISTINCT CASE
                            WHEN comments.source = 'RULE'
                            THEN comments.id
                        END
                    ) AS rule_replies,

                    COUNT(
                        DISTINCT CASE
                            WHEN comments.source = 'GPT'
                            THEN comments.id
                        END
                    ) AS gpt_replies,

                    MAX(
                        COALESCE(
                            comments.updated_at,
                            comments.created_at
                        )
                    ) AS last_activity

                FROM businesses

                LEFT JOIN comments
                    ON comments.business_id =
                        businesses.id

                LEFT JOIN reply_rules
                    ON reply_rules.business_id =
                        businesses.id

                GROUP BY
                    businesses.id,
                    businesses.name,
                    businesses.emoji,
                    businesses.prompt,
                    businesses.created_at,
                    businesses.updated_at

                ORDER BY
                    businesses.name ASC
            `)
            .all();

        res.json(businesses);
    } catch (error) {
        console.error(
            "Business loading error:",
            error
        );

        res.status(500).json({
            error:
                "Unable to load businesses.",
            details:
                error.message
        });
    }
});

/*
 * GET /api/businesses/:id
 *
 * Return one business with statistics.
 */
router.get("/businesses/:id", (req, res) => {
    try {
        const businessId =
            Number(req.params.id);

        if (!Number.isInteger(businessId)) {
            return res.status(400).json({
                error:
                    "Invalid business ID."
            });
        }

        const business = getBusinessById(
            businessId
        );

        if (!business) {
            return res.status(404).json({
                error:
                    "Business not found."
            });
        }

        res.json(business);
    } catch (error) {
        console.error(
            "Business loading error:",
            error
        );

        res.status(500).json({
            error:
                "Unable to load business.",
            details:
                error.message
        });
    }
});

/*
 * POST /api/businesses
 *
 * Create a business.
 */
router.post("/businesses", (req, res) => {
    try {
        const {
            name,
            emoji = "",
            prompt
        } = req.body;

        const normalizedName =
            typeof name === "string"
                ? name.trim()
                : "";

        const normalizedEmoji =
            typeof emoji === "string"
                ? emoji.trim()
                : "";

        const normalizedPrompt =
            typeof prompt === "string"
                ? prompt.trim()
                : "";

        if (!normalizedName) {
            return res.status(400).json({
                error:
                    "Business name is required."
            });
        }

        if (!normalizedPrompt) {
            return res.status(400).json({
                error:
                    "Business prompt is required."
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
                normalizedName,
                normalizedEmoji,
                normalizedPrompt
            );

        const business =
            getBusinessById(
                result.lastInsertRowid
            );

        res.status(201).json(
            business
        );
    } catch (error) {
        console.error(
            "Business creation error:",
            error
        );

        if (
            error.message.includes(
                "UNIQUE constraint failed"
            )
        ) {
            return res.status(409).json({
                error:
                    "A business with that name already exists."
            });
        }

        res.status(500).json({
            error:
                "Unable to create business.",
            details:
                error.message
        });
    }
});

/*
 * PUT /api/businesses/:id
 *
 * Update a business.
 */
router.put("/businesses/:id", (req, res) => {
    try {
        const businessId =
            Number(req.params.id);

        const {
            name,
            emoji = "",
            prompt
        } = req.body;

        const normalizedName =
            typeof name === "string"
                ? name.trim()
                : "";

        const normalizedEmoji =
            typeof emoji === "string"
                ? emoji.trim()
                : "";

        const normalizedPrompt =
            typeof prompt === "string"
                ? prompt.trim()
                : "";

        if (!Number.isInteger(businessId)) {
            return res.status(400).json({
                error:
                    "Invalid business ID."
            });
        }

        if (!normalizedName) {
            return res.status(400).json({
                error:
                    "Business name is required."
            });
        }

        if (!normalizedPrompt) {
            return res.status(400).json({
                error:
                    "Business prompt is required."
            });
        }

        const result = database
            .prepare(`
                UPDATE businesses
                SET
                    name = ?,
                    emoji = ?,
                    prompt = ?,
                    updated_at =
                        CURRENT_TIMESTAMP
                WHERE id = ?
            `)
            .run(
                normalizedName,
                normalizedEmoji,
                normalizedPrompt,
                businessId
            );

        if (result.changes === 0) {
            return res.status(404).json({
                error:
                    "Business not found."
            });
        }

        const business =
            getBusinessById(
                businessId
            );

        res.json(business);
    } catch (error) {
        console.error(
            "Business update error:",
            error
        );

        if (
            error.message.includes(
                "UNIQUE constraint failed"
            )
        ) {
            return res.status(409).json({
                error:
                    "A business with that name already exists."
            });
        }

        res.status(500).json({
            error:
                "Unable to update business.",
            details:
                error.message
        });
    }
});

/*
 * DELETE /api/businesses/:id
 *
 * Delete a business.
 */
router.delete("/businesses/:id", (req, res) => {
    try {
        const businessId =
            Number(req.params.id);

        if (!Number.isInteger(businessId)) {
            return res.status(400).json({
                error:
                    "Invalid business ID."
            });
        }

        const business = database
            .prepare(`
                SELECT
                    id,
                    name
                FROM businesses
                WHERE id = ?
            `)
            .get(businessId);

        if (!business) {
            return res.status(404).json({
                error:
                    "Business not found."
            });
        }

        const deleteBusiness =
            database.transaction(() => {
                /*
                 * Delete comment replies first.
                 */
                database
                    .prepare(`
                        DELETE FROM replies
                        WHERE comment_id IN (
                            SELECT id
                            FROM comments
                            WHERE business_id = ?
                        )
                    `)
                    .run(businessId);

                /*
                 * Delete comments.
                 */
                database
                    .prepare(`
                        DELETE FROM comments
                        WHERE business_id = ?
                    `)
                    .run(businessId);

                /*
                 * Delete rules.
                 */
                database
                    .prepare(`
                        DELETE FROM reply_rules
                        WHERE business_id = ?
                    `)
                    .run(businessId);

                /*
                 * Delete the business.
                 */
                database
                    .prepare(`
                        DELETE FROM businesses
                        WHERE id = ?
                    `)
                    .run(businessId);
            });

        deleteBusiness();

        res.json({
            success: true,
            message:
                `${business.name} was deleted.`
        });
    } catch (error) {
        console.error(
            "Business deletion error:",
            error
        );

        res.status(500).json({
            error:
                "Unable to delete business.",
            details:
                error.message
        });
    }
});

/*
 * Return one business with statistics.
 */
function getBusinessById(businessId) {
    return database
        .prepare(`
            SELECT
                businesses.id,
                businesses.name,
                businesses.emoji,
                businesses.prompt,
                businesses.created_at,
                businesses.updated_at,

                COUNT(
                    DISTINCT comments.id
                ) AS total_comments,

                COUNT(
                    DISTINCT reply_rules.id
                ) AS total_rules,

                COUNT(
                    DISTINCT CASE
                        WHEN comments.reply IS NOT NULL
                        AND TRIM(comments.reply) != ''
                        THEN comments.id
                    END
                ) AS total_replies,

                COUNT(
                    DISTINCT CASE
                        WHEN comments.source = 'RULE'
                        THEN comments.id
                    END
                ) AS rule_replies,

                COUNT(
                    DISTINCT CASE
                        WHEN comments.source = 'GPT'
                        THEN comments.id
                    END
                ) AS gpt_replies,

                MAX(
                    COALESCE(
                        comments.updated_at,
                        comments.created_at
                    )
                ) AS last_activity

            FROM businesses

            LEFT JOIN comments
                ON comments.business_id =
                    businesses.id

            LEFT JOIN reply_rules
                ON reply_rules.business_id =
                    businesses.id

            WHERE businesses.id = ?

            GROUP BY
                businesses.id,
                businesses.name,
                businesses.emoji,
                businesses.prompt,
                businesses.created_at,
                businesses.updated_at
        `)
        .get(Number(businessId));
}

module.exports = router;