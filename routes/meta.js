const express =
    require("express");


const crypto =
    require("crypto");


const jwt =
    require("jsonwebtoken");


const database =
    require("../database/database");


const authMiddleware =
    require("../middleware/auth");


const {
    encryptToken,
    decryptToken
} = require(
    "../services/tokenEncryption"
);


const router =
    express.Router();


/*
====================================================
MASTER CONTROL
META OAUTH
====================================================
*/


/*
====================================================
GET /api/meta/connect
====================================================
*/

router.get(
    "/meta/connect",
    authMiddleware,
    async (req, res) => {

        try {

            const appId =
                process.env.META_APP_ID;

            const configId =
                process.env.META_CONFIG_ID;

            const redirectUri =
                process.env.META_REDIRECT_URI;

            const jwtSecret =
                process.env.JWT_SECRET;


            if (
                !appId ||
                !configId ||
                !redirectUri ||
                !jwtSecret
            ) {

                return res
                    .status(500)
                    .json({
                        error:
                            "Meta connection is not configured."
                    });

            }


            const organizationId =
                Number(
                    req.organizationId
                );


            const userId =
                Number(
                    req.user?.id
                );


            if (
                !Number.isInteger(
                    organizationId
                )
                ||
                organizationId <= 0
                ||
                !Number.isInteger(
                    userId
                )
                ||
                userId <= 0
            ) {

                return res
                    .status(401)
                    .json({
                        error:
                            "Authentication required."
                    });

            }


            const businessId =
                req.query.businessId
                    ? Number(
                        req.query.businessId
                    )
                    : null;


            const platform =
                typeof req.query.platform ===
                    "string"

                    ? req.query.platform
                        .trim()
                        .toLowerCase()

                    : null;


            if (
                businessId !== null
            ) {

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
                                "Invalid business ID."
                        });

                }


                const business =
                    database
                        .prepare(`
                            SELECT
                                id,
                                organization_id,
                                name

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

            }


            if (
                platform !== null
                &&
                platform !== "facebook"
                &&
                platform !== "instagram"
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Unsupported Meta platform."
                    });

            }


            const state =
                jwt.sign(
                    {
                        purpose:
                            "meta_oauth",

                        userId,

                        organizationId,

                        businessId,

                        platform,

                        nonce:
                            crypto
                                .randomBytes(16)
                                .toString("hex")
                    },
                    jwtSecret,
                    {
                        expiresIn:
                            "10m"
                    }
                );


            const authorizationUrl =
                new URL(
                    "https://www.facebook.com/dialog/oauth"
                );


            authorizationUrl
                .searchParams
                .set(
                    "client_id",
                    appId
                );


            authorizationUrl
                .searchParams
                .set(
                    "redirect_uri",
                    redirectUri
                );


            authorizationUrl
                .searchParams
                .set(
                    "response_type",
                    "code"
                );


            authorizationUrl
                .searchParams
                .set(
                    "config_id",
                    configId
                );


            authorizationUrl
                .searchParams
                .set(
                    "state",
                    state
                );


            return res.json({

                provider:
                    "meta",

                organizationId,

                businessId,

                platform,

                authorizationUrl:
                    authorizationUrl
                        .toString()

            });

        }
        catch (error) {

            console.error(
                "Meta connect error:",
                error
            );


            return res
                .status(500)
                .json({
                    error:
                        "Unable to start Meta connection.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
GET /api/meta/callback
====================================================
*/

router.get(
    "/meta/callback",
    async (req, res) => {

        try {

            const appId =
                process.env.META_APP_ID;

            const appSecret =
                process.env.META_APP_SECRET;

            const redirectUri =
                process.env.META_REDIRECT_URI;

            const jwtSecret =
                process.env.JWT_SECRET;


            if (
                !appId ||
                !appSecret ||
                !redirectUri ||
                !jwtSecret
            ) {

                return res
                    .status(500)
                    .json({
                        error:
                            "Meta connection is not configured."
                    });

            }


            if (
                req.query.error
            ) {

                console.error(
                    "Meta OAuth returned an error:",
                    {
                        error:
                            req.query.error,

                        reason:
                            req.query.error_reason,

                        description:
                            req.query.error_description
                    }
                );


                return res.redirect(
                    "/businesses?meta=cancelled"
                );

            }


            const code =
                typeof req.query.code ===
                    "string"

                    ? req.query.code

                    : "";


            const state =
                typeof req.query.state ===
                    "string"

                    ? req.query.state

                    : "";


            if (
                !code ||
                !state
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Meta authorization code or state is missing."
                    });

            }


            let statePayload;


            try {

                statePayload =
                    jwt.verify(
                        state,
                        jwtSecret
                    );

            }
            catch (error) {

                console.error(
                    "Invalid Meta OAuth state:",
                    error
                );


                return res
                    .status(400)
                    .json({
                        error:
                            "Meta authorization state is invalid or expired."
                    });

            }


            if (
                statePayload.purpose !==
                    "meta_oauth"
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Invalid Meta authorization state."
                    });

            }


            const organizationId =
                Number(
                    statePayload.organizationId
                );


            const userId =
                Number(
                    statePayload.userId
                );


            const businessId =
                statePayload.businessId
                    ? Number(
                        statePayload.businessId
                    )
                    : null;


            const platform =
                statePayload.platform ||
                null;


            if (
                !Number.isInteger(
                    organizationId
                )
                ||
                organizationId <= 0
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Invalid Master Control organization."
                    });

            }


            const organization =
                database
                    .prepare(`
                        SELECT
                            id,
                            name

                        FROM organizations

                        WHERE id = ?
                    `)
                    .get(
                        organizationId
                    );


            if (!organization) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Master Control organization not found."
                    });

            }


            if (
                businessId
            ) {

                const business =
                    database
                        .prepare(`
                            SELECT
                                id

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

            }


            const tokenUrl =
                new URL(
                    "https://graph.facebook.com/oauth/access_token"
                );


            tokenUrl
                .searchParams
                .set(
                    "client_id",
                    appId
                );


            tokenUrl
                .searchParams
                .set(
                    "client_secret",
                    appSecret
                );


            tokenUrl
                .searchParams
                .set(
                    "redirect_uri",
                    redirectUri
                );


            tokenUrl
                .searchParams
                .set(
                    "code",
                    code
                );


            const tokenResponse =
                await fetch(
                    tokenUrl,
                    {
                        method:
                            "GET",

                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );


            const tokenData =
                await tokenResponse
                    .json();


            if (
                !tokenResponse.ok
                ||
                !tokenData.access_token
            ) {

                console.error(
                    "Meta token exchange failed:",
                    tokenData
                );


                return res
                    .status(502)
                    .json({
                        error:
                            "Unable to exchange Meta authorization code.",

                        meta:
                            tokenData
                                ?.error
                                ?.message ||
                            "Unknown Meta token error."
                    });

            }


            const encryptedAccessToken =
                encryptToken(
                    tokenData.access_token
                );


            let tokenExpiresAt =
                null;


            const expiresIn =
                Number(
                    tokenData.expires_in
                );


            if (
                Number.isFinite(
                    expiresIn
                )
                &&
                expiresIn > 0
            ) {

                tokenExpiresAt =
                    new Date(
                        Date.now() +
                        expiresIn *
                        1000
                    )
                        .toISOString();

            }


            database
                .prepare(`
                    INSERT INTO social_oauth_connections (

                        organization_id,
                        provider,
                        provider_user_id,
                        provider_user_name,
                        access_token_encrypted,
                        refresh_token_encrypted,
                        token_expires_at,
                        scopes,
                        created_at,
                        updated_at

                    )

                    VALUES (
                        ?,
                        'meta',
                        '',
                        '',
                        ?,
                        '',
                        ?,
                        '',
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    )

                    ON CONFLICT(
                        organization_id,
                        provider
                    )

                    DO UPDATE SET

                        access_token_encrypted =
                            excluded.access_token_encrypted,

                        token_expires_at =
                            excluded.token_expires_at,

                        updated_at =
                            CURRENT_TIMESTAMP
                `)
                .run(
                    organizationId,
                    encryptedAccessToken,
                    tokenExpiresAt
                );


            console.log(
                "✅ Meta OAuth connection saved:",
                {
                    organizationId,
                    userId,
                    businessId,
                    platform,
                    expiresAt:
                        tokenExpiresAt
                }
            );


            const params =
                new URLSearchParams();


            params.set(
                "meta",
                "connected"
            );


            if (
                businessId
            ) {

                params.set(
                    "businessId",
                    String(
                        businessId
                    )
                );

            }


            if (
                platform
            ) {

                params.set(
                    "platform",
                    platform
                );

            }


            return res.redirect(
                `/businesses?${params.toString()}`
            );

        }
        catch (error) {

            console.error(
                "Meta callback error:",
                error
            );


            return res
                .status(500)
                .json({
                    error:
                        "Unable to complete Meta connection.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
GET /api/meta/assets
====================================================
*/

router.get(
    "/meta/assets",
    authMiddleware,
    async (req, res) => {

        try {

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

                return res
                    .status(401)
                    .json({
                        error:
                            "Authentication required."
                    });

            }


            const connection =
                database
                    .prepare(`
                        SELECT
                            id,
                            organization_id,
                            provider,
                            access_token_encrypted,
                            token_expires_at,
                            updated_at

                        FROM social_oauth_connections

                        WHERE
                            organization_id = ?
                            AND provider = 'meta'
                    `)
                    .get(
                        organizationId
                    );


            if (
                !connection
                ||
                !connection
                    .access_token_encrypted
            ) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Meta is not connected."
                    });

            }


            if (
                connection.token_expires_at
            ) {

                const expiration =
                    new Date(
                        connection
                            .token_expires_at
                    );


                if (
                    !Number.isNaN(
                        expiration.getTime()
                    )
                    &&
                    expiration.getTime() <=
                        Date.now()
                ) {

                    return res
                        .status(401)
                        .json({
                            error:
                                "Meta connection has expired. Please reconnect."
                        });

                }

            }


            const accessToken =
                decryptToken(
                    connection
                        .access_token_encrypted
                );


            if (!accessToken) {

                return res
                    .status(500)
                    .json({
                        error:
                            "Unable to decrypt Meta connection."
                    });

            }


            const graphUrl =
                new URL(
                    "https://graph.facebook.com/v26.0/me/accounts"
                );


            graphUrl
                .searchParams
                .set(
                    "fields",
                    [
                        "id",
                        "name",
                        "instagram_business_account{id,username}"
                    ].join(",")
                );


            graphUrl
                .searchParams
                .set(
                    "access_token",
                    accessToken
                );


            const metaResponse =
                await fetch(
                    graphUrl,
                    {
                        method:
                            "GET",

                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );


            const metaData =
                await metaResponse
                    .json();


            if (
                !metaResponse.ok
            ) {

                console.error(
                    "Meta asset discovery failed:",
                    metaData
                );


                return res
                    .status(502)
                    .json({
                        error:
                            "Unable to load Meta assets.",

                        meta:
                            metaData
                                ?.error
                                ?.message ||
                            "Unknown Meta error."
                    });

            }


            const pages =
                Array.isArray(
                    metaData.data
                )

                    ? metaData.data.map(
                        (page) => {

                            const instagram =
                                page
                                    .instagram_business_account;


                            return {

                                id:
                                    String(
                                        page.id ||
                                        ""
                                    ),

                                name:
                                    page.name ||
                                    "",

                                instagram:
                                    instagram
                                        ? {
                                            id:
                                                String(
                                                    instagram.id ||
                                                    ""
                                                ),

                                            username:
                                                instagram.username ||
                                                ""
                                        }
                                        : null

                            };

                        }
                    )

                    : [];


            return res.json({

                organizationId,

                connected:
                    true,

                tokenExpiresAt:
                    connection
                        .token_expires_at,

                pages

            });

        }
        catch (error) {

            console.error(
                "Meta asset discovery error:",
                error
            );


            return res
                .status(500)
                .json({
                    error:
                        "Unable to discover Meta assets.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
POST /api/meta/subscribe-page
====================================================
*/

router.post(
    "/meta/subscribe-page",
    authMiddleware,
    async (req, res) => {

        try {

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

                return res
                    .status(401)
                    .json({
                        error:
                            "Authentication required."
                    });

            }


            const pageId =
                typeof req.body?.pageId ===
                    "string"

                    ? req.body.pageId.trim()

                    : String(
                        req.body?.pageId ||
                        ""
                    ).trim();


            const businessId =
                Number(
                    req.body?.businessId
                );


            if (!pageId) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Facebook Page ID is required."
                    });

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
                            "Business ID is required."
                    });

            }


            const business =
                database
                    .prepare(`
                        SELECT
                            id,
                            name,
                            organization_id

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


            const socialAccount =
                database
                    .prepare(`
                        SELECT
                            id,
                            business_id,
                            platform,
                            account_name,
                            external_account_id,
                            connected

                        FROM social_accounts

                        WHERE
                            business_id = ?
                            AND platform = 'facebook'
                    `)
                    .get(
                        businessId
                    );


            if (!socialAccount) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Facebook social account record not found."
                    });

            }


            if (
                socialAccount.external_account_id
                &&
                String(
                    socialAccount.external_account_id
                ) !== pageId
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Facebook Page does not match this business."
                    });

            }


            const connection =
                database
                    .prepare(`
                        SELECT
                            id,
                            access_token_encrypted,
                            token_expires_at

                        FROM social_oauth_connections

                        WHERE
                            organization_id = ?
                            AND provider = 'meta'
                    `)
                    .get(
                        organizationId
                    );


            if (
                !connection
                ||
                !connection
                    .access_token_encrypted
            ) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Meta is not connected."
                    });

            }


            if (
                connection.token_expires_at
            ) {

                const expiration =
                    new Date(
                        connection
                            .token_expires_at
                    );


                if (
                    !Number.isNaN(
                        expiration.getTime()
                    )
                    &&
                    expiration.getTime() <=
                        Date.now()
                ) {

                    return res
                        .status(401)
                        .json({
                            error:
                                "Meta connection has expired. Please reconnect."
                        });

                }

            }


            const organizationAccessToken =
                decryptToken(
                    connection
                        .access_token_encrypted
                );


            if (!organizationAccessToken) {

                return res
                    .status(500)
                    .json({
                        error:
                            "Unable to decrypt Meta connection."
                    });

            }


            const accountsUrl =
                new URL(
                    "https://graph.facebook.com/v26.0/me/accounts"
                );


            accountsUrl
                .searchParams
                .set(
                    "fields",
                    "id,name,access_token"
                );


            accountsUrl
                .searchParams
                .set(
                    "access_token",
                    organizationAccessToken
                );


            const accountsResponse =
                await fetch(
                    accountsUrl,
                    {
                        method:
                            "GET",

                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );


            const accountsData =
                await accountsResponse
                    .json();


            if (
                !accountsResponse.ok
            ) {

                console.error(
                    "Meta Page lookup failed:",
                    accountsData
                );


                return res
                    .status(502)
                    .json({
                        error:
                            "Unable to load Facebook Page credentials.",

                        meta:
                            accountsData
                                ?.error
                                ?.message ||
                            "Unknown Meta error."
                    });

            }


            const pages =
                Array.isArray(
                    accountsData.data
                )
                    ? accountsData.data
                    : [];


            const page =
                pages.find(
                    (item) =>
                        String(
                            item.id
                        ) === pageId
                );


            if (!page) {

                return res
                    .status(404)
                    .json({
                        error:
                            "The requested Facebook Page is not available through this Meta connection."
                    });

            }


            if (!page.access_token) {

                return res
                    .status(502)
                    .json({
                        error:
                            "Meta did not provide a Page access token."
                    });

            }


            const subscribeUrl =
                new URL(
                    `https://graph.facebook.com/v26.0/${encodeURIComponent(
                        pageId
                    )}/subscribed_apps`
                );


            subscribeUrl
                .searchParams
                .set(
                    "subscribed_fields",
                    "feed,messages"
                );


            subscribeUrl
                .searchParams
                .set(
                    "access_token",
                    page.access_token
                );


            const subscribeResponse =
                await fetch(
                    subscribeUrl,
                    {
                        method:
                            "POST",

                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );


            const subscribeData =
                await subscribeResponse
                    .json();


            if (
                !subscribeResponse.ok
                ||
                subscribeData.success !==
                    true
            ) {

                console.error(
                    "Meta Page subscription failed:",
                    subscribeData
                );


                return res
                    .status(502)
                    .json({
                        error:
                            "Unable to subscribe Facebook Page to webhooks.",

                        meta:
                            subscribeData
                                ?.error
                                ?.message ||
                            "Meta did not confirm the subscription."
                    });

            }


            console.log(
                "✅ Facebook Page subscribed to Meta webhook:",
                {
                    organizationId,
                    businessId,
                    business:
                        business.name,
                    pageId,
                    pageName:
                        page.name,
                    fields: [
                        "feed",
                        "messages"
                    ]
                }
            );


            return res.json({

                success:
                    true,

                businessId,

                business:
                    business.name,

                page: {
                    id:
                        String(
                            page.id
                        ),

                    name:
                        page.name ||
                        ""
                },

                subscribedFields: [
                    "feed",
                    "messages"
                ]

            });

        }
        catch (error) {

            console.error(
                "Meta Page subscription error:",
                error
            );


            return res
                .status(500)
                .json({
                    error:
                        "Unable to subscribe Facebook Page.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
POST /api/meta/assign-page
====================================================
*/

router.post(
    "/meta/assign-page",
    authMiddleware,
    async (req, res) => {

        try {

            const organizationId =
                Number(
                    req.organizationId
                );


            const businessId =
                Number(
                    req.body?.businessId
                );


            const pageId =
                String(
                    req.body?.pageId ||
                    ""
                ).trim();


            const pageName =
                String(
                    req.body?.pageName ||
                    ""
                ).trim();


            if (
                !Number.isInteger(
                    organizationId
                )
                ||
                organizationId <= 0
            ) {

                return res
                    .status(401)
                    .json({
                        error:
                            "Authentication required."
                    });

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
                            "Business ID is required."
                    });

            }


            if (!pageId) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Facebook Page ID is required."
                    });

            }


            const business =
                database
                    .prepare(`
                        SELECT
                            id,
                            name

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


            const account =
                database
                    .prepare(`
                        SELECT
                            id

                        FROM social_accounts

                        WHERE
                            business_id = ?
                            AND platform = 'facebook'
                    `)
                    .get(
                        businessId
                    );


            if (!account) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Facebook social account record not found."
                    });

            }


            database
                .prepare(`
                    UPDATE social_accounts

                    SET
                        account_name = ?,
                        external_account_id = ?,
                        connected = 1,
                        updated_at = CURRENT_TIMESTAMP

                    WHERE
                        id = ?
                `)
                .run(
                    pageName,
                    pageId,
                    account.id
                );


            return res.json({

                success:
                    true,

                businessId,

                business:
                    business.name,

                page: {
                    id:
                        pageId,

                    name:
                        pageName
                }

            });

        }
        catch (error) {

            console.error(
                "Meta Page assignment error:",
                error
            );


            return res
                .status(500)
                .json({
                    error:
                        "Unable to assign Facebook Page.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
GET /api/meta/page-feed/:pageId
====================================================
*/

router.get(
    "/meta/page-feed/:pageId",
    authMiddleware,
    async (req, res) => {

        try {

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

                return res
                    .status(401)
                    .json({
                        error:
                            "Authentication required."
                    });

            }


            const pageId =
                String(
                    req.params.pageId ||
                    ""
                ).trim();


            if (!pageId) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Facebook Page ID is required."
                    });

            }


            const socialAccount =
                database
                    .prepare(`
                        SELECT
                            social_accounts.id,
                            social_accounts.business_id,
                            social_accounts.account_name,
                            social_accounts.external_account_id,
                            social_accounts.connected

                        FROM social_accounts

                        INNER JOIN businesses
                            ON businesses.id =
                                social_accounts.business_id

                        WHERE
                            businesses.organization_id = ?
                            AND social_accounts.platform = 'facebook'
                            AND social_accounts.external_account_id = ?
                    `)
                    .get(
                        organizationId,
                        pageId
                    );


            if (!socialAccount) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Facebook Page is not assigned to this organization."
                    });

            }


            const connection =
                database
                    .prepare(`
                        SELECT
                            access_token_encrypted,
                            token_expires_at

                        FROM social_oauth_connections

                        WHERE
                            organization_id = ?
                            AND provider = 'meta'
                    `)
                    .get(
                        organizationId
                    );


            if (
                !connection
                ||
                !connection.access_token_encrypted
            ) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Meta is not connected."
                    });

            }


            if (
                connection.token_expires_at
            ) {

                const expiration =
                    new Date(
                        connection
                            .token_expires_at
                    );


                if (
                    !Number.isNaN(
                        expiration.getTime()
                    )
                    &&
                    expiration.getTime() <=
                        Date.now()
                ) {

                    return res
                        .status(401)
                        .json({
                            error:
                                "Meta connection has expired. Please reconnect."
                        });

                }

            }


            const organizationAccessToken =
                decryptToken(
                    connection
                        .access_token_encrypted
                );


            if (!organizationAccessToken) {

                return res
                    .status(500)
                    .json({
                        error:
                            "Unable to decrypt Meta connection."
                    });

            }


            const accountsUrl =
                new URL(
                    "https://graph.facebook.com/v26.0/me/accounts"
                );


            accountsUrl
                .searchParams
                .set(
                    "fields",
                    "id,name,access_token"
                );


            accountsUrl
                .searchParams
                .set(
                    "access_token",
                    organizationAccessToken
                );


            const accountsResponse =
                await fetch(
                    accountsUrl,
                    {
                        method:
                            "GET",

                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );


            const accountsData =
                await accountsResponse
                    .json();


            if (
                !accountsResponse.ok
            ) {

                console.error(
                    "Meta Page credential lookup failed:",
                    accountsData
                );


                return res
                    .status(502)
                    .json({
                        error:
                            "Unable to load Facebook Page credentials.",

                        meta:
                            accountsData
                                ?.error
                                ?.message ||
                            "Unknown Meta error."
                    });

            }


            const pages =
                Array.isArray(
                    accountsData.data
                )
                    ? accountsData.data
                    : [];


            const page =
                pages.find(
                    (item) =>
                        String(
                            item.id
                        ) === pageId
                );


            if (!page) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Facebook Page is not available through the current Meta connection."
                    });

            }


            if (!page.access_token) {

                return res
                    .status(502)
                    .json({
                        error:
                            "Meta did not return a Page access token."
                    });

            }


            const feedUrl =
                new URL(
                    `https://graph.facebook.com/v26.0/${encodeURIComponent(
                        pageId
                    )}/feed`
                );


            feedUrl
                .searchParams
                .set(
                    "fields",
                    "id,message,created_time"
                );


            feedUrl
                .searchParams
                .set(
                    "limit",
                    "5"
                );


            feedUrl
                .searchParams
                .set(
                    "access_token",
                    page.access_token
                );


            const feedResponse =
                await fetch(
                    feedUrl,
                    {
                        method:
                            "GET",

                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );


            const feedData =
                await feedResponse
                    .json();


            if (
                !feedResponse.ok
            ) {

                console.error(
                    "Meta Page feed lookup failed:",
                    feedData
                );


                return res
                    .status(502)
                    .json({
                        error:
                            "Unable to load Facebook Page feed.",

                        meta:
                            feedData
                                ?.error
                                ?.message ||
                            "Unknown Meta error."
                    });

            }


            return res.json({

                success:
                    true,

                businessId:
                    socialAccount
                        .business_id,

                page: {
                    id:
                        pageId,

                    name:
                        page.name ||
                        socialAccount
                            .account_name ||
                        ""
                },

                posts:
                    Array.isArray(
                        feedData.data
                    )
                        ? feedData.data
                        : []

            });

        }
        catch (error) {

            console.error(
                "Meta Page feed error:",
                error
            );


            return res
                .status(500)
                .json({
                    error:
                        "Unable to load Facebook Page feed.",

                    details:
                        error.message
                });

        }

    }
);


