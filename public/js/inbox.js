const commentsPanel =
    document.querySelector(".comments-panel");

const detailsPanel =
    document.querySelector(".details-panel");

const searchInput =
    document.getElementById("inbox-search");

const refreshButton =
    document.getElementById("refresh-inbox");

const filterButtons =
    document.querySelectorAll(".filter-button");

let comments = [];
let selectedCommentId = null;
let activeStatus = "all";
let searchTerm = "";

/*
 * Load comments from the backend.
 */
async function loadComments() {
    renderLoadingState();
    setRefreshState(true);

    try {
        const response = await fetch("/api/comments");
        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                "Unable to load inbox comments."
            );
        }

        comments = Array.isArray(result)
            ? result
            : [];

        updateStatusCounts();
        renderComments();

        if (selectedCommentId) {
            const selectedComment =
                comments.find(
                    (comment) =>
                        Number(comment.id) ===
                        Number(selectedCommentId)
                );

            if (selectedComment) {
                renderCommentDetails(
                    selectedComment
                );
            } else {
                selectedCommentId = null;
                renderEmptyDetails();
            }
        } else {
            renderEmptyDetails();
        }
    } catch (error) {
        console.error(
            "Inbox loading error:",
            error
        );

        if (!commentsPanel) {
            return;
        }

        commentsPanel.innerHTML = `
            <div class="panel-header">
                <h2>Social Inbox</h2>

                <span class="count-badge">
                    ERR
                </span>
            </div>

            <div class="empty-state">
                <div class="empty-icon">
                    ⚠️
                </div>

                <h3>Unable to Load Inbox</h3>

                <p>
                    ${escapeHtml(error.message)}
                </p>
            </div>
        `;
    } finally {
        setRefreshState(false);
    }
}

/*
 * Display loading state.
 */
function renderLoadingState() {
    if (!commentsPanel) {
        return;
    }

    commentsPanel.innerHTML = `
        <div class="panel-header">
            <h2>Loading Comments</h2>

            <span class="count-badge">
                ...
            </span>
        </div>

        <div class="empty-state">
            <div class="empty-icon">
                ⏳
            </div>

            <h3>Loading Inbox</h3>

            <p>
                Retrieving comments from Master Control.
            </p>
        </div>
    `;
}

/*
 * Apply search and status filters.
 */
