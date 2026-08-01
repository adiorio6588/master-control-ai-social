const express = require("express");
const router = express.Router();

const database = require("../database/database");

/*
 * GET /api/rules
 * Optional query:
 * /api/rules?businessId=2
 */
router.get("/rules", (req, res) => {
    try {
        const businessId = Number(req.query.businessId);

        let rules;

        if (businessId) {
            rules = database
                .prepare(`
                    SELECT
                        reply_rules.id,
                        reply_rules.business_id,
                        businesses.name AS business_name,
                        businesses.emoji AS business_emoji,
                        reply_rules.name,
                        reply_rules.keywords,
                        reply_rules.reply,
                        reply_rules.enabled,
                        reply_rules.created_at,
                        reply_rules.updated_at
                    FROM reply_rules
                    INNER JOIN businesses
                        ON businesses.id = reply_rules.business_id
                    WHERE reply_rules.business_id = ?
                    ORDER BY reply_rules.name ASC
                `)
                .all(businessId);
        } else {
            rules = database
                .prepare(`
                    SELECT
                        reply_rules.id,
                        reply_rules.business_id,
                        businesses.name AS business_name,
                        businesses.emoji AS business_emoji,
                        reply_rules.name,
                        reply_rules.keywords,
                        reply_rules.reply,
                        reply_rules.enabled,
                        reply_rules.created_at,
                        reply_rules.updated_at
                    FROM reply_rules
                    INNER JOIN businesses
                        ON businesses.id = reply_rules.business_id
                    ORDER BY businesses.name ASC, reply_rules.name ASC
                `)
                .all();
        }

        res.json(rules);
    } catch (error) {
        console.error("Load rules error:", error);

        res.status(500).json({
            error: "Unable to load reply rules."
        });
    }
});

/*
 * POST /api/rules
 * Create a new rule.
 */
router.post("/rules", (req, res) => {
    try {
        const {
            businessId,
            name,
            keywords,
            reply,
            enabled = 1
        } = req.body;

        if (!businessId) {
            return res.status(400).json({
                error: "Business is required."
            });
        }

        if (!name || !name.trim()) {
            return res.status(400).json({
                error: "Rule name is required."
            });
        }

        if (!keywords || !keywords.trim()) {
            return res.status(400).json({
                error: "At least one keyword is required."
            });
        }

        if (!reply || !reply.trim()) {
            return res.status(400).json({
                error: "Reply text is required."
            });
        }

        const business = database
            .prepare(`
                SELECT id
                FROM businesses
                WHERE id = ?
            `)
            .get(Number(businessId));

        if (!business) {
            return res.status(404).json({
                error: "Business not found."
            });
        }

        const result = database
            .prepare(`
                INSERT INTO reply_rules (
                    business_id,
                    name,
                    keywords,
                    reply,
                    enabled
                )
                VALUES (?, ?, ?, ?, ?)
            `)
            .run(
                Number(businessId),
                name.trim(),
                keywords.trim(),
                reply.trim(),
                enabled ? 1 : 0
            );

        const newRule = getRuleById(result.lastInsertRowid);

        res.status(201).json(newRule);
    } catch (error) {
        console.error("Create rule error:", error);

        if (
            error.code === "SQLITE_CONSTRAINT_UNIQUE" ||
            String(error.message).includes("UNIQUE constraint failed")
        ) {
            return res.status(409).json({
                error:
                    "A rule with this name already exists for the selected business."
            });
        }

        res.status(500).json({
            error: "Unable to create the reply rule."
        });
    }
});

/*
 * PUT /api/rules/:id
 * Update an existing rule.
 */