/*
====================================================
GET /api/meta/page-comments/:pageId
====================================================

Loads recent comments from recent Facebook Page
posts.

Nothing is written to the Master Control database
yet. This is only a read/test endpoint.

The Page access token stays server-side.
====================================================
*/

router.get(
    "/meta/page-comments/:pageId",
    authMiddleware,
    async (req, res) => {

        try {

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

                return res
                    .status(401)
                    .json({
                        error:
                            "Authentication required."
                    });

            }


            const pageId =
                String(
                    req.params.pageId ||
                    ""
                ).trim();


            if (!pageId) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Facebook Page ID is required."
                    });

            }


            /*
            ============================================
            VERIFY PAGE ASSIGNMENT
            ============================================
            */

            const socialAccount =
                database
                    .prepare(`
                        SELECT
                            social_accounts.id,
                            social_accounts.business_id,
                            social_accounts.account_name,
                            social_accounts.external_account_id,
                            social_accounts.connected,
                            businesses.name AS business_name

                        FROM social_accounts

                        INNER JOIN businesses
                            ON businesses.id =
                                social_accounts.business_id

                        WHERE
                            businesses.organization_id = ?
                            AND social_accounts.platform = 'facebook'
                            AND social_accounts.external_account_id = ?
                    `)
                    .get(
                        organizationId,
                        pageId
                    );


            if (!socialAccount) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Facebook Page is not assigned to this organization."
                    });

            }


            if (
                Number(
                    socialAccount.connected
                ) !== 1
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Facebook Page is not marked as connected."
                    });

            }


            /*
            ============================================
            LOAD META CONNECTION
            ============================================
            */

            const connection =
                database
                    .prepare(`
                        SELECT
                            access_token_encrypted,
                            token_expires_at

                        FROM social_oauth_connections

                        WHERE
                            organization_id = ?
                            AND provider = 'meta'
                    `)
                    .get(
                        organizationId
                    );


            if (
                !connection
                ||
                !connection
                    .access_token_encrypted
            ) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Meta is not connected."
                    });

            }


            if (
                connection.token_expires_at
            ) {

                const expiration =
                    new Date(
                        connection
                            .token_expires_at
                    );


                if (
                    !Number.isNaN(
                        expiration.getTime()
                    )
                    &&
                    expiration.getTime() <=
                        Date.now()
                ) {

                    return res
                        .status(401)
                        .json({
                            error:
                                "Meta connection has expired. Please reconnect."
                        });

                }

            }


            const organizationAccessToken =
                decryptToken(
                    connection
                        .access_token_encrypted
                );


            if (!organizationAccessToken) {

                return res
                    .status(500)
                    .json({
                        error:
                            "Unable to decrypt Meta connection."
                    });

            }


            /*
            ============================================
            GET PAGE ACCESS TOKEN
            ============================================
            */

            const accountsUrl =
                new URL(
                    "https://graph.facebook.com/v26.0/me/accounts"
                );


            accountsUrl
                .searchParams
                .set(
                    "fields",
                    "id,name,access_token"
                );


            accountsUrl
                .searchParams
                .set(
                    "access_token",
                    organizationAccessToken
                );


            const accountsResponse =
                await fetch(
                    accountsUrl,
                    {
                        method:
                            "GET",

                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );


            const accountsData =
                await accountsResponse
                    .json();


            if (
                !accountsResponse.ok
            ) {

                console.error(
                    "Meta Page credential lookup failed:",
                    accountsData
                );


                return res
                    .status(502)
                    .json({
                        error:
                            "Unable to load Facebook Page credentials.",

                        meta:
                            accountsData
                                ?.error
                                ?.message ||
                            "Unknown Meta error."
                    });

            }


            const availablePages =
                Array.isArray(
                    accountsData.data
                )
                    ? accountsData.data
                    : [];


            const page =
                availablePages.find(
                    (item) =>
                        String(
                            item.id
                        ) === pageId
                );


            if (!page) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Facebook Page is not available through the current Meta connection."
                    });

            }


            if (!page.access_token) {

                return res
                    .status(502)
                    .json({
                        error:
                            "Meta did not return a Page access token."
                    });

            }


            /*
            ============================================
            LOAD RECENT POSTS + COMMENTS
            ============================================
            */

            const feedUrl =
                new URL(
                    `https://graph.facebook.com/v26.0/${encodeURIComponent(
                        pageId
                    )}/feed`
                );


            feedUrl
                .searchParams
                .set(
                    "fields",
                    [
                        "id",
                        "message",
                        "created_time",
                        "comments.limit(25){id,message,created_time,from{id,name}}"
                    ].join(",")
                );


            feedUrl
                .searchParams
                .set(
                    "limit",
                    "10"
                );


            feedUrl
                .searchParams
                .set(
                    "access_token",
                    page.access_token
                );


            const feedResponse =
                await fetch(
                    feedUrl,
                    {
                        method:
                            "GET",

                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );


            const feedData =
                await feedResponse
                    .json();


            if (
                !feedResponse.ok
            ) {

                console.error(
                    "Meta Page comments lookup failed:",
                    feedData
                );


                return res
                    .status(502)
                    .json({
                        error:
                            "Unable to load Facebook Page comments.",

                        meta:
                            feedData
                                ?.error
                                ?.message ||
                            "Unknown Meta error."
                    });

            }


            /*
            ============================================
            FLATTEN COMMENTS FOR MASTER CONTROL
            ============================================
            */

            const posts =
                Array.isArray(
                    feedData.data
                )
                    ? feedData.data
                    : [];


            const comments =
                [];


            for (
                const post of posts
            ) {

                const postComments =
                    Array.isArray(
                        post
                            ?.comments
                            ?.data
                    )
                        ? post.comments.data
                        : [];


                for (
                    const comment of postComments
                ) {

                    comments.push({

                        id:
                            String(
                                comment.id ||
                                ""
                            ),

                        message:
                            comment.message ||
                            "",

                        createdTime:
                            comment.created_time ||
                            null,

                        author: {

                            id:
                                comment.from?.id
                                    ? String(
                                        comment.from.id
                                    )
                                    : "",

                            name:
                                comment.from?.name ||
                                ""

                        },

                        post: {

                            id:
                                String(
                                    post.id ||
                                    ""
                                ),

                            message:
                                post.message ||
                                "",

                            createdTime:
                                post.created_time ||
                                null

                        }

                    });

                }

            }


            /*
            ============================================
            NEWEST COMMENTS FIRST
            ============================================
            */

            comments.sort(
                (
                    first,
                    second
                ) => {

                    const firstTime =
                        first.createdTime
                            ? new Date(
                                first.createdTime
                            ).getTime()
                            : 0;


                    const secondTime =
                        second.createdTime
                            ? new Date(
                                second.createdTime
                            ).getTime()
                            : 0;


                    return (
                        secondTime -
                        firstTime
                    );

                }
            );


            /*
            ============================================
            SAFE RESPONSE
            ============================================
            */

            return res.json({

                success:
                    true,

                businessId:
                    socialAccount
                        .business_id,

                business:
                    socialAccount
                        .business_name,

                platform:
                    "facebook",

                page: {

                    id:
                        pageId,

                    name:
                        page.name ||
                        socialAccount
                            .account_name ||
                        ""

                },

                postsChecked:
                    posts.length,

                commentCount:
                    comments.length,

                comments

            });

        }
        catch (error) {

            console.error(
                "Meta Page comments error:",
                error
            );


            return res
                .status(500)
                .json({
                    error:
                        "Unable to load Facebook Page comments.",

                    details:
                        error.message
                });

        }

    }
);

