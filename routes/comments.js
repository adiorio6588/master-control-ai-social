const express = require("express");
const router = express.Router();

const database = require("../database/database");

const allowedPlatforms = [
    "manual",
    "facebook",
    "instagram",
    "youtube",
    "tiktok"
];

const allowedStatuses = [
    "pending",
    "replied",
    "approved",
    "posted",
    "ignored"
];

/*
 * GET /api/comments
 *
 * Optional filters:
 * /api/comments?businessId=2
 * /api/comments?platform=facebook
 * /api/comments?status=pending
 */
router.get("/comments", (req, res) => {
    try {
        const businessId = Number(req.query.businessId);
        const platform = normalizeText(req.query.platform);
        const status = normalizeText(req.query.status);

        const conditions = [];
        const values = [];

        if (businessId) {
            conditions.push("comments.business_id = ?");
            values.push(businessId);
        }

        if (platform) {
            conditions.push("comments.platform = ?");
            values.push(platform);
        }

        if (status) {
            conditions.push("comments.status = ?");
            values.push(status);
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

        const comments = database
            .prepare(`
                SELECT
                    comments.id,
                    comments.business_id,
                    businesses.name AS business_name,
                    businesses.emoji AS business_emoji,
                    comments.platform,
                    comments.author,
                    comments.content,
                    comments.status,
                    comments.created_at,

                    replies.id AS reply_id,
                    replies.content AS reply,
                    replies.approved,
                    replies.posted

                FROM comments

                LEFT JOIN businesses
                    ON businesses.id = comments.business_id

                LEFT JOIN replies
                    ON replies.id = (
                        SELECT newest_reply.id
                        FROM replies AS newest_reply
                        WHERE newest_reply.comment_id = comments.id
                        ORDER BY newest_reply.id DESC
                        LIMIT 1
                    )

                ${whereClause}

                ORDER BY comments.id DESC
                LIMIT 100
            `)
            .all(...values);

        res.json(comments);
    } catch (error) {
        console.error("Load comments error:", error);

        res.status(500).json({
            error: "Unable to load inbox comments.",
            details: error.message
        });
    }
});

/*
 * GET /api/comments/:id
 */
router.get("/comments/:id", (req, res) => {
    try {
        const commentId = Number(req.params.id);

        if (!commentId) {
            return res.status(400).json({
                error: "A valid comment ID is required."
            });
        }

        const comment = getCommentById(commentId);

        if (!comment) {
            return res.status(404).json({
                error: "Comment not found."
            });
        }

        res.json(comment);
    } catch (error) {
        console.error("Load comment error:", error);

        res.status(500).json({
            error: "Unable to load the comment.",
            details: error.message
        });
    }
});

/*
 * POST /api/comments
 *
 * Create a manual test comment.
 */
router.post("/comments", (req, res) => {
    try {
        const {
            businessId,
            platform = "manual",
            author = "Customer",
            content
        } = req.body;

        const numericBusinessId = Number(businessId);
        const normalizedPlatform =
            normalizeText(platform) || "manual";

        if (!numericBusinessId) {
            return res.status(400).json({
                error: "Business is required."
            });
        }

        if (!content || !content.trim()) {
            return res.status(400).json({
                error: "Comment text is required."
            });
        }

        if (!allowedPlatforms.includes(normalizedPlatform)) {
            return res.status(400).json({
                error: "Invalid social platform."
            });
        }

        const business = database
            .prepare(`
                SELECT id
                FROM businesses
                WHERE id = ?
            `)
            .get(numericBusinessId);

        if (!business) {
            return res.status(404).json({
                error: "Business not found."
            });
        }

        const result = database
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
                numericBusinessId,
                normalizedPlatform,
                String(author || "Customer").trim() || "Customer",
                content.trim(),
                "pending"
            );

        res.status(201).json(
            getCommentById(result.lastInsertRowid)
        );
    } catch (error) {
        console.error("Create comment error:", error);

        res.status(500).json({
            error: "Unable to create the inbox comment.",
            details: error.message
        });
    }
});

/*
 * PUT /api/comments/:id
 *
 * Edit a comment.
 */
