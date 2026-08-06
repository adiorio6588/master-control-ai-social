window.MasterControlAPI = (() => {

    async function request(endpoint, options = {}) {

        const config = {
            ...options,
            headers: {
                ...(options.body
                    ? {
                        "Content-Type": "application/json"
                    }
                    : {}),
                ...(options.headers || {})
            }
        };

        const response = await fetch(endpoint, config);

        let data = {};

        try {
            data = await response.json();
        } catch {
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

    // --------------------------
    // Dashboard
    // --------------------------

    async function getDashboard() {
        return request("/api/dashboard");
    }

    // --------------------------
    // Businesses
    // --------------------------

    async function getBusinesses() {
        return request("/api/businesses");
    }

    async function createBusiness(payload) {
        return request("/api/businesses", {
            method: "POST",
            body: JSON.stringify(payload)
        });
    }

    async function updateBusiness(id, payload) {
        return request(`/api/businesses/${id}`, {
            method: "PUT",
            body: JSON.stringify(payload)
        });
    }

    async function deleteBusiness(id) {
        return request(`/api/businesses/${id}`, {
            method: "DELETE"
        });
    }

    // --------------------------
    // Comments
    // --------------------------

    async function getComments() {
        return request("/api/comments");
    }

    async function createComment(payload) {
        return request("/api/comments", {
            method: "POST",
            body: JSON.stringify(payload)
        });
    }

    async function deleteComment(id) {
        return request(`/api/comments/${id}`, {
            method: "DELETE"
        });
    }

    async function updateCommentStatus(id, status) {
        return request(`/api/comments/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({
                status
            })
        });
    }

    async function saveReply(id, reply) {
        return request(`/api/comments/${id}/reply`, {
            method: "POST",
            body: JSON.stringify({
                reply
            })
        });
    }

    // --------------------------
    // AI
    // --------------------------

    async function generateReply(payload) {
        return request("/api/reply", {
            method: "POST",
            body: JSON.stringify(payload)
        });
    }

    // --------------------------
    // Rules
    // --------------------------

    async function getRules() {
        return request("/api/rules");
    }

    async function createRule(payload) {
        return request("/api/rules", {
            method: "POST",
            body: JSON.stringify(payload)
        });
    }

    async function updateRule(id, payload) {
        return request(`/api/rules/${id}`, {
            method: "PUT",
            body: JSON.stringify(payload)
        });
    }

    async function deleteRule(id) {
        return request(`/api/rules/${id}`, {
            method: "DELETE"
        });
    }

    // --------------------------
    // History
    // --------------------------

    async function getHistory() {
        return request("/api/history");
    }

    return {

        request,

        getDashboard,

        getBusinesses,
        createBusiness,
        updateBusiness,
        deleteBusiness,

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