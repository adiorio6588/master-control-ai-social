const express = require("express");
const router = express.Router();

const database = require("../database/database");
const { generateReply } = require("../services/openai");
const {
    findMatchingRule
} = require("../services/rulesEngine");

router.post("/reply", async (req, res) => {

    try {

        const { comment, businessId } = req.body;

        if (!comment) {
            return res.status(400).json({
                error: "Comment is required."
            });
        }

        if (!businessId) {
            return res.status(400).json({
                error: "Business is required."
            });
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

        // Check Rules FIRST
        const rule = findMatchingRule(
            businessId,
            comment
        );

        let reply;
        let source;

        if (rule.matched) {

            console.log(
                `✅ Rule matched: ${rule.ruleName}`
            );

            reply = rule.reply;
            source = "RULE";

        } else {

            console.log(
                "🤖 Using GPT..."
            );

            reply = await generateReply(
                business.prompt,
                comment
            );

            source = "GPT";

        }

        res.json({

            business: business.name,

            reply,

            source

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            error:
                "Unable to generate reply."

        });

    }

});

module.exports = router;