router.put("/rules/:id", (req, res) => {
    try {
        const ruleId = Number(req.params.id);

        const {
            businessId,
            name,
            keywords,
            reply,
            enabled
        } = req.body;

        if (!ruleId) {
            return res.status(400).json({
                error: "A valid rule ID is required."
            });
        }

        const existingRule = database
            .prepare(`
                SELECT *
                FROM reply_rules
                WHERE id = ?
            `)
            .get(ruleId);

        if (!existingRule) {
            return res.status(404).json({
                error: "Rule not found."
            });
        }

        const updatedBusinessId =
            businessId !== undefined
                ? Number(businessId)
                : existingRule.business_id;

        const updatedName =
            name !== undefined
                ? name.trim()
                : existingRule.name;

        const updatedKeywords =
            keywords !== undefined
                ? keywords.trim()
                : existingRule.keywords;

        const updatedReply =
            reply !== undefined
                ? reply.trim()
                : existingRule.reply;

        const updatedEnabled =
            enabled !== undefined
                ? enabled
                    ? 1
                    : 0
                : existingRule.enabled;

        if (!updatedName) {
            return res.status(400).json({
                error: "Rule name is required."
            });
        }

        if (!updatedKeywords) {
            return res.status(400).json({
                error: "At least one keyword is required."
            });
        }

        if (!updatedReply) {
            return res.status(400).json({
                error: "Reply text is required."
            });
        }

        const business = database
            .prepare(`
                SELECT id
                FROM businesses
                WHERE id = ?
            `)
            .get(updatedBusinessId);

        if (!business) {
            return res.status(404).json({
                error: "Business not found."
            });
        }

        database
            .prepare(`
                UPDATE reply_rules
                SET
                    business_id = ?,
                    name = ?,
                    keywords = ?,
                    reply = ?,
                    enabled = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `)
            .run(
                updatedBusinessId,
                updatedName,
                updatedKeywords,
                updatedReply,
                updatedEnabled,
                ruleId
            );

        const updatedRule = getRuleById(ruleId);

        res.json(updatedRule);
    } catch (error) {
        console.error("Update rule error:", error);

        if (
            error.code === "SQLITE_CONSTRAINT_UNIQUE" ||
            String(error.message).includes("UNIQUE constraint failed")
        ) {
            return res.status(409).json({
                error:
                    "A rule with this name already exists for the selected business."
            });
        }

        res.status(500).json({
            error: "Unable to update the reply rule."
        });
    }
});

/*
 * PATCH /api/rules/:id/toggle
 * Enable or disable a rule.
 */
router.patch("/rules/:id/toggle", (req, res) => {
    try {
        const ruleId = Number(req.params.id);

        const rule = database
            .prepare(`
                SELECT id, enabled
                FROM reply_rules
                WHERE id = ?
            `)
            .get(ruleId);

        if (!rule) {
            return res.status(404).json({
                error: "Rule not found."
            });
        }

        const newEnabledValue = rule.enabled ? 0 : 1;

        database
            .prepare(`
                UPDATE reply_rules
                SET
                    enabled = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `)
            .run(newEnabledValue, ruleId);

        res.json(getRuleById(ruleId));
    } catch (error) {
        console.error("Toggle rule error:", error);

        res.status(500).json({
            error: "Unable to change the rule status."
        });
    }
});

/*
 * DELETE /api/rules/:id
 * Delete a rule.
 */
router.delete("/rules/:id", (req, res) => {
    try {
        const ruleId = Number(req.params.id);

        const rule = database
            .prepare(`
                SELECT id, name
                FROM reply_rules
                WHERE id = ?
            `)
            .get(ruleId);

        if (!rule) {
            return res.status(404).json({
                error: "Rule not found."
            });
        }

        database
            .prepare(`
                DELETE FROM reply_rules
                WHERE id = ?
            `)
            .run(ruleId);

        res.json({
            success: true,
            message: `Rule "${rule.name}" was deleted.`
        });
    } catch (error) {
        console.error("Delete rule error:", error);

        res.status(500).json({
            error: "Unable to delete the reply rule."
        });
    }
});

function getRuleById(ruleId) {
    return database
        .prepare(`
            SELECT
                reply_rules.id,
                reply_rules.business_id,
                businesses.name AS business_name,
                businesses.emoji AS business_emoji,
                reply_rules.name,
                reply_rules.keywords,
                reply_rules.reply,
                reply_rules.enabled,
                reply_rules.created_at,
                reply_rules.updated_at
            FROM reply_rules
            INNER JOIN businesses
                ON businesses.id = reply_rules.business_id
            WHERE reply_rules.id = ?
        `)
        .get(Number(ruleId));
}

module.exports = router;