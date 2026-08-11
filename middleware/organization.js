const database =
    require("../database/database");


/*
====================================================
MASTER CONTROL
Organization Middleware
====================================================

Temporary development behavior:

- Reads organization ID from:
    X-Organization-ID header

- If no header is provided,
  falls back to organization 1.

Later, real authentication will determine
the organization from the logged-in user/session.
====================================================
*/

function organizationMiddleware(
    req,
    res,
    next
) {

    try {

        const headerValue =
            req.get(
                "X-Organization-ID"
            );


        const organizationId =
            headerValue
                ? Number(
                    headerValue
                )
                : 1;


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
                        "Invalid organization ID."
                });

        }


        const organization =
            database
                .prepare(`
                    SELECT
                        id,
                        name,
                        slug,
                        owner_user_id

                    FROM organizations

                    WHERE id = ?
                `)
                .get(
                    organizationId
                );


        if (
            !organization
        ) {

            return res
                .status(404)
                .json({
                    error:
                        "Organization not found."
                });

        }


        /*
        ====================================================
        Attach Organization Context
        ====================================================
        */

        req.organization =
            organization;


        req.organizationId =
            organization.id;


        next();

    }
    catch (error) {

        console.error(
            "Organization middleware error:",
            error
        );


        res
            .status(500)
            .json({
                error:
                    "Unable to resolve organization."
            });

    }

}


module.exports =
    organizationMiddleware;