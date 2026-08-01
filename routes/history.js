const express = require("express");
const router = express.Router();

const database = require("../database/database");

router.get("/history", (req, res) => {
    try {
        const history = database
            .prepare(`
                SELECT
                    replies.id AS reply_id,
                    comments.id AS comment_id,
                    businesses.name AS business_name,
                    businesses.emoji AS business_emoji,
                    comments.platform,
                    comments.author,
                    comments.content AS comment,
                    replies.content AS reply,
                    replies.approved,
                    replies.posted,
                    replies.created_at
                FROM replies
                INNER JOIN comments
                    ON comments.id = replies.comment_id
                LEFT JOIN businesses
                    ON businesses.id = comments.business_id
                ORDER BY replies.id DESC
                LIMIT 50
            `)
            .all();

        res.json(history);
    } catch (error) {
        console.error("History route error:", error);

        res.status(500).json({
            error: "Unable to load reply history."
        });
    }
});

module.exports = router;