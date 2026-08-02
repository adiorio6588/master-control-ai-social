const express = require("express");
const router = express.Router();

const database = require("../database/database");

const { generateReply } = require("../services/openai");

const {
    findMatchingRule
} = require("../services/rulesEngine");

const {
    detectBusiness
} = require("../services/businessDetector");

router.post("/reply", async (req, res) => {

    try {

        const { comment } = req.body;

        let { businessId } = req.body;

        if (!comment) {

            return res.status(400).json({
                error: "Comment is required."
            });

        }

        // Automatically detect the business if none was selected.
        if (!businessId) {

            const detected = detectBusiness(comment);

            if (detected.detected) {

                businessId = detected.businessId;

                console.log(
                    `🧠 Detected Business: ${detected.emoji} ${detected.businessName}`
                );

            } else {

                return res.status(400).json({
                    error: "Unable to determine which business this comment belongs to."
                });

            }

        }

        const business = database
            .prepare(`
                SELECT *
                FROM businesses
                WHERE id = ?
            `)
            .get(businessId);

        if (!business) {

            return res.status(404).json({
                error: "Business not found."
            });

        }

        // Try the Rules Engine first.
        const rule = findMatchingRule(
            businessId,
            comment
        );

        let reply;
        let source;
        let ruleName = null;

        if (rule.matched) {

            console.log(
                `✅ Rule Matched: ${rule.ruleName}`
            );

            reply = rule.reply;
            source = "RULE";
            ruleName = rule.ruleName;

        } else {

            console.log(
                "🤖 No rule found. Using GPT..."
            );

            reply = await generateReply(
                business.prompt,
                comment
            );

            source = "GPT";

        }

        res.json({

            businessId,

            business: business.name,

            emoji: business.emoji,

            source,

            rule: ruleName,

            reply

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            error: "Unable to generate reply."

        });

    }

});

module.exports = router;