/*
====================================================
POST /api/meta/sync-comments/:pageId
====================================================

Fetches recent Facebook comments and saves new
comments into the Master Control comments table.

Duplicate Facebook comments are skipped using
external_comment_id.
====================================================
*/

router.post(
    "/meta/sync-comments/:pageId",
    authMiddleware,
    async (req, res) => {

        try {

            const organizationId =
                Number(
                    req.organizationId
                );

            const pageId =
                String(
                    req.params.pageId || ""
                ).trim();


            if (
                !Number.isInteger(organizationId)
                ||
                organizationId <= 0
            ) {

                return res
                    .status(401)
                    .json({
                        error:
                            "Authentication required."
                    });

            }


            if (!pageId) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Facebook Page ID is required."
                    });

            }


            /*
            ============================================
            FIND BUSINESS + FACEBOOK ACCOUNT
            ============================================
            */

            const socialAccount =
                database
                    .prepare(`
                        SELECT
                            social_accounts.id,
                            social_accounts.business_id,
                            social_accounts.account_name,
                            social_accounts.external_account_id,
                            social_accounts.connected,
                            businesses.name AS business_name

                        FROM social_accounts

                        INNER JOIN businesses
                            ON businesses.id =
                                social_accounts.business_id

                        WHERE
                            businesses.organization_id = ?
                            AND social_accounts.platform = 'facebook'
                            AND social_accounts.external_account_id = ?
                    `)
                    .get(
                        organizationId,
                        pageId
                    );


            if (!socialAccount) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Facebook Page is not assigned to this organization."
                    });

            }


            if (
                Number(
                    socialAccount.connected
                ) !== 1
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Facebook Page is not connected."
                    });

            }


            /*
            ============================================
            LOAD META CONNECTION
            ============================================
            */

            const connection =
                database
                    .prepare(`
                        SELECT
                            access_token_encrypted,
                            token_expires_at

                        FROM social_oauth_connections

                        WHERE
                            organization_id = ?
                            AND provider = 'meta'
                    `)
                    .get(
                        organizationId
                    );


            if (
                !connection
                ||
                !connection.access_token_encrypted
            ) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Meta is not connected."
                    });

            }


            if (
                connection.token_expires_at
            ) {

                const expiration =
                    new Date(
                        connection.token_expires_at
                    );


                if (
                    !Number.isNaN(
                        expiration.getTime()
                    )
                    &&
                    expiration.getTime() <= Date.now()
                ) {

                    return res
                        .status(401)
                        .json({
                            error:
                                "Meta connection has expired. Please reconnect."
                        });

                }

            }


            const organizationAccessToken =
                decryptToken(
                    connection.access_token_encrypted
                );


            if (!organizationAccessToken) {

                return res
                    .status(500)
                    .json({
                        error:
                            "Unable to decrypt Meta connection."
                    });

            }


            /*
            ============================================
            GET PAGE ACCESS TOKEN
            ============================================
            */

            const accountsUrl =
                new URL(
                    "https://graph.facebook.com/v26.0/me/accounts"
                );


            accountsUrl.searchParams.set(
                "fields",
                "id,name,access_token"
            );


            accountsUrl.searchParams.set(
                "access_token",
                organizationAccessToken
            );


            const accountsResponse =
                await fetch(
                    accountsUrl,
                    {
                        method:
                            "GET",

                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );


            const accountsData =
                await accountsResponse.json();


            if (!accountsResponse.ok) {

                console.error(
                    "Meta Page credential lookup failed:",
                    accountsData
                );


                return res
                    .status(502)
                    .json({
                        error:
                            "Unable to load Facebook Page credentials.",

                        meta:
                            accountsData
                                ?.error
                                ?.message ||
                            "Unknown Meta error."
                    });

            }


            const pages =
                Array.isArray(
                    accountsData.data
                )
                    ? accountsData.data
                    : [];


            const page =
                pages.find(
                    item =>
                        String(item.id) === pageId
                );


            if (!page) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Facebook Page is not available through the current Meta connection."
                    });

            }


            if (!page.access_token) {

                return res
                    .status(502)
                    .json({
                        error:
                            "Meta did not return a Page access token."
                    });

            }


            /*
            ============================================
            FETCH POSTS + COMMENTS
            ============================================
            */

            const feedUrl =
                new URL(
                    `https://graph.facebook.com/v26.0/${encodeURIComponent(
                        pageId
                    )}/feed`
                );


            feedUrl.searchParams.set(
                "fields",
                [
                    "id",
                    "message",
                    "created_time",
                    "comments.limit(50){id,message,created_time,from{id,name}}"
                ].join(",")
            );


            feedUrl.searchParams.set(
                "limit",
                "25"
            );


            feedUrl.searchParams.set(
                "access_token",
                page.access_token
            );


            const feedResponse =
                await fetch(
                    feedUrl,
                    {
                        method:
                            "GET",

                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );


            const feedData =
                await feedResponse.json();


            if (!feedResponse.ok) {

                console.error(
                    "Facebook comment sync lookup failed:",
                    feedData
                );


                return res
                    .status(502)
                    .json({
                        error:
                            "Unable to load Facebook comments.",

                        meta:
                            feedData
                                ?.error
                                ?.message ||
                            "Unknown Meta error."
                    });

            }


            /*
            ============================================
            PREPARE DATABASE STATEMENTS
            ============================================
            */

            const findExisting =
                database.prepare(`
                    SELECT id

                    FROM comments

                    WHERE
                        platform = 'facebook'
                        AND external_comment_id = ?
                `);


            const insertComment =
                database.prepare(`
                    INSERT INTO comments (
                        business_id,
                        platform,
                        author,
                        content,
                        status,
                        created_at,
                        source,
                        external_comment_id
                    )

                    VALUES (
                        ?,
                        'facebook',
                        ?,
                        ?,
                        'pending',
                        ?,
                        'meta',
                        ?
                    )
                `);


            /*
            ============================================
            SYNC COMMENTS
            ============================================
            */

            const posts =
                Array.isArray(
                    feedData.data
                )
                    ? feedData.data
                    : [];


            let discovered =
                0;

            let inserted =
                0;

            let duplicates =
                0;

            let skipped =
                0;


            const insertedComments =
                [];


            const syncTransaction =
                database.transaction(
                    () => {

                        for (
                            const post of posts
                        ) {

                            const postComments =
                                Array.isArray(
                                    post
                                        ?.comments
                                        ?.data
                                )
                                    ? post.comments.data
                                    : [];


                            for (
                                const comment of postComments
                            ) {

                                discovered++;


                                const externalCommentId =
                                    String(
                                        comment.id || ""
                                    ).trim();


                                const content =
                                    String(
                                        comment.message || ""
                                    ).trim();


                                if (
                                    !externalCommentId
                                    ||
                                    !content
                                ) {

                                    skipped++;

                                    continue;

                                }


                                const existing =
                                    findExisting.get(
                                        externalCommentId
                                    );


                                if (existing) {

                                    duplicates++;

                                    continue;

                                }


                                const author =
                                    String(
                                        comment
                                            ?.from
                                            ?.name ||
                                        "Facebook User"
                                    ).trim();


                                const createdAt =
                                    comment.created_time
                                        ? new Date(
                                            comment.created_time
                                        ).toISOString()
                                        : new Date()
                                            .toISOString();


                                const result =
                                    insertComment.run(
                                        socialAccount.business_id,
                                        author,
                                        content,
                                        createdAt,
                                        externalCommentId
                                    );


                                inserted++;


                                insertedComments.push({

                                    id:
                                        Number(
                                            result.lastInsertRowid
                                        ),

                                    externalCommentId,

                                    author,

                                    content,

                                    createdAt

                                });

                            }

                        }

                    }
                );


            syncTransaction();


            /*
            ============================================
            RESPONSE
            ============================================
            */

            console.log(
                "✅ Facebook comments synced:",
                {
                    organizationId,
                    businessId:
                        socialAccount.business_id,
                    pageId,
                    discovered,
                    inserted,
                    duplicates,
                    skipped
                }
            );


            return res.json({

                success:
                    true,

                businessId:
                    socialAccount.business_id,

                business:
                    socialAccount.business_name,

                platform:
                    "facebook",

                page: {

                    id:
                        pageId,

                    name:
                        page.name ||
                        socialAccount.account_name ||
                        ""

                },

                postsChecked:
                    posts.length,

                discovered,

                inserted,

                duplicates,

                skipped,

                insertedComments

            });

        }
        catch (error) {

            console.error(
                "Facebook comment sync error:",
                error
            );


            return res
                .status(500)
                .json({
                    error:
                        "Unable to sync Facebook comments.",

                    details:
                        error.message
                });

        }

    }
);