function getVisibleComments() {
    return comments.filter((comment) => {
        const normalizedStatus =
            String(
                comment.status || "pending"
            ).toLowerCase();

        const matchesStatus =
            activeStatus === "all" ||
            normalizedStatus === activeStatus;

        if (!matchesStatus) {
            return false;
        }

        if (!searchTerm) {
            return true;
        }

        const searchableText = [
            comment.author,
            comment.content,
            comment.business_name,
            comment.platform,
            comment.reply,
            comment.rule,
            comment.source
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return searchableText.includes(
            searchTerm
        );
    });
}

/*
 * Render inbox comment cards.
 */
function renderComments() {
    if (!commentsPanel) {
        return;
    }

    const visibleComments =
        getVisibleComments();

    const title =
        activeStatus === "all"
            ? "All Comments"
            : `${capitalize(activeStatus)} Comments`;

    commentsPanel.innerHTML = `
        <div class="panel-header">
            <h2 id="comments-panel-title">
                ${escapeHtml(title)}
            </h2>

            <span
                id="visible-comment-count"
                class="count-badge"
            >
                ${visibleComments.length}
            </span>
        </div>

        <div
            id="comment-list"
            class="comment-list"
        ></div>
    `;

    const commentList =
        document.getElementById(
            "comment-list"
        );

    if (!commentList) {
        return;
    }

    if (!visibleComments.length) {
        commentList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    💬
                </div>

                <h3>No Matching Comments</h3>

                <p>
                    No comments match the current
                    status filter or search.
                </p>
            </div>
        `;

        return;
    }

    visibleComments.forEach((comment) => {
        const card =
            document.createElement("button");

        card.type = "button";
        card.className = "comment-card";

        if (
            Number(comment.id) ===
            Number(selectedCommentId)
        ) {
            card.classList.add("selected");
        }

        const status =
            String(
                comment.status || "pending"
            ).toLowerCase();

        const businessLabel =
            `${comment.business_emoji || "🏢"} ` +
            `${comment.business_name || "Unknown Business"}`;

        card.innerHTML = `
            <div class="comment-card-top">

                <div class="platform-icon">
                    ${getPlatformIcon(
                        comment.platform
                    )}
                </div>

                <div class="comment-author">
                    <strong>
                        ${escapeHtml(
                            comment.author ||
                            "Customer"
                        )}
                    </strong>

                    <small>
                        ${escapeHtml(businessLabel)}
                        //
                        ${escapeHtml(
                            formatPlatformName(
                                comment.platform
                            )
                        )}
                    </small>
                </div>

                <span
                    class="status-badge ${escapeHtml(status)}"
                >
                    ${escapeHtml(status)}
                </span>

            </div>

            <p class="comment-preview">
                ${escapeHtml(
                    comment.content || ""
                )}
            </p>
        `;

        card.addEventListener(
            "click",
            () => {
                selectComment(comment.id);
            }
        );

        commentList.appendChild(card);
    });
}

/*
 * Select a comment.
 */
function selectComment(commentId) {
    const comment =
        comments.find(
            (item) =>
                Number(item.id) ===
                Number(commentId)
        );

    if (!comment) {
        return;
    }

    selectedCommentId = comment.id;

    renderComments();
    renderCommentDetails(comment);
}

/*
 * Render the right-side detail panel.
 */
function renderCommentDetails(comment) {
    if (!detailsPanel) {
        return;
    }

    const status =
        String(
            comment.status || "pending"
        ).toLowerCase();

    const businessLabel =
        `${comment.business_emoji || "🏢"} ` +
        `${comment.business_name || "Unknown Business"}`;

    const source =
        comment.source ||
        "Not generated";

    const ruleName =
        comment.rule ||
        "None";

    const confidence =
        comment.confidence !== null &&
        comment.confidence !== undefined
            ? `${comment.confidence}%`
            : "Not available";

    const processingTime =
        comment.processing_time !== null &&
        comment.processing_time !== undefined
            ? `${comment.processing_time} ms`
            : "Not available";

    const estimatedCost =
        comment.estimated_cost !== null &&
        comment.estimated_cost !== undefined
            ? `$${Number(
                comment.estimated_cost
            ).toFixed(4)}`
            : source.toUpperCase() === "RULE"
                ? "$0.0000"
                : "Not available";

    detailsPanel.innerHTML = `
        <div class="panel-header">

            <h2>AI Assistant</h2>

            <span
                class="status-badge ${escapeHtml(status)}"
            >
                ${escapeHtml(status)}
            </span>

        </div>

        ${renderWorkflow(status)}

        <div class="detail-section">
            <span class="detail-label">
                Customer
            </span>

            <div class="detail-value">
                ${escapeHtml(
                    comment.author || "Customer"
                )}
            </div>
        </div>

        <div class="detail-section">
            <span class="detail-label">
                Platform
            </span>

            <div class="detail-value">
                ${getPlatformIcon(
                    comment.platform
                )}
                ${escapeHtml(
                    formatPlatformName(
                        comment.platform
                    )
                )}
            </div>
        </div>

        <div class="detail-section">
            <span class="detail-label">
                Incoming Comment
            </span>

            <div class="detail-value">
                ${escapeHtml(
                    comment.content || ""
                )}
            </div>
        </div>

        <div class="detail-section">
            <span class="detail-label">
                AI Analysis
            </span>

            <div class="decision-grid">

                <article class="decision-item">
                    <span>Business</span>

                    <strong>
                        ${escapeHtml(businessLabel)}
                    </strong>
                </article>

                <article class="decision-item">
                    <span>Decision Source</span>

                    <strong>
                        ${escapeHtml(
                            formatDecisionSource(
                                source
                            )
                        )}
                    </strong>
                </article>

                <article class="decision-item">
                    <span>Matched Rule</span>

                    <strong>
                        ${escapeHtml(ruleName)}
                    </strong>
                </article>

                <article class="decision-item">
                    <span>Confidence</span>

                    <strong>
                        ${escapeHtml(confidence)}
                    </strong>
                </article>

                <article class="decision-item">
                    <span>Processing Time</span>

                    <strong>
                        ${escapeHtml(
                            processingTime
                        )}
                    </strong>
                </article>

                <article class="decision-item">
                    <span>Estimated API Cost</span>

                    <strong>
                        ${escapeHtml(
                            estimatedCost
                        )}
                    </strong>
                </article>

            </div>
        </div>

        <div class="detail-section">
            <span class="detail-label">
                Suggested Reply
            </span>

            <textarea
                id="inbox-reply-editor"
                class="detail-value detail-reply reply-editor"
                placeholder="Generate or write a reply..."
            >${escapeHtml(
                comment.reply || ""
            )}</textarea>
        </div>

        <div class="inbox-actions">

            <button
                id="generate-inbox-reply"
                class="inbox-button primary"
                type="button"
            >
                Generate Reply
            </button>

            <button
                id="save-inbox-reply"
                class="inbox-button"
                type="button"
            >
                Save Reply
            </button>

            <button
                id="approve-comment"
                class="inbox-button"
                type="button"
            >
                Approve
            </button>

            <button
                id="mark-posted"
                class="inbox-button"
                type="button"
            >
                Mark Posted
            </button>

            <button
                id="ignore-comment"
                class="inbox-button"
                type="button"
            >
                Ignore
            </button>

            <button
                id="return-pending"
                class="inbox-button"
                type="button"
            >
                Return to Pending
            </button>

            <button
                id="delete-comment"
                class="inbox-button danger"
                type="button"
            >
                Delete
            </button>

        </div>
    `;

    attachDetailEvents(comment);
}

/*
 * Render approval workflow steps.
 */
function renderWorkflow(status) {
    const steps = [
        {
            key: "pending",
            label: "Pending"
        },
        {
            key: "replied",
            label: "AI Replied"
        },
        {
            key: "approved",
            label: "Approved"
        },
        {
            key: "posted",
            label: "Posted"
        }
    ];

    const currentIndex =
        steps.findIndex(
            (step) => step.key === status
        );

    const ignored =
        status === "ignored";

    return `
        <div class="workflow-panel">

            <span class="detail-label">
                Approval Workflow
            </span>

            <div class="workflow-steps">

                ${steps.map(
                    (step, index) => {
                        const completed =
                            !ignored &&
                            currentIndex >= index;

                        const active =
                            !ignored &&
                            step.key === status;

                        return `
                            <div
                                class="workflow-step
                                ${completed ? "completed" : ""}
                                ${active ? "active" : ""}"
                            >
                                <span>
                                    ${index + 1}
                                </span>

                                <strong>
                                    ${step.label}
                                </strong>
                            </div>
                        `;
                    }
                ).join("")}

            </div>

            ${
                ignored
                    ? `
                        <p class="workflow-ignored">
                            This comment is currently ignored.
                        </p>
                    `
                    : ""
            }

        </div>
    `;
}

/*
 * Empty detail panel.
 */
function renderEmptyDetails() {
    if (!detailsPanel) {
        return;
    }

    detailsPanel.innerHTML = `
        <div class="panel-header">
            <h2>AI Assistant</h2>
        </div>

        <div class="placeholder-card">
            <h3>Waiting for a Comment</h3>

            <p>
                Select a comment to review its AI
                analysis, suggested reply, and
                approval workflow.
            </p>
        </div>
    `;
}

/*
 * Attach action buttons.
 */
function attachDetailEvents(comment) {
    const generateButton =
        document.getElementById(
            "generate-inbox-reply"
        );

    const saveButton =
        document.getElementById(
            "save-inbox-reply"
        );

    const approveButton =
        document.getElementById(
            "approve-comment"
        );

    const postedButton =
        document.getElementById(
            "mark-posted"
        );

    const ignoreButton =
        document.getElementById(
            "ignore-comment"
        );

    const pendingButton =
        document.getElementById(
            "return-pending"
        );

    const deleteButton =
        document.getElementById(
            "delete-comment"
        );

    if (generateButton) {
        generateButton.addEventListener(
            "click",
            () => {
                generateReplyForComment(
                    comment
                );
            }
        );
    }

    if (saveButton) {
        saveButton.addEventListener(
            "click",
            () => {
                saveReplyForComment(
                    comment.id
                );
            }
        );
    }

    if (approveButton) {
        approveButton.addEventListener(
            "click",
            () => {
                updateCommentStatus(
                    comment.id,
                    "approved"
                );
            }
        );
    }

    if (postedButton) {
        postedButton.addEventListener(
            "click",
            () => {
                updateCommentStatus(
                    comment.id,
                    "posted"
                );
            }
        );
    }

    if (ignoreButton) {
        ignoreButton.addEventListener(
            "click",
            () => {
                updateCommentStatus(
                    comment.id,
                    "ignored"
                );
            }
        );
    }

    if (pendingButton) {
        pendingButton.addEventListener(
            "click",
            () => {
                updateCommentStatus(
                    comment.id,
                    "pending"
                );
            }
        );
    }

    if (deleteButton) {
        deleteButton.addEventListener(
            "click",
            () => {
                deleteComment(comment);
            }
        );
    }
}

/*
 * Generate AI or rule reply.
 */
async function generateReplyForComment(
    comment
) {
    const button =
        document.getElementById(
            "generate-inbox-reply"
        );

    if (!button) {
        return;
    }

    button.disabled = true;
    button.textContent = "Generating...";

    try {
        const response =
            await fetch("/api/reply", {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    commentId: comment.id,
                    comment: comment.content,
                    businessId:
                        comment.business_id
                })
            });

        const result =
            await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                "Unable to generate reply."
            );
        }

        selectedCommentId =
            result.commentId ||
            comment.id;

        await loadComments();
    } catch (error) {
        console.error(
            "Generate reply error:",
            error
        );

        alert(error.message);
    } finally {
        button.disabled = false;
        button.textContent =
            "Generate Reply";
    }
}

/*
 * Save manually edited reply.
 */
async function saveReplyForComment(
    commentId
) {
    const replyEditor =
        document.getElementById(
            "inbox-reply-editor"
        );

    if (!replyEditor) {
        return;
    }

    const reply =
        replyEditor.value.trim();

    if (!reply) {
        alert(
            "Enter a reply before saving."
        );

        return;
    }

    try {
        const response =
            await fetch(
                `/api/comments/${commentId}/reply`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        reply
                    })
                }
            );

        const result =
            await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                "Unable to save reply."
            );
        }

        selectedCommentId =
            commentId;

        await loadComments();
    } catch (error) {
        console.error(
            "Save reply error:",
            error
        );

        alert(error.message);
    }
}

/*
 * Update comment status.
 */
async function updateCommentStatus(
    commentId,
    status
) {
    try {
        const response =
            await fetch(
                `/api/comments/${commentId}/status`,
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        status
                    })
                }
            );

        const result =
            await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                "Unable to update status."
            );
        }

        selectedCommentId =
            commentId;

        await loadComments();
    } catch (error) {
        console.error(
            "Status update error:",
            error
        );

        alert(error.message);
    }
}

/*
 * Delete a comment.
 */
async function deleteComment(comment) {
    const confirmed =
        window.confirm(
            `Delete the comment from ${
                comment.author ||
                "Customer"
            }?`
        );

    if (!confirmed) {
        return;
    }

    try {
        const response =
            await fetch(
                `/api/comments/${comment.id}`,
                {
                    method: "DELETE"
                }
            );

        const result =
            await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                "Unable to delete comment."
            );
        }

        selectedCommentId = null;

        await loadComments();
    } catch (error) {
        console.error(
            "Delete comment error:",
            error
        );

        alert(error.message);
    }
}

/*
 * Update toolbar counts.
 */
function updateStatusCounts() {
    const statuses = [
        "pending",
        "replied",
        "approved",
        "posted",
        "ignored"
    ];

    setCount(
        "count-all",
        comments.length
    );

    statuses.forEach((status) => {
        const count =
            comments.filter(
                (comment) =>
                    String(
                        comment.status ||
                        "pending"
                    ).toLowerCase() ===
                    status
            ).length;

        setCount(
            `count-${status}`,
            count
        );
    });
}

function setCount(elementId, value) {
    const element =
        document.getElementById(
            elementId
        );

    if (element) {
        element.textContent = value;
    }
}

/*
 * Filter buttons.
 */
filterButtons.forEach((button) => {
    button.addEventListener(
        "click",
        () => {
            activeStatus =
                button.dataset.status ||
                "all";

            filterButtons.forEach(
                (item) => {
                    item.classList.remove(
                        "active"
                    );
                }
            );

            button.classList.add(
                "active"
            );

            renderComments();
        }
    );
});

/*
 * Search input.
 */
if (searchInput) {
    searchInput.addEventListener(
        "input",
        () => {
            searchTerm =
                searchInput.value
                    .trim()
                    .toLowerCase();

            renderComments();
        }
    );
}

/*
 * Refresh button.
 */
if (refreshButton) {
    refreshButton.addEventListener(
        "click",
        loadComments
    );
}

function setRefreshState(isLoading) {
    if (!refreshButton) {
        return;
    }

    refreshButton.disabled =
        isLoading;

    refreshButton.textContent =
        isLoading
            ? "Loading..."
            : "Refresh";
}

/*
 * Display helpers.
 */
function getPlatformIcon(platform = "") {
    const icons = {
        facebook: "📘",
        instagram: "📸",
        tiktok: "🎵",
        youtube: "▶️",
        manual: "⌨️"
    };

    const normalized =
        String(platform)
            .toLowerCase();

    return icons[normalized] || "💬";
}

function formatPlatformName(
    platform = ""
) {
    const normalized =
        String(platform || "manual")
            .trim()
            .toLowerCase();

    return capitalize(normalized);
}

function formatDecisionSource(
    source = ""
) {
    const normalized =
        String(source)
            .trim()
            .toUpperCase();

    if (normalized === "RULE") {
        return "Rule Engine";
    }

    if (
        normalized === "GPT" ||
        normalized === "AI"
    ) {
        return "GPT";
    }

    return normalized ||
        "Not generated";
}

function capitalize(value = "") {
    const text = String(value);

    return (
        text.charAt(0).toUpperCase() +
        text.slice(1)
    );
}

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

loadComments();