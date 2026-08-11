const jwt = require("jsonwebtoken");


function authMiddleware(req, res, next) {

    try {

        const authHeader =
            req.get("Authorization");


        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {

            return res.status(401).json({
                error: "Authentication required."
            });

        }


        const token =
            authHeader
                .slice("Bearer ".length)
                .trim();


        if (!token) {

            return res.status(401).json({
                error: "Authentication required."
            });

        }


        const secret =
            process.env.JWT_SECRET;


        if (!secret) {

            throw new Error(
                "JWT_SECRET is not configured."
            );

        }


        const payload =
            jwt.verify(
                token,
                secret
            );


        req.user = {

            id:
                Number(payload.userId),

            email:
                payload.email

        };


        req.organizationId =
            Number(payload.organizationId);


        req.organizationRole =
            payload.role;


        next();

    }
    catch (error) {

        console.error(
            "Authentication error:",
            error.message
        );


        return res.status(401).json({
            error:
                "Invalid or expired authentication token."
        });

    }

}


module.exports =
    authMiddleware;