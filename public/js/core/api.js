window.MasterControlAPI = (() => {

    async function request(
        endpoint,
        options = {}
    ) {
        const config = {
            ...options,
            headers: {
                ...(options.body
                    ? {
                        "Content-Type":
                            "application/json"
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
                method: "POST",

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
                method: "PUT",

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
                method: "DELETE"
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
                method: "PUT",

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
                method: "PUT",

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
                method: "POST",

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
                method: "DELETE"
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
                method: "PATCH",

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
                method: "POST",

                body:
                    JSON.stringify({
                        reply
                    })
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
                method: "POST",

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
                method: "POST",

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
                method: "PUT",

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
                method: "DELETE"
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

        generateReply,

        getRules,
        createRule,
        updateRule,
        deleteRule,

        getHistory
    };

})();