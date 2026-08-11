const express = require("express");
const router = express.Router();

const database =
    require("../database/database");


/*
====================================================
GET /api/history
====================================================

Returns reply history ONLY for the
current organization.
====================================================
*/

router.get(
    "/history",
    (req, res) => {

        try {

            const organizationId =
                getCurrentOrganizationId(
                    req
                );


            const history =
                database
                    .prepare(`
                        SELECT

                            replies.id
                                AS reply_id,

                            comments.id
                                AS comment_id,

                            comments.business_id,

                            businesses.organization_id,

                            businesses.name
                                AS business_name,

                            businesses.emoji
                                AS business_emoji,

                            comments.platform,

                            comments.author,

                            comments.content
                                AS comment,

                            replies.content
                                AS reply,

                            replies.approved,

                            replies.posted,

                            replies.created_at


                        FROM replies


                        INNER JOIN comments

                            ON comments.id =
                                replies.comment_id


                        INNER JOIN businesses

                            ON businesses.id =
                                comments.business_id


                        WHERE
                            businesses.organization_id = ?


                        ORDER BY
                            replies.id DESC


                        LIMIT 50
                    `)
                    .all(
                        organizationId
                    );


            res.json(
                history
            );

        }
        catch (error) {

            console.error(
                "History route error:",
                error
            );


            res
                .status(500)
                .json({
                    error:
                        "Unable to load reply history.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
CURRENT ORGANIZATION
====================================================
*/

function getCurrentOrganizationId(
    req
) {

    const organizationId =
        Number(
            req.organizationId
        );


    if (
        !Number.isInteger(
            organizationId
        )
        ||
        organizationId <= 0
    ) {

        throw new Error(
            "Organization context is missing."
        );

    }


    return organizationId;

}


/*
====================================================
EXPORT
====================================================
*/

module.exports =
    router;