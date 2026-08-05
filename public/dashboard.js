const refreshDashboardButton =
    document.getElementById(
        "refresh-dashboard"
    );

const businessActivityContainer =
    document.getElementById(
        "business-activity"
    );

const recentActivityContainer =
    document.getElementById(
        "recent-activity"
    );

async function loadDashboard() {
    setLoadingState(true);

    try {
        const response =
            await fetch("/api/dashboard");

        const data =
            await response.json();

        if (!response.ok) {
            throw new Error(
                data.error ||
                "Unable to load dashboard."
            );
        }

        renderStatistics(data);
        renderBusinessActivity(
            data.businessActivity || []
        );
        renderRecentActivity(
            data.recentActivity || []
        );
    } catch (error) {
        console.error(
            "Dashboard loading error:",
            error
        );

        businessActivityContainer.innerHTML = `
            <div class="dashboard-empty">
                ${escapeHtml(error.message)}
            </div>
        `;

        recentActivityContainer.innerHTML = `
            <div class="dashboard-empty">
                Unable to load recent activity.
            </div>
        `;
    } finally {
        setLoadingState(false);
    }
}

function renderStatistics(data) {
    setText(
        "stat-businesses",
        data.businesses
    );

    setText(
        "stat-comments-today",
        data.commentsToday
    );

    setText(
        "stat-replies-today",
        data.repliesToday
    );

    setText(
        "stat-pending",
        data.statuses?.pending
    );

    setText(
        "stat-approved",
        data.statuses?.approved
    );

    setText(
        "stat-posted",
        data.statuses?.posted
    );

    setText(
        "stat-rules",
        data.ruleReplies
    );

    setText(
        "stat-gpt",
        data.gptReplies
    );

    setText(
        "stat-processing",
        `${data.averageProcessingTime || 0} ms`
    );

    setText(
        "stat-cost",
        `$${Number(
            data.estimatedCost || 0
        ).toFixed(4)}`
    );
}

function renderBusinessActivity(
    businesses
) {
    businessActivityContainer.innerHTML = "";

    if (!businesses.length) {
        businessActivityContainer.innerHTML = `
            <div class="dashboard-empty">
                No business activity yet.
            </div>
        `;

        return;
    }

    businesses.forEach((business) => {
        const card =
            document.createElement("article");

        card.className =
            "business-activity-card";

        card.innerHTML = `
            <div class="business-title-row">

                <strong>
                    ${escapeHtml(
                        `${business.emoji || "🏢"} ${business.name}`
                    )}
                </strong>

                <span>
                    ${Number(
                        business.total_comments || 0
                    )} comments
                </span>

            </div>

            <div class="business-metrics">

                ${renderMetric(
                    "Pending",
                    business.pending_comments
                )}

                ${renderMetric(
                    "Replied",
                    business.replied_comments
                )}

                ${renderMetric(
                    "Approved",
                    business.approved_comments
                )}

                ${renderMetric(
                    "Posted",
                    business.posted_comments
                )}

            </div>
        `;

        card.addEventListener(
            "click",
            () => {
                window.location.href =
                    `inbox.html?businessId=${business.id}`;
            }
        );

        businessActivityContainer.appendChild(
            card
        );
    });
}

function renderRecentActivity(
    activity
) {
    recentActivityContainer.innerHTML = "";

    if (!activity.length) {
        recentActivityContainer.innerHTML = `
            <div class="dashboard-empty">
                No recent activity yet.
            </div>
        `;

        return;
    }

    activity.forEach((item) => {
        const card =
            document.createElement("article");

        card.className =
            "recent-activity-card";

        card.innerHTML = `
            <div class="recent-title-row">

                <strong>
                    ${escapeHtml(
                        item.author || "Customer"
                    )}
                </strong>

                <span>
                    ${escapeHtml(
                        item.status || "pending"
                    )}
                </span>

            </div>

            <p>
                ${escapeHtml(
                    item.content || ""
                )}
            </p>

            <div class="recent-activity-meta">
                ${escapeHtml(
                    `${item.business_emoji || "🏢"} ${item.business_name || "Unknown"}`
                )}
                //
                ${escapeHtml(
                    item.platform || "manual"
                )}
                //
                ${escapeHtml(
                    formatDate(
                        item.updated_at ||
                        item.created_at
                    )
                )}
            </div>
        `;

        recentActivityContainer.appendChild(
            card
        );
    });
}

function renderMetric(label, value) {
    return `
        <div class="business-metric">
            <span>
                ${escapeHtml(label)}
            </span>

            <strong>
                ${Number(value || 0)}
            </strong>
        </div>
    `;
}

function setText(id, value) {
    const element =
        document.getElementById(id);

    if (!element) {
        return;
    }

    element.textContent =
        value ?? 0;
}

function setLoadingState(isLoading) {
    refreshDashboardButton.disabled =
        isLoading;

    refreshDashboardButton.textContent =
        isLoading
            ? "Loading..."
            : "Refresh Data";
}

function formatDate(value) {
    if (!value) {
        return "Unknown";
    }

    const normalized =
        value.includes("T")
            ? value
            : `${value.replace(" ", "T")}Z`;

    const date =
        new Date(normalized);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return value;
    }

    return date.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

document
    .querySelectorAll(
        ".clickable-card"
    )
    .forEach((card) => {
        card.addEventListener(
            "click",
            () => {
                const status =
                    card.dataset.status;

                window.location.href =
                    `inbox.html?status=${status}`;
            }
        );
    });

refreshDashboardButton.addEventListener(
    "click",
    loadDashboard
);

loadDashboard();