/*
====================================================
POST /api/meta/sync-instagram-comments/:accountId
====================================================
*/

router.post(
    "/meta/sync-instagram-comments/:accountId",
    authMiddleware,
    async (req, res) => {

        try {

            const organizationId =
                Number(req.organizationId);

            const accountId =
                String(req.params.accountId || "").trim();


            if (
                !Number.isInteger(organizationId)
                ||
                organizationId <= 0
            ) {
                return res.status(401).json({
                    error: "Authentication required."
                });
            }


            /*
            ============================================
            FIND INSTAGRAM SOCIAL ACCOUNT
            ============================================
            */

            const socialAccount =
                database
                    .prepare(`
                        SELECT
                            social_accounts.id,
                            social_accounts.business_id,
                            social_accounts.account_name,
                            social_accounts.external_account_id,
                            social_accounts.connected,
                            businesses.name AS business_name

                        FROM social_accounts

                        INNER JOIN businesses
                            ON businesses.id =
                                social_accounts.business_id

                        WHERE
                            businesses.organization_id = ?
                            AND social_accounts.platform = 'instagram'
                            AND social_accounts.external_account_id = ?
                    `)
                    .get(
                        organizationId,
                        accountId
                    );


            if (!socialAccount) {
                return res.status(404).json({
                    error:
                        "Instagram account is not assigned to this organization."
                });
            }


            if (Number(socialAccount.connected) !== 1) {
                return res.status(400).json({
                    error:
                        "Instagram account is not connected."
                });
            }


            /*
            ============================================
            LOAD INSTAGRAM TOKEN
            ============================================
            */

            const connection =
                database
                    .prepare(`
                        SELECT
                            access_token_encrypted,
                            token_expires_at

                        FROM social_oauth_connections

                        WHERE
                            organization_id = ?
                            AND provider = 'instagram'
                    `)
                    .get(organizationId);


            if (
                !connection
                ||
                !connection.access_token_encrypted
            ) {
                return res.status(404).json({
                    error:
                        "Instagram is not connected."
                });
            }


            const accessToken =
                decryptToken(
                    connection.access_token_encrypted
                );


            if (!accessToken) {
                return res.status(500).json({
                    error:
                        "Unable to decrypt Instagram connection."
                });
            }


            /*
            ============================================
            FETCH INSTAGRAM MEDIA + COMMENTS
            ============================================
            */

            const mediaUrl =
                new URL(
                    "https://graph.instagram.com/me/media"
                );


            mediaUrl.searchParams.set(
                "fields",
                [
                    "id",
                    "caption",
                    "comments.limit(50){id,text,timestamp,username}"
                ].join(",")
            );


            mediaUrl.searchParams.set(
                "limit",
                "25"
            );


            mediaUrl.searchParams.set(
                "access_token",
                accessToken
            );


            const mediaResponse =
                await fetch(mediaUrl, {
                    method: "GET",
                    headers: {
                        Accept: "application/json"
                    }
                });


            const mediaData =
                await mediaResponse.json();


            if (!mediaResponse.ok) {

                console.error(
                    "Instagram comment sync lookup failed:",
                    mediaData
                );

                return res.status(502).json({
                    error:
                        "Unable to load Instagram comments.",

                    meta:
                        mediaData
                            ?.error
                            ?.message ||
                        "Unknown Instagram error."
                });
            }


            /*
            ============================================
            DATABASE STATEMENTS
            ============================================
            */

            const findExisting =
                database.prepare(`
                    SELECT id

                    FROM comments

                    WHERE
                        platform = 'instagram'
                        AND external_comment_id = ?
                `);


            const insertComment =
                database.prepare(`
                    INSERT INTO comments (
                        business_id,
                        platform,
                        author,
                        content,
                        status,
                        created_at,
                        source,
                        external_comment_id
                    )

                    VALUES (
                        ?,
                        'instagram',
                        ?,
                        ?,
                        'pending',
                        ?,
                        'meta',
                        ?
                    )
                `);


            const media =
                Array.isArray(mediaData.data)
                    ? mediaData.data
                    : [];


            let discovered = 0;
            let inserted = 0;
            let duplicates = 0;
            let skipped = 0;

            const insertedComments = [];


            const syncTransaction =
                database.transaction(() => {

                    for (const post of media) {

                        const comments =
                            Array.isArray(
                                post?.comments?.data
                            )
                                ? post.comments.data
                                : [];


                        for (const comment of comments) {

                            discovered++;


                            const externalCommentId =
                                String(
                                    comment.id || ""
                                ).trim();


                            const content =
                                String(
                                    comment.text || ""
                                ).trim();


                            if (
                                !externalCommentId
                                ||
                                !content
                            ) {
                                skipped++;
                                continue;
                            }


                            const existing =
                                findExisting.get(
                                    externalCommentId
                                );


                            if (existing) {
                                duplicates++;
                                continue;
                            }


                            const author =
                                String(
                                    comment.username ||
                                    "Instagram User"
                                ).trim();


                            const createdAt =
                                comment.timestamp
                                    ? new Date(
                                        comment.timestamp
                                    ).toISOString()
                                    : new Date()
                                        .toISOString();


                            const result =
                                insertComment.run(
                                    socialAccount.business_id,
                                    author,
                                    content,
                                    createdAt,
                                    externalCommentId
                                );


                            inserted++;


                            insertedComments.push({
                                id:
                                    Number(
                                        result.lastInsertRowid
                                    ),

                                externalCommentId,
                                author,
                                content,
                                createdAt
                            });

                        }

                    }

                });


            syncTransaction();


            console.log(
                "✅ Instagram comments synced:",
                {
                    organizationId,
                    businessId:
                        socialAccount.business_id,
                    accountId,
                    discovered,
                    inserted,
                    duplicates,
                    skipped
                }
            );


            return res.json({
                success: true,

                businessId:
                    socialAccount.business_id,

                business:
                    socialAccount.business_name,

                platform:
                    "instagram",

                account: {
                    id: accountId,
                    name:
                        socialAccount.account_name || ""
                },

                mediaChecked:
                    media.length,

                discovered,
                inserted,
                duplicates,
                skipped,
                insertedComments
            });

        }
        catch (error) {

            console.error(
                "Instagram comment sync error:",
                error
            );


            return res.status(500).json({
                error:
                    "Unable to sync Instagram comments.",

                details:
                    error.message
            });

        }

    }
);

