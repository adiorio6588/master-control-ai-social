const express =
    require("express");

const router =
    express.Router();

const database =
    require("../database/database");


/*
====================================================
GET /api/settings/automation
====================================================
*/

router.get(
    "/settings/automation",
    (req, res) => {

        try {

            const organizationId =
                Number(
                    req.organizationId
                );

            const businessId =
                Number(
                    req.query.businessId
                );

            const platform =
                String(
                    req.query.platform ||
                    "all"
                )
                    .trim()
                    .toLowerCase();


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


            if (
                !Number.isInteger(
                    businessId
                )
                ||
                businessId <= 0
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Business is required."
                    });

            }


            /*
            ============================================
            VERIFY BUSINESS
            ============================================
            */

            const business =
                database
                    .prepare(`
                        SELECT id

                        FROM businesses

                        WHERE
                            id = ?
                            AND organization_id = ?
                    `)
                    .get(
                        businessId,
                        organizationId
                    );


            if (!business) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Business not found."
                    });

            }


            const key =
                getAutomationKey(
                    organizationId,
                    businessId,
                    platform
                );


            const row =
                database
                    .prepare(`
                        SELECT value

                        FROM settings

                        WHERE key = ?
                    `)
                    .get(
                        key
                    );


            if (!row) {

                return res.json({
                    businessId,
                    platform,

                    autoGenerate:
                        false,

                    requireApproval:
                        true,

                    autoRules:
                        false,

                    autoPost:
                        false
                });

            }


            let settings;


            try {

                settings =
                    JSON.parse(
                        row.value
                    );

            }
            catch {

                settings = {};

            }


            res.json({

                businessId,

                platform,

                autoGenerate:
                    Boolean(
                        settings.autoGenerate
                    ),

                requireApproval:
                    settings.requireApproval !==
                    false,

                autoRules:
                    Boolean(
                        settings.autoRules
                    ),

                autoPost:
                    Boolean(
                        settings.autoPost
                    )

            });

        }
        catch (error) {

            console.error(
                "Load automation settings error:",
                error
            );


            res
                .status(500)
                .json({
                    error:
                        "Unable to load automation settings.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
PUT /api/settings/automation
====================================================
*/

router.put(
    "/settings/automation",
    (req, res) => {

        try {

            const organizationId =
                Number(
                    req.organizationId
                );


            const businessId =
                Number(
                    req.body.businessId
                );


            const platform =
                String(
                    req.body.platform ||
                    "all"
                )
                    .trim()
                    .toLowerCase();


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


            if (
                !Number.isInteger(
                    businessId
                )
                ||
                businessId <= 0
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Business is required."
                    });

            }


            const allowedPlatforms = [
                "all",
                "facebook",
                "instagram",
                "youtube",
                "tiktok",
                "manual"
            ];


            if (
                !allowedPlatforms.includes(
                    platform
                )
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Invalid platform."
                    });

            }


            /*
            ============================================
            VERIFY BUSINESS
            ============================================
            */

            const business =
                database
                    .prepare(`
                        SELECT id

                        FROM businesses

                        WHERE
                            id = ?
                            AND organization_id = ?
                    `)
                    .get(
                        businessId,
                        organizationId
                    );


            if (!business) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Business not found."
                    });

            }


            const settings = {

                autoGenerate:
                    Boolean(
                        req.body.autoGenerate
                    ),

                requireApproval:
                    req.body.requireApproval !==
                    false,

                autoRules:
                    Boolean(
                        req.body.autoRules
                    ),

                autoPost:
                    Boolean(
                        req.body.autoPost
                    )

            };


            const key =
                getAutomationKey(
                    organizationId,
                    businessId,
                    platform
                );


            database
                .prepare(`
                    INSERT INTO settings (
                        key,
                        value,
                        updated_at
                    )

                    VALUES (
                        ?,
                        ?,
                        CURRENT_TIMESTAMP
                    )

                    ON CONFLICT(key)

                    DO UPDATE SET
                        value =
                            excluded.value,

                        updated_at =
                            CURRENT_TIMESTAMP
                `)
                .run(
                    key,
                    JSON.stringify(
                        settings
                    )
                );


            res.json({

                success:
                    true,

                businessId,

                platform,

                ...settings

            });

        }
        catch (error) {

            console.error(
                "Save automation settings error:",
                error
            );


            res
                .status(500)
                .json({
                    error:
                        "Unable to save automation settings.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
AUTOMATION KEY
====================================================
*/

function getAutomationKey(
    organizationId,
    businessId,
    platform
) {

    return (
        "automation:" +
        organizationId +
        ":" +
        businessId +
        ":" +
        platform
    );

}


/*
====================================================
EXPORT
====================================================
*/

module.exports =
    router;