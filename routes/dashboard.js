const express = require("express");
const router = express.Router();

const database = require("../database/database");

/*
 * GET /api/dashboard
 *
 * Returns live statistics for the Master Control dashboard.
 */
router.get("/dashboard", (req, res) => {
    try {
        const businesses = database
            .prepare(`
                SELECT COUNT(*) AS total
                FROM businesses
            `)
            .get().total;

        const totalComments = database
            .prepare(`
                SELECT COUNT(*) AS total
                FROM comments
            `)
            .get().total;

        const commentsToday = database
            .prepare(`
                SELECT COUNT(*) AS total
                FROM comments
                WHERE DATE(
                    created_at,
                    'localtime'
                ) = DATE(
                    'now',
                    'localtime'
                )
            `)
            .get().total;

        const pending = getStatusCount("pending");
        const replied = getStatusCount("replied");
        const approved = getStatusCount("approved");
        const posted = getStatusCount("posted");
        const ignored = getStatusCount("ignored");

        const ruleReplies = database
            .prepare(`
                SELECT COUNT(*) AS total
                FROM comments
                WHERE source = 'RULE'
            `)
            .get().total;

        const gptReplies = database
            .prepare(`
                SELECT COUNT(*) AS total
                FROM comments
                WHERE source = 'GPT'
            `)
            .get().total;

        const repliesToday = database
            .prepare(`
                SELECT COUNT(*) AS total
                FROM comments
                WHERE reply IS NOT NULL
                AND TRIM(reply) != ''
                AND DATE(
                    COALESCE(
                        updated_at,
                        created_at
                    ),
                    'localtime'
                ) = DATE(
                    'now',
                    'localtime'
                )
            `)
            .get().total;

        const averageProcessingResult = database
            .prepare(`
                SELECT
                    ROUND(
                        AVG(processing_time),
                        2
                    ) AS average
                FROM comments
                WHERE processing_time IS NOT NULL
            `)
            .get();

        const averageProcessingTime =
            averageProcessingResult.average || 0;

        const estimatedCostResult = database
            .prepare(`
                SELECT
                    ROUND(
                        COALESCE(
                            SUM(estimated_cost),
                            0
                        ),
                        4
                    ) AS total
                FROM comments
            `)
            .get();

        const estimatedCost =
            estimatedCostResult.total || 0;

        const activityToday = database
            .prepare(`
                SELECT
                    COUNT(*) AS total
                FROM comments
                WHERE DATE(
                    COALESCE(
                        updated_at,
                        created_at
                    ),
                    'localtime'
                ) = DATE(
                    'now',
                    'localtime'
                )
            `)
            .get().total;

        const businessActivity = database
            .prepare(`
                SELECT
                    businesses.id,
                    businesses.name,
                    businesses.emoji,

                    COUNT(
                        comments.id
                    ) AS total_comments,

                    SUM(
                        CASE
                            WHEN comments.status = 'pending'
                                THEN 1
                            ELSE 0
                        END
                    ) AS pending_comments,

                    SUM(
                        CASE
                            WHEN comments.status = 'replied'
                                THEN 1
                            ELSE 0
                        END
                    ) AS replied_comments,

                    SUM(
                        CASE
                            WHEN comments.status = 'approved'
                                THEN 1
                            ELSE 0
                        END
                    ) AS approved_comments,

                    SUM(
                        CASE
                            WHEN comments.status = 'posted'
                                THEN 1
                            ELSE 0
                        END
                    ) AS posted_comments,

                    SUM(
                        CASE
                            WHEN comments.status = 'ignored'
                                THEN 1
                            ELSE 0
                        END
                    ) AS ignored_comments,

                    SUM(
                        CASE
                            WHEN comments.source = 'RULE'
                                THEN 1
                            ELSE 0
                        END
                    ) AS rule_replies,

                    SUM(
                        CASE
                            WHEN comments.source = 'GPT'
                                THEN 1
                            ELSE 0
                        END
                    ) AS gpt_replies

                FROM businesses

                LEFT JOIN comments
                    ON comments.business_id =
                        businesses.id

                GROUP BY
                    businesses.id,
                    businesses.name,
                    businesses.emoji

                ORDER BY
                    pending_comments DESC,
                    total_comments DESC,
                    businesses.name ASC
            `)
            .all();

        const recentActivity = database
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
                    comments.source,
                    comments.rule,
                    comments.created_at,
                    comments.updated_at

                FROM comments

                LEFT JOIN businesses
                    ON businesses.id =
                        comments.business_id

                ORDER BY
                    COALESCE(
                        comments.updated_at,
                        comments.created_at
                    ) DESC,
                    comments.id DESC

                LIMIT 10
            `)
            .all();

        res.json({
            systemStatus: "online",

            businesses,
            totalComments,
            commentsToday,
            repliesToday,
            activityToday,

            statuses: {
                pending,
                replied,
                approved,
                posted,
                ignored
            },

            ruleReplies,
            gptReplies,

            averageProcessingTime,
            estimatedCost,

            businessActivity,
            recentActivity
        });
    } catch (error) {
        console.error(
            "Dashboard route error:",
            error
        );

        res.status(500).json({
            error:
                "Unable to load dashboard statistics.",
            details:
                error.message
        });
    }
});

/*
 * Return the number of comments with a specific status.
 */
function getStatusCount(status) {
    const result = database
        .prepare(`
            SELECT COUNT(*) AS total
            FROM comments
            WHERE status = ?
        `)
        .get(status);

    return result.total || 0;
}

module.exports = router;