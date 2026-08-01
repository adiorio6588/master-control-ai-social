const express = require("express");
const router = express.Router();

const database = require("../database/database");
const { generateReply } = require("../services/openai");

router.post("/reply", async (req, res) => {
    try {
        const { comment, businessId } = req.body;

        if (!comment || !comment.trim()) {
            return res.status(400).json({
                error: "Comment is required."
            });
        }

        if (!businessId) {
            return res.status(400).json({
                error: "Business is required."
            });
        }

        const cleanComment = comment.trim();
        const normalizedComment = cleanComment.toLowerCase();

        const business = database
            .prepare(`
                SELECT id, name, emoji, prompt
                FROM businesses
                WHERE id = ?
            `)
            .get(Number(businessId));

        if (!business) {
            return res.status(404).json({
                error: "Business not found."
            });
        }

        console.log("SELECTED BUSINESS:", business.name);

        /*
         * Check enabled rules for the selected business.
         */
        const rules = database
            .prepare(`
                SELECT id, name, keywords, reply
                FROM reply_rules
                WHERE business_id = ?
                  AND enabled = 1
                ORDER BY id ASC
            `)
            .all(business.id);

        const matchedRule = findMatchingRule(
            rules,
            normalizedComment
        );

        let reply;
        let replySource;
        let ruleName = null;

        if (matchedRule) {
            reply = matchedRule.reply;
            replySource = "rule";
            ruleName = matchedRule.name;

            console.log("RULE MATCHED:", matchedRule.name);
        } else {
            reply = await generateReply(
                business.prompt,
                cleanComment
            );

            replySource = "ai";

            console.log("NO RULE MATCHED — USING AI SERVICE");
        }

        /*
         * Save the incoming comment and resulting reply.
         */
        const saveConversation = database.transaction(() => {
            const commentResult = database
                .prepare(`
                    INSERT INTO comments (
                        business_id,
                        platform,
                        author,
                        content,
                        status
                    )
                    VALUES (?, ?, ?, ?, ?)
                `)
                .run(
                    business.id,
                    "manual",
                    "Customer",
                    cleanComment,
                    "replied"
                );

            const replyResult = database
                .prepare(`
                    INSERT INTO replies (
                        comment_id,
                        content,
                        approved,
                        posted
                    )
                    VALUES (?, ?, ?, ?)
                `)
                .run(
                    commentResult.lastInsertRowid,
                    reply,
                    0,
                    0
                );

            return {
                commentId: Number(
                    commentResult.lastInsertRowid
                ),
                replyId: Number(
                    replyResult.lastInsertRowid
                )
            };
        });

        const saved = saveConversation();

        res.json({
            business: business.name,
            reply,
            source: replySource,
            ruleName,
            commentId: saved.commentId,
            replyId: saved.replyId
        });
    } catch (error) {
        console.error("AI route error:", error);

        res.status(500).json({
            error: "Unable to generate reply."
        });
    }
});

function findMatchingRule(rules, normalizedComment) {
    for (const rule of rules) {
        const keywords = rule.keywords
            .split(",")
            .map((keyword) => keyword.trim().toLowerCase())
            .filter(Boolean);

        const hasMatch = keywords.some((keyword) =>
            normalizedComment.includes(keyword)
        );

        if (hasMatch) {
            return rule;
        }
    }

    return null;
}

module.exports = router;