/*
====================================================
GET /api/meta/permissions
====================================================
*/

router.get(
    "/meta/permissions",
    authMiddleware,
    async (req, res) => {

        try {

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

                return res
                    .status(401)
                    .json({
                        error:
                            "Authentication required."
                    });

            }


            const connection =
                database
                    .prepare(`
                        SELECT
                            access_token_encrypted

                        FROM social_oauth_connections

                        WHERE
                            organization_id = ?
                            AND provider = 'meta'
                    `)
                    .get(
                        organizationId
                    );


            if (
                !connection
                ||
                !connection.access_token_encrypted
            ) {

                return res
                    .status(404)
                    .json({
                        error:
                            "Meta is not connected."
                    });

            }


            const accessToken =
                decryptToken(
                    connection
                        .access_token_encrypted
                );


            if (!accessToken) {

                return res
                    .status(500)
                    .json({
                        error:
                            "Unable to decrypt Meta connection."
                    });

            }


            const permissionsUrl =
                new URL(
                    "https://graph.facebook.com/v26.0/me/permissions"
                );


            permissionsUrl
                .searchParams
                .set(
                    "access_token",
                    accessToken
                );


            const metaResponse =
                await fetch(
                    permissionsUrl,
                    {
                        method:
                            "GET",

                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );


            const metaData =
                await metaResponse
                    .json();


            if (
                !metaResponse.ok
            ) {

                console.error(
                    "Meta permissions lookup failed:",
                    metaData
                );


                return res
                    .status(502)
                    .json({
                        error:
                            "Unable to load Meta permissions.",

                        meta:
                            metaData
                                ?.error
                                ?.message ||
                            "Unknown Meta error."
                    });

            }


            const permissions =
                Array.isArray(
                    metaData.data
                )
                    ? metaData.data.map(
                        (item) => ({
                            permission:
                                item.permission,

                            status:
                                item.status
                        })
                    )
                    : [];


            return res.json({

                organizationId,

                permissions

            });

        }
        catch (error) {

            console.error(
                "Meta permissions error:",
                error
            );


            return res
                .status(500)
                .json({
                    error:
                        "Unable to inspect Meta permissions.",

                    details:
                        error.message
                });

        }

    }
);