router.put("/comments/:id", (req, res) => {
    try {
        const commentId = Number(req.params.id);

        if (!commentId) {
            return res.status(400).json({
                error: "A valid comment ID is required."
            });
        }

        const existingComment = database
            .prepare(`
                SELECT *
                FROM comments
                WHERE id = ?
            `)
            .get(commentId);

        if (!existingComment) {
            return res.status(404).json({
                error: "Comment not found."
            });
        }

        const businessId =
            req.body.businessId !== undefined
                ? Number(req.body.businessId)
                : existingComment.business_id;

        const platform =
            req.body.platform !== undefined
                ? normalizeText(req.body.platform)
                : existingComment.platform;

        const author =
            req.body.author !== undefined
                ? String(req.body.author).trim()
                : existingComment.author;

        const content =
            req.body.content !== undefined
                ? String(req.body.content).trim()
                : existingComment.content;

        const status =
            req.body.status !== undefined
                ? normalizeText(req.body.status)
                : existingComment.status;

        if (!businessId) {
            return res.status(400).json({
                error: "Business is required."
            });
        }

        if (!content) {
            return res.status(400).json({
                error: "Comment text is required."
            });
        }

        if (!allowedPlatforms.includes(platform)) {
            return res.status(400).json({
                error: "Invalid social platform."
            });
        }

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                error: "Invalid comment status."
            });
        }

        const business = database
            .prepare(`
                SELECT id
                FROM businesses
                WHERE id = ?
            `)
            .get(businessId);

        if (!business) {
            return res.status(404).json({
                error: "Business not found."
            });
        }

        database
            .prepare(`
                UPDATE comments
                SET
                    business_id = ?,
                    platform = ?,
                    author = ?,
                    content = ?,
                    status = ?
                WHERE id = ?
            `)
            .run(
                businessId,
                platform,
                author || "Customer",
                content,
                status,
                commentId
            );

        res.json(getCommentById(commentId));
    } catch (error) {
        console.error("Update comment error:", error);

        res.status(500).json({
            error: "Unable to update the inbox comment.",
            details: error.message
        });
    }
});

/*
 * PATCH /api/comments/:id/status
 *
 * Example body:
 * {
 *   "status": "approved"
 * }
 */
router.patch("/comments/:id/status", (req, res) => {
    try {
        const commentId = Number(req.params.id);
        const status = normalizeText(req.body.status);

        if (!commentId) {
            return res.status(400).json({
                error: "A valid comment ID is required."
            });
        }

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                error: "Invalid comment status."
            });
        }

        const result = database
            .prepare(`
                UPDATE comments
                SET status = ?
                WHERE id = ?
            `)
            .run(status, commentId);

        if (!result.changes) {
            return res.status(404).json({
                error: "Comment not found."
            });
        }

        res.json(getCommentById(commentId));
    } catch (error) {
        console.error("Update comment status error:", error);

        res.status(500).json({
            error: "Unable to update the comment status.",
            details: error.message
        });
    }
});

/*
 * DELETE /api/comments/:id
 */
router.delete("/comments/:id", (req, res) => {
    try {
        const commentId = Number(req.params.id);

        if (!commentId) {
            return res.status(400).json({
                error: "A valid comment ID is required."
            });
        }

        const comment = database
            .prepare(`
                SELECT id, author
                FROM comments
                WHERE id = ?
            `)
            .get(commentId);

        if (!comment) {
            return res.status(404).json({
                error: "Comment not found."
            });
        }

        const deleteComment = database.transaction(() => {
            database
                .prepare(`
                    DELETE FROM replies
                    WHERE comment_id = ?
                `)
                .run(commentId);

            database
                .prepare(`
                    DELETE FROM comments
                    WHERE id = ?
                `)
                .run(commentId);
        });

        deleteComment();

        res.json({
            success: true,
            message: `Comment from ${comment.author} was deleted.`
        });
    } catch (error) {
        console.error("Delete comment error:", error);

        res.status(500).json({
            error: "Unable to delete the inbox comment.",
            details: error.message
        });
    }
});

function getCommentById(commentId) {
    return database
        .prepare(`
            SELECT
                comments.id,
                comments.business_id,
                businesses.name AS business_name,
                businesses.emoji AS business_emoji,
                comments.platform,
                comments.author,
                comments.content,
                comments.status,
                comments.created_at,

                replies.id AS reply_id,
                replies.content AS reply,
                replies.approved,
                replies.posted

            FROM comments

            LEFT JOIN businesses
                ON businesses.id = comments.business_id

            LEFT JOIN replies
                ON replies.id = (
                    SELECT newest_reply.id
                    FROM replies AS newest_reply
                    WHERE newest_reply.comment_id = comments.id
                    ORDER BY newest_reply.id DESC
                    LIMIT 1
                )

            WHERE comments.id = ?
        `)
        .get(Number(commentId));
}

function normalizeText(value) {
    return typeof value === "string"
        ? value.trim().toLowerCase()
        : "";
}

module.exports = router;