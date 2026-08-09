const express = require("express");
const router = express.Router();

const database =
    require("../database/database");

/*
====================================================
GET /api/social-accounts
====================================================
*/

router.get(
    "/social-accounts",
    (req, res) => {
        try {
            const businessId =
                Number(
                    req.query.businessId
                );

            let accounts;

            if (businessId) {
                accounts =
                    database
                        .prepare(`
                            SELECT
                                social_accounts.id,
                                social_accounts.business_id,
                                businesses.name AS business_name,
                                businesses.emoji AS business_emoji,
                                social_accounts.platform,
                                social_accounts.account_name,
                                social_accounts.external_account_id,
                                social_accounts.connected,
                                social_accounts.created_at,
                                social_accounts.updated_at

                            FROM social_accounts

                            INNER JOIN businesses
                                ON businesses.id =
                                    social_accounts.business_id

                            WHERE social_accounts.business_id = ?

                            ORDER BY
                                CASE social_accounts.platform
                                    WHEN 'facebook' THEN 1
                                    WHEN 'instagram' THEN 2
                                    WHEN 'youtube' THEN 3
                                    WHEN 'tiktok' THEN 4
                                    ELSE 5
                                END
                        `)
                        .all(
                            businessId
                        );
            }
            else {
                accounts =
                    database
                        .prepare(`
                            SELECT
                                social_accounts.id,
                                social_accounts.business_id,
                                businesses.name AS business_name,
                                businesses.emoji AS business_emoji,
                                social_accounts.platform,
                                social_accounts.account_name,
                                social_accounts.external_account_id,
                                social_accounts.connected,
                                social_accounts.created_at,
                                social_accounts.updated_at

                            FROM social_accounts

                            INNER JOIN businesses
                                ON businesses.id =
                                    social_accounts.business_id

                            ORDER BY
                                businesses.name ASC,
                                CASE social_accounts.platform
                                    WHEN 'facebook' THEN 1
                                    WHEN 'instagram' THEN 2
                                    WHEN 'youtube' THEN 3
                                    WHEN 'tiktok' THEN 4
                                    ELSE 5
                                END
                        `)
                        .all();
            }

            res.json(
                accounts
            );
        }
        catch (error) {
            console.error(
                "Social account loading error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to load social accounts.",
                details:
                    error.message
            });
        }
    }
);


/*
====================================================
GET /api/social-accounts/:id
====================================================
*/

router.get(
    "/social-accounts/:id",
    (req, res) => {
        try {
            const accountId =
                Number(
                    req.params.id
                );

            if (!accountId) {
                return res
                    .status(400)
                    .json({
                        error:
                            "A valid social account ID is required."
                    });
            }

            const account =
                database
                    .prepare(`
                        SELECT
                            social_accounts.id,
                            social_accounts.business_id,
                            businesses.name AS business_name,
                            businesses.emoji AS business_emoji,
                            social_accounts.platform,
                            social_accounts.account_name,
                            social_accounts.external_account_id,
                            social_accounts.connected,
                            social_accounts.created_at,
                            social_accounts.updated_at

                        FROM social_accounts

                        INNER JOIN businesses
                            ON businesses.id =
                                social_accounts.business_id

                        WHERE social_accounts.id = ?
                    `)
                    .get(
                        accountId
                    );

            if (!account) {
                return res
                    .status(404)
                    .json({
                        error:
                            "Social account not found."
                    });
            }

            res.json(
                account
            );
        }
        catch (error) {
            console.error(
                "Social account loading error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to load social account.",
                details:
                    error.message
            });
        }
    }
);


/*
====================================================
PUT /api/social-accounts/:id
====================================================
*/

router.put(
    "/social-accounts/:id",
    (req, res) => {
        try {
            const accountId =
                Number(
                    req.params.id
                );

            if (!accountId) {
                return res
                    .status(400)
                    .json({
                        error:
                            "A valid social account ID is required."
                    });
            }

            const existing =
                database
                    .prepare(`
                        SELECT *
                        FROM social_accounts
                        WHERE id = ?
                    `)
                    .get(
                        accountId
                    );

            if (!existing) {
                return res
                    .status(404)
                    .json({
                        error:
                            "Social account not found."
                    });
            }

            const accountName =
                req.body.accountName !== undefined
                    ? String(
                        req.body.accountName
                    ).trim()
                    : existing.account_name;

            const externalAccountId =
                req.body.externalAccountId !== undefined
                    ? String(
                        req.body.externalAccountId
                    ).trim()
                    : existing.external_account_id;

            const connected =
                req.body.connected !== undefined
                    ? (
                        req.body.connected
                            ? 1
                            : 0
                    )
                    : existing.connected;

            database
                .prepare(`
                    UPDATE social_accounts

                    SET
                        account_name = ?,
                        external_account_id = ?,
                        connected = ?,
                        updated_at =
                            CURRENT_TIMESTAMP

                    WHERE id = ?
                `)
                .run(
                    accountName,
                    externalAccountId,
                    connected,
                    accountId
                );

            const account =
                database
                    .prepare(`
                        SELECT
                            social_accounts.id,
                            social_accounts.business_id,
                            businesses.name AS business_name,
                            businesses.emoji AS business_emoji,
                            social_accounts.platform,
                            social_accounts.account_name,
                            social_accounts.external_account_id,
                            social_accounts.connected,
                            social_accounts.created_at,
                            social_accounts.updated_at

                        FROM social_accounts

                        INNER JOIN businesses
                            ON businesses.id =
                                social_accounts.business_id

                        WHERE social_accounts.id = ?
                    `)
                    .get(
                        accountId
                    );

            res.json(
                account
            );
        }
        catch (error) {
            console.error(
                "Social account update error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to update social account.",
                details:
                    error.message
            });
        }
    }
);


module.exports =
    router;