/*
====================================================
GET /api/meta/instagram-debug
====================================================
*/

router.get(
    "/meta/instagram-debug",
    authMiddleware,
    async (req, res) => {

        try {

            const organizationId =
                Number(req.organizationId);


            const connection =
                database
                    .prepare(`
                        SELECT
                            provider_user_id,
                            provider_user_name,
                            access_token_encrypted,
                            token_expires_at,
                            scopes

                        FROM social_oauth_connections

                        WHERE
                            organization_id = ?
                            AND provider = 'instagram'
                    `)
                    .get(organizationId);


            if (
                !connection ||
                !connection.access_token_encrypted
            ) {

                return res.status(404).json({
                    error: "Instagram is not connected."
                });

            }


            const accessToken =
                decryptToken(
                    connection.access_token_encrypted
                );


            if (!accessToken) {

                return res.status(500).json({
                    error:
                        "Unable to decrypt Instagram connection."
                });

            }


            const profileUrl =
                new URL(
                    "https://graph.instagram.com/me"
                );


            profileUrl.searchParams.set(
                "fields",
                "id,user_id,username,account_type"
            );


            profileUrl.searchParams.set(
                "access_token",
                accessToken
            );


            const profileResponse =
                await fetch(profileUrl, {
                    headers: {
                        Accept: "application/json"
                    }
                });


            const profileData =
                await profileResponse.json();


            return res.status(
                profileResponse.ok ? 200 : 502
            ).json({

                success:
                    profileResponse.ok,

                storedConnection: {
                    providerUserId:
                        connection.provider_user_id,

                    providerUserName:
                        connection.provider_user_name,

                    tokenExpiresAt:
                        connection.token_expires_at,

                    storedScopes:
                        connection.scopes
                },

                instagramProfile:
                    profileData

            });

        }
        catch (error) {

            console.error(
                "Instagram debug error:",
                error
            );


            return res.status(500).json({
                error:
                    "Unable to inspect Instagram connection.",

                details:
                    error.message
            });

        }

    }
);


