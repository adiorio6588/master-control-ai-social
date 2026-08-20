window.MasterControlAPI = (() => {

    async function request(
        endpoint,
        options = {}
    ) {

        const token =
            localStorage.getItem(
                "masterControlToken"
            );


        const config = {
            ...options,

            headers: {

                ...(options.body
                    ? {
                        "Content-Type":
                            "application/json"
                    }
                    : {}),

                ...(token
                    ? {
                        Authorization:
                            `Bearer ${token}`
                    }
                    : {}),

                ...(options.headers || {})
            }
        };


        const response =
            await fetch(
                endpoint,
                config
            );


        let data = {};


        try {

            data =
                await response.json();

        }
        catch {

            data = {};

        }


        /*
        ====================================================
        AUTHENTICATION FAILURE
        ====================================================
        */

        if (
            response.status === 401
        ) {

            localStorage.removeItem(
                "masterControlToken"
            );

            localStorage.removeItem(
                "masterControlUser"
            );

            localStorage.removeItem(
                "masterControlOrganization"
            );


            if (
                window.location.pathname !==
                "/login"
            ) {

                window.location.href =
                    "/login";

            }


            throw new Error(
                data.error ||
                "Authentication required."
            );

        }


        if (!response.ok) {

            throw new Error(
                data.error ||
                `Request failed (${response.status})`
            );

        }


        return data;

    }


    /*
    ====================================================
    Dashboard
    ====================================================
    */

    function getDashboard() {

        return request(
            "/api/dashboard"
        );

    }


    /*
    ====================================================
    Businesses
    ====================================================
    */

    function getBusinesses() {

        return request(
            "/api/businesses"
        );

    }


    function createBusiness(
        payload
    ) {

        return request(
            "/api/businesses",
            {
                method:
                    "POST",

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );

    }


    function updateBusiness(
        businessId,
        payload
    ) {

        return request(
            `/api/businesses/${businessId}`,
            {
                method:
                    "PUT",

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );

    }


    function deleteBusiness(
        businessId
    ) {

        return request(
            `/api/businesses/${businessId}`,
            {
                method:
                    "DELETE"
            }
        );

    }


    /*
    ====================================================
    Social Accounts
    ====================================================
    */

    function getSocialAccounts(
        businessId = null
    ) {

        if (businessId) {

            return request(
                `/api/social-accounts?businessId=${encodeURIComponent(
                    businessId
                )}`
            );

        }


        return request(
            "/api/social-accounts"
        );

    }


    function getSocialAccount(
        accountId
    ) {

        return request(
            `/api/social-accounts/${accountId}`
        );

    }


    function updateSocialAccount(
        accountId,
        payload
    ) {

        return request(
            `/api/social-accounts/${accountId}`,
            {
                method:
                    "PUT",

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );

    }


    function updateBusinessSocialAccount(
        businessId,
        platform,
        payload
    ) {

        return request(
            `/api/social-accounts/business/${businessId}/${encodeURIComponent(
                platform
            )}`,
            {
                method:
                    "PUT",

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );

    }


    /*
    ====================================================
    Comments
    ====================================================
    */

    function getComments(
        filters = {}
    ) {

        const params =
            new URLSearchParams();


        if (filters.businessId) {

            params.set(
                "businessId",
                filters.businessId
            );

        }


        if (filters.platform) {

            params.set(
                "platform",
                filters.platform
            );

        }


        if (filters.status) {

            params.set(
                "status",
                filters.status
            );

        }


        const query =
            params.toString();


        return request(
            query
                ? `/api/comments?${query}`
                : "/api/comments"
        );

    }


    function createComment(
        payload
    ) {

        return request(
            "/api/comments",
            {
                method:
                    "POST",

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );

    }


    function deleteComment(
        commentId
    ) {

        return request(
            `/api/comments/${commentId}`,
            {
                method:
                    "DELETE"
            }
        );

    }


    function updateCommentStatus(
        commentId,
        status
    ) {

        return request(
            `/api/comments/${commentId}/status`,
            {
                method:
                    "PATCH",

                body:
                    JSON.stringify({
                        status
                    })
            }
        );

    }


    function saveReply(
        commentId,
        reply
    ) {

        return request(
            `/api/comments/${commentId}/reply`,
            {
                method:
                    "POST",

                body:
                    JSON.stringify({
                        reply
                    })
            }
        );

    }


    function postReply(
        commentId
    ) {

        return request(
            `/api/comments/${commentId}/post`,
            {
                method:
                    "POST"
            }
        );

    }


    /*
    ====================================================
    AI
    ====================================================
    */

    function generateReply(
        payload
    ) {

        return request(
            "/api/reply",
            {
                method:
                    "POST",

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );

    }


    /*
    ====================================================
    Rules
    ====================================================
    */

    function getRules() {

        return request(
            "/api/rules"
        );

    }


    function createRule(
        payload
    ) {

        return request(
            "/api/rules",
            {
                method:
                    "POST",

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );

    }


    function updateRule(
        ruleId,
        payload
    ) {

        return request(
            `/api/rules/${ruleId}`,
            {
                method:
                    "PUT",

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );

    }


    function deleteRule(
        ruleId
    ) {

        return request(
            `/api/rules/${ruleId}`,
            {
                method:
                    "DELETE"
            }
        );

    }


    /*
    ====================================================
    History
    ====================================================
    */

    function getHistory() {

        return request(
            "/api/history"
        );

    }


    /*
    ====================================================
    Automation Settings
    ====================================================
    */

    function getAutomationSettings(
        businessId,
        platform = "all"
    ) {

        return request(
            `/api/settings/automation?businessId=${encodeURIComponent(
                businessId
            )}&platform=${encodeURIComponent(
                platform
            )}`
        );

    }


    function saveAutomationSettings(
        payload
    ) {

        return request(
            "/api/settings/automation",
            {
                method:
                    "PUT",

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );

    }


    /*
    ====================================================
    Meta
    ====================================================
    */

    function startMetaConnection(
        businessId,
        platform
    ) {

        return request(
            `/api/meta/connect?businessId=${encodeURIComponent(
                businessId
            )}&platform=${encodeURIComponent(
                platform
            )}`
        );

    }


    function getMetaAssets() {

        return request(
            "/api/meta/assets"
        );

    }


    function getMetaPageFeed(
        pageId
    ) {

        return request(
            `/api/meta/page-feed/${encodeURIComponent(
                pageId
            )}`
        );

    }


    function getMetaPageComments(
        pageId
    ) {

        return request(
            `/api/meta/page-comments/${encodeURIComponent(
                pageId
            )}`
        );

    }


    function subscribeMetaPage(
        businessId,
        pageId
    ) {

        return request(
            "/api/meta/subscribe-page",
            {
                method:
                    "POST",

                body:
                    JSON.stringify({
                        businessId,
                        pageId
                    })
            }
        );

    }


    function assignMetaPage(
        businessId,
        pageId,
        pageName
    ) {

        return request(
            "/api/meta/assign-page",
            {
                method:
                    "POST",

                body:
                    JSON.stringify({
                        businessId,
                        pageId,
                        pageName
                    })
            }
        );

    }

    function syncMetaComments(
        pageId
    ) {
    
        return request(
            `/api/meta/sync-comments/${encodeURIComponent(
                pageId
            )}`,
            {
                method:
                    "POST"
            }
        );
    
    }

    /*
    ====================================================
    Public API
    ====================================================
    */

    return {

        request,

        getDashboard,

        getBusinesses,
        createBusiness,
        updateBusiness,
        deleteBusiness,

        getSocialAccounts,
        getSocialAccount,
        updateSocialAccount,
        updateBusinessSocialAccount,

        getComments,
        createComment,
        deleteComment,
        updateCommentStatus,
        saveReply,
        postReply,

        generateReply,

        getRules,
        createRule,
        updateRule,
        deleteRule,

        getHistory,

        getAutomationSettings,
        saveAutomationSettings,

        startMetaConnection,
        getMetaAssets,
        getMetaPageFeed,
        getMetaPageComments,
        syncMetaComments,
        subscribeMetaPage,
        assignMetaPage

    };

})();