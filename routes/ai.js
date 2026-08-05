const express = require("express");
const router = express.Router();

const database = require("../database/database");

const {
    generateReply
} = require("../services/openai");

const {
    findMatchingRule
} = require("../services/rulesEngine");

const {
    detectBusiness
} = require("../services/businessDetector");

router.post("/reply", async (req, res) => {
    const startedAt = Date.now();

    try {
        const comment =
            typeof req.body.comment === "string"
                ? req.body.comment.trim()
                : "";

        let businessId =
            Number(req.body.businessId) || null;

        const requestedCommentId =
            Number(req.body.commentId) || null;

        let detectedAutomatically = false;

        if (!comment) {
            return res.status(400).json({
                error: "Comment is required."
            });
        }

        /*
         * Automatically detect the business when
         * no business ID is provided.
         */
        if (!businessId) {
            const detection =
                detectBusiness(comment);

            if (!detection.detected) {
                return res.status(400).json({
                    error:
                        "Unable to determine which business this comment belongs to."
                });
            }

            businessId =
                Number(detection.businessId);

            detectedAutomatically = true;

            console.log(
                `🧠 Detected business: ` +
                `${detection.emoji || "🏢"} ` +
                `${detection.businessName}`
            );
        }

        const business = database
            .prepare(`
                SELECT
                    id,
                    name,
                    emoji,
                    prompt
                FROM businesses
                WHERE id = ?
            `)
            .get(businessId);

        if (!business) {
            return res.status(404).json({
                error: "Business not found."
            });
        }

        /*
         * Check for an enabled reply rule before
         * calling the AI service.
         */
        const ruleResult =
            findMatchingRule(
                business.id,
                comment
            );

        let reply;
        let source;
        let ruleName = null;
        let confidence = null;
        let estimatedCost = null;

        if (ruleResult.matched) {
            reply = ruleResult.reply;
            source = "RULE";
            ruleName = ruleResult.ruleName;
            confidence = 100;
            estimatedCost = 0;

            console.log(
                `✅ Rule matched: ${ruleName}`
            );
        } else {
            source = "GPT";

            console.log(
                "🤖 No rule matched. Using GPT or mock mode..."
            );

            reply = await generateReply(
                business.prompt,
                comment
            );

            /*
             * GPT confidence and cost remain null until
             * real token-usage data is recorded.
             */
            confidence = null;
            estimatedCost = null;
        }

        const processingTime =
            Date.now() - startedAt;

        /*
         * Save the comment, reply, and AI analysis.
         *
         * If commentId is provided, update that inbox item.
         * Otherwise, create a new manual comment for dashboard use.
         */
        const saveResult =
            database.transaction(() => {
                let commentId =
                    requestedCommentId;

                if (commentId) {
                    const existingComment =
                        database
                            .prepare(`
                                SELECT
                                    id,
                                    business_id
                                FROM comments
                                WHERE id = ?
                            `)
                            .get(commentId);

                    if (!existingComment) {
                        const error =
                            new Error(
                                "Inbox comment not found."
                            );

                        error.statusCode = 404;

                        throw error;
                    }

                    database
                        .prepare(`
                            UPDATE comments
                            SET
                                business_id = ?,
                                reply = ?,
                                source = ?,
                                rule = ?,
                                confidence = ?,
                                processing_time = ?,
                                estimated_cost = ?,
                                status = 'replied',
                                updated_at =
                                    CURRENT_TIMESTAMP
                            WHERE id = ?
                        `)
                        .run(
                            business.id,
                            reply,
                            source,
                            ruleName,
                            confidence,
                            processingTime,
                            estimatedCost,
                            commentId
                        );
                } else {
                    const commentResult =
                        database
                            .prepare(`
                                INSERT INTO comments (
                                    business_id,
                                    platform,
                                    author,
                                    content,
                                    status,
                                    reply,
                                    source,
                                    rule,
                                    confidence,
                                    processing_time,
                                    estimated_cost,
                                    updated_at
                                )
                                VALUES (
                                    ?,
                                    'manual',
                                    'Customer',
                                    ?,
                                    'replied',
                                    ?,
                                    ?,
                                    ?,
                                    ?,
                                    ?,
                                    ?,
                                    CURRENT_TIMESTAMP
                                )
                            `)
                            .run(
                                business.id,
                                comment,
                                reply,
                                source,
                                ruleName,
                                confidence,
                                processingTime,
                                estimatedCost
                            );

                    commentId =
                        Number(
                            commentResult.lastInsertRowid
                        );
                }

                const replyResult =
                    database
                        .prepare(`
                            INSERT INTO replies (
                                comment_id,
                                content,
                                approved,
                                posted
                            )
                            VALUES (?, ?, 0, 0)
                        `)
                        .run(
                            commentId,
                            reply
                        );

                return {
                    commentId,
                    replyId:
                        Number(
                            replyResult.lastInsertRowid
                        )
                };
            })();

        res.json({
            commentId:
                saveResult.commentId,

            replyId:
                saveResult.replyId,

            businessId:
                business.id,

            business:
                business.name,

            emoji:
                business.emoji || "🏢",

            detectedAutomatically,

            source,

            rule:
                ruleName,

            confidence,

            processingTime,

            estimatedCost,

            status:
                "replied",

            reply
        });
    } catch (error) {
        const processingTime =
            Date.now() - startedAt;

        console.error(
            "Reply generation error:",
            error
        );

        res
            .status(
                error.statusCode || 500
            )
            .json({
                error:
                    error.message ||
                    "Unable to generate reply.",

                processingTime
            });
    }
});

module.exports = router;