/*
====================================================
GET /api/meta/instagram-comment-debug
====================================================
*/

router.get(
    "/meta/instagram-comment-debug",
    authMiddleware,
    async (req, res) => {

        try {

            const organizationId =
                Number(req.organizationId);

            const connection =
                database
                    .prepare(`
                        SELECT access_token_encrypted
                        FROM social_oauth_connections
                        WHERE
                            organization_id = ?
                            AND provider = 'instagram'
                    `)
                    .get(organizationId);

            if (!connection?.access_token_encrypted) {
                return res.status(404).json({
                    error: "Instagram is not connected."
                });
            }

            const accessToken =
                decryptToken(
                    connection.access_token_encrypted
                );

            const postId =
                "18094150174995583";

            const commentsUrl =
                new URL(
                    `https://graph.instagram.com/v26.0/${postId}/comments`
                );

            commentsUrl.searchParams.set(
                "fields",
                "id,text,timestamp,username"
            );

            commentsUrl.searchParams.set(
                "limit",
                "50"
            );

            commentsUrl.searchParams.set(
                "access_token",
                accessToken
            );

            const response =
                await fetch(commentsUrl);

            const data =
                await response.json();

            return res.json({
                httpStatus: response.status,
                ok: response.ok,
                postId,
                response: data
            });

        }
        catch (error) {

            console.error(
                "Instagram comment debug error:",
                error
            );

            return res.status(500).json({
                error: error.message
            });

        }

    }
);


