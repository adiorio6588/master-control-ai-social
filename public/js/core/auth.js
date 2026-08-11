/*
====================================================
MASTER CONTROL
Frontend Authentication
====================================================
*/

window.MasterControlAuth = (() => {

    /*
    ====================================================
    Storage Keys
    ====================================================
    */

    const TOKEN_KEY =
        "masterControlToken";

    const USER_KEY =
        "masterControlUser";

    const ORGANIZATION_KEY =
        "masterControlOrganization";


    /*
    ====================================================
    Get Token
    ====================================================
    */

    function getToken() {

        return localStorage.getItem(
            TOKEN_KEY
        );

    }


    /*
    ====================================================
    Get User
    ====================================================
    */

    function getUser() {

        return getStoredJson(
            USER_KEY
        );

    }


    /*
    ====================================================
    Get Organization
    ====================================================
    */

    function getOrganization() {

        return getStoredJson(
            ORGANIZATION_KEY
        );

    }


    /*
    ====================================================
    Is Logged In
    ====================================================
    */

    function isLoggedIn() {

        return Boolean(
            getToken()
        );

    }


    /*
    ====================================================
    Clear Login
    ====================================================
    */

    function clearLogin() {

        localStorage.removeItem(
            TOKEN_KEY
        );

        localStorage.removeItem(
            USER_KEY
        );

        localStorage.removeItem(
            ORGANIZATION_KEY
        );

    }


    /*
    ====================================================
    Logout
    ====================================================
    */

    function logout() {

        clearLogin();

        window.location.href =
            "/login";

    }


    /*
    ====================================================
    Require Authentication
    ====================================================
    */

    async function requireAuth() {

        const token =
            getToken();


        if (!token) {

            window.location.href =
                "/login";

            return false;

        }


        try {

            const response =
                await fetch(
                    "/api/auth/me",
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        }
                    }
                );


            if (!response.ok) {

                clearLogin();

                window.location.href =
                    "/login";

                return false;

            }


            const data =
                await response.json();


            if (data.user) {

                localStorage.setItem(
                    USER_KEY,
                    JSON.stringify(
                        data.user
                    )
                );

            }


            if (data.organization) {

                localStorage.setItem(
                    ORGANIZATION_KEY,
                    JSON.stringify(
                        data.organization
                    )
                );

            }


            return true;

        }
        catch (error) {

            console.error(
                "Authentication check failed:",
                error
            );


            clearLogin();

            window.location.href =
                "/login";

            return false;

        }

    }


    /*
    ====================================================
    Stored JSON Helper
    ====================================================
    */

    function getStoredJson(
        key
    ) {

        const value =
            localStorage.getItem(
                key
            );


        if (!value) {

            return null;

        }


        try {

            return JSON.parse(
                value
            );

        }
        catch {

            return null;

        }

    }


    /*
    ====================================================
    Public API
    ====================================================
    */

    return {

        getToken,

        getUser,

        getOrganization,

        isLoggedIn,

        requireAuth,

        logout,

        clearLogin

    };

})();