/*
====================================================
GET /api/meta/instagram-token-debug
====================================================
*/

router.get(
    "/meta/instagram-token-debug",
    authMiddleware,
    async (req, res) => {

        try {

            const organizationId =
                Number(req.organizationId);

            const connection =
                database
                    .prepare(`
                        SELECT access_token_encrypted
                        FROM social_oauth_connections
                        WHERE
                            organization_id = ?
                            AND provider = 'instagram'
                    `)
                    .get(organizationId);


            if (!connection?.access_token_encrypted) {

                return res.status(404).json({
                    error: "Instagram is not connected."
                });

            }


            const instagramAccessToken =
                decryptToken(
                    connection.access_token_encrypted
                );


            const appId =
                process.env.META_APP_ID;

            const appSecret =
                process.env.META_APP_SECRET;


            if (!appId || !appSecret) {

                return res.status(500).json({
                    error:
                        "Meta app credentials are missing."
                });

            }


            const appAccessToken =
                `${appId}|${appSecret}`;


            const debugUrl =
                new URL(
                    "https://graph.facebook.com/debug_token"
                );


            debugUrl.searchParams.set(
                "input_token",
                instagramAccessToken
            );


            debugUrl.searchParams.set(
                "access_token",
                appAccessToken
            );


            const response =
                await fetch(debugUrl);


            const data =
                await response.json();


            return res.status(
                response.ok ? 200 : 502
            ).json({

                httpStatus:
                    response.status,

                ok:
                    response.ok,

                debug:
                    data

            });

        }
        catch (error) {

            console.error(
                "Instagram token debug error:",
                error
            );


            return res.status(500).json({
                error:
                    error.message
            });

        }

    }
);


/*
====================================================
POST /api/meta/instagram-token
====================================================
*/

router.post(
    "/meta/instagram-token",
    authMiddleware,
    async (req, res) => {

        try {

            const organizationId =
                Number(
                    req.organizationId
                );


            const accessToken =
                String(
                    req.body?.accessToken ||
                    ""
                ).trim();


            const instagramAccountId =
                String(
                    req.body?.instagramAccountId ||
                    ""
                ).trim();


            const username =
                String(
                    req.body?.username ||
                    ""
                ).trim();


            if (
                !Number.isInteger(
                    organizationId
                )
                ||
                organizationId <= 0
            ) {

                return res
                    .status(401)
                    .json({
                        error:
                            "Authentication required."
                    });

            }


            if (!accessToken) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Instagram access token is required."
                    });

            }


            if (!instagramAccountId) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Instagram account ID is required."
                    });

            }


            const encryptedAccessToken =
                encryptToken(
                    accessToken
                );


            database
                .prepare(`
                    INSERT INTO social_oauth_connections (
                        organization_id,
                        provider,
                        provider_user_id,
                        provider_user_name,
                        access_token_encrypted,
                        refresh_token_encrypted,
                        token_expires_at,
                        scopes,
                        created_at,
                        updated_at
                    )

                    VALUES (
                        ?,
                        'instagram',
                        ?,
                        ?,
                        ?,
                        '',
                        NULL,
                        '',
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    )

                    ON CONFLICT (
                        organization_id,
                        provider
                    )

                    DO UPDATE SET
                        provider_user_id =
                            excluded.provider_user_id,

                        provider_user_name =
                            excluded.provider_user_name,

                        access_token_encrypted =
                            excluded.access_token_encrypted,

                        updated_at =
                            CURRENT_TIMESTAMP
                `)
                .run(
                    organizationId,
                    instagramAccountId,
                    username,
                    encryptedAccessToken
                );


            console.log(
                "✅ Instagram OAuth connection saved:",
                {
                    organizationId,
                    instagramAccountId,
                    username
                }
            );


            return res.json({
                success:
                    true,

                provider:
                    "instagram",

                instagramAccountId,

                username
            });

        }
        catch (error) {

            console.error(
                "Instagram token save error:",
                error
            );


            return res
                .status(500)
                .json({
                    error:
                        "Unable to save Instagram connection.",

                    details:
                        error.message
                });

        }

    }
);

/*
====================================================
EXPORT
====================================================
*/

module.exports =
    router;