const commentsPanel =
    document.querySelector(".comments-panel");

const detailsPanel =
    document.querySelector(".details-panel");

let comments = [];
let selectedCommentId = null;

async function loadComments() {
    renderLoadingState();

    try {
        const response = await fetch("/api/comments");

        if (!response.ok) {
            throw new Error("Unable to load inbox comments.");
        }

        comments = await response.json();

        renderComments();

        if (
            selectedCommentId &&
            comments.some(
                (comment) =>
                    comment.id === selectedCommentId
            )
        ) {
            selectComment(selectedCommentId);
        } else {
            renderEmptyDetails();
        }
    } catch (error) {
        console.error("Inbox loading error:", error);

        commentsPanel.innerHTML = `
            <div class="panel-header">
                <h2>Pending Comments</h2>

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
    }
}

function renderLoadingState() {
    commentsPanel.innerHTML = `
        <div class="panel-header">
            <h2>Pending Comments</h2>

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

function renderComments() {
    commentsPanel.innerHTML = `
        <div class="panel-header">
            <h2>Pending Comments</h2>

            <span class="count-badge">
                ${comments.length}
            </span>
        </div>

        <div
            id="comment-list"
            class="comment-list"
        ></div>
    `;

    const commentList =
        document.getElementById("comment-list");

    if (!comments.length) {
        commentList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    💬
                </div>

                <h3>No Comments Yet</h3>

                <p>
                    Facebook, Instagram, TikTok and YouTube
                    comments will appear here.
                </p>
            </div>
        `;

        return;
    }

    comments.forEach((comment) => {
        const card =
            document.createElement("button");

        card.type = "button";
        card.className = "comment-card";

        if (comment.id === selectedCommentId) {
            card.classList.add("selected");
        }

        card.dataset.commentId = comment.id;

        const businessLabel =
            `${comment.business_emoji || "🏢"} ` +
            `${comment.business_name || "Unknown Business"}`;

        const status =
            comment.status || "pending";

        card.innerHTML = `
            <div class="comment-card-top">

                <div class="platform-icon">
                    ${getPlatformIcon(comment.platform)}
                </div>

                <div class="comment-author">

                    <strong>
                        ${escapeHtml(
                            comment.author || "Customer"
                        )}
                    </strong>

                    <small>
                        ${escapeHtml(businessLabel)}
                        //
                        ${escapeHtml(
                            comment.platform || "manual"
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
                ${escapeHtml(comment.content || "")}
            </p>
        `;

        card.addEventListener("click", () => {
            selectComment(comment.id);
        });

        commentList.appendChild(card);
    });
}

function selectComment(commentId) {
    const comment = comments.find(
        (item) => item.id === commentId
    );

    if (!comment) {
        return;
    }

    selectedCommentId = comment.id;

    renderComments();
    renderCommentDetails(comment);
}

function renderCommentDetails(comment) {
    const status =
        comment.status || "pending";

    const businessLabel =
        `${comment.business_emoji || "🏢"} ` +
        `${comment.business_name || "Unknown Business"}`;

    const source =
        comment.source ||
        comment.reply_source ||
        "Not generated";

    const ruleName =
        comment.rule ||
        comment.rule_name ||
        "None";

    const confidence =
        comment.confidence !== undefined &&
        comment.confidence !== null
            ? `${comment.confidence}%`
            : "Not available";

    const processingTime =
        comment.processingTime ??
        comment.processing_time ??
        null;

    const formattedProcessingTime =
        processingTime !== null
            ? `${processingTime} ms`
            : "Not available";

    const estimatedCost =
        comment.cost ??
        comment.estimatedCost ??
        comment.estimated_cost ??
        null;

    const formattedCost =
        estimatedCost !== null
            ? `$${Number(estimatedCost).toFixed(4)}`
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
                ${getPlatformIcon(comment.platform)}
                ${escapeHtml(
                    formatPlatformName(comment.platform)
                )}
            </div>
        </div>

        <div class="detail-section">
            <span class="detail-label">
                Incoming Comment
            </span>

            <div class="detail-value">
                ${escapeHtml(comment.content || "")}
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
                            formatDecisionSource(source)
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
                            formattedProcessingTime
                        )}
                    </strong>
                </article>

                <article class="decision-item">
                    <span>Estimated API Cost</span>

                    <strong>
                        ${escapeHtml(formattedCost)}
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
                placeholder="Generate a reply or write one manually..."
            >${escapeHtml(comment.reply || "")}</textarea>
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

function renderEmptyDetails() {
    detailsPanel.innerHTML = `
        <div class="panel-header">
            <h2>AI Assistant</h2>
        </div>

        <div class="placeholder-card">
            <h3>Waiting for a Comment</h3>

            <p>
                Select a customer comment to view the business,
                platform, AI analysis, suggested reply, and
                approval options.
            </p>
        </div>
    `;
}

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

    const deleteButton =
        document.getElementById(
            "delete-comment"
        );

    generateButton.addEventListener(
        "click",
        async () => {
            await generateReplyForComment(
                comment
            );
        }
    );

    saveButton.addEventListener(
        "click",
        async () => {
            await saveReplyForComment(
                comment.id
            );
        }
    );

    approveButton.addEventListener(
        "click",
        async () => {
            await updateCommentStatus(
                comment.id,
                "approved"
            );
        }
    );

    postedButton.addEventListener(
        "click",
        async () => {
            await updateCommentStatus(
                comment.id,
                "posted"
            );
        }
    );

    ignoreButton.addEventListener(
        "click",
        async () => {
            await updateCommentStatus(
                comment.id,
                "ignored"
            );
        }
    );

    deleteButton.addEventListener(
        "click",
        async () => {
            await deleteComment(comment);
        }
    );
}

async function generateReplyForComment(comment) {
    const button =
        document.getElementById(
            "generate-inbox-reply"
        );

    const replyEditor =
        document.getElementById(
            "inbox-reply-editor"
        );

    const originalButtonText =
        button.textContent;

    button.disabled = true;
    button.textContent = "Generating...";

    try {
        const response = await fetch(
            "/api/reply",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    comment: comment.content,
                    businessId:
                        comment.business_id
                })
            }
        );

        const result =
            await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                "Unable to generate reply."
            );
        }

        replyEditor.value =
            result.reply || "";

        updateLocalComment(comment.id, {
            reply: result.reply || "",
            source: result.source || null,
            rule:
                result.rule ||
                result.ruleName ||
                null,
            confidence:
                result.confidence ?? null,
            processingTime:
                result.processingTime ?? null,
            cost:
                result.cost ??
                result.estimatedCost ??
                null,
            business_name:
                result.business ||
                comment.business_name,
            business_emoji:
                result.emoji ||
                comment.business_emoji
        });

        await saveReplyForComment(
            comment.id,
            false
        );

        await updateCommentStatus(
            comment.id,
            "replied",
            false
        );

        await loadComments();

        selectedCommentId = comment.id;

        const updatedComment =
            comments.find(
                (item) =>
                    item.id === comment.id
            );

        if (updatedComment) {
            Object.assign(
                updatedComment,
                {
                    source:
                        result.source || null,

                    rule:
                        result.rule ||
                        result.ruleName ||
                        null,

                    confidence:
                        result.confidence ?? null,

                    processingTime:
                        result.processingTime ?? null,

                    cost:
                        result.cost ??
                        result.estimatedCost ??
                        null
                }
            );

            renderCommentDetails(
                updatedComment
            );
        }
    } catch (error) {
        console.error(
            "Inbox reply generation error:",
            error
        );

        alert(error.message);
    } finally {
        button.disabled = false;
        button.textContent =
            originalButtonText;
    }
}

async function saveReplyForComment(
    commentId,
    showConfirmation = true
) {
    const replyEditor =
        document.getElementById(
            "inbox-reply-editor"
        );

    const reply =
        replyEditor?.value.trim() || "";

    if (!reply) {
        if (showConfirmation) {
            alert(
                "There is no reply to save."
            );
        }

        return;
    }

    /*
     * The current backend may not yet have a dedicated
     * inbox reply endpoint. Try the preferred endpoint first.
     */
    try {
        const response = await fetch(
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

        if (response.status === 404) {
            updateLocalComment(
                commentId,
                {
                    reply
                }
            );

            if (showConfirmation) {
                alert(
                    "Reply kept in the editor. The backend save endpoint will be added next."
                );
            }

            return;
        }

        const result =
            await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                "Unable to save reply."
            );
        }

        updateLocalComment(
            commentId,
            {
                reply:
                    result.reply ||
                    result.content ||
                    reply
            }
        );

        if (showConfirmation) {
            alert(
                "Reply saved successfully."
            );
        }
    } catch (error) {
        console.error(
            "Reply save error:",
            error
        );

        if (showConfirmation) {
            alert(error.message);
        }
    }
}

async function updateCommentStatus(
    commentId,
    status,
    reload = true
) {
    try {
        const response = await fetch(
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
                "Unable to update comment status."
            );
        }

        selectedCommentId = commentId;

        updateLocalComment(
            commentId,
            {
                status:
                    result.status ||
                    status
            }
        );

        if (reload) {
            await loadComments();
        }
    } catch (error) {
        console.error(
            "Status update error:",
            error
        );

        alert(error.message);
    }
}

async function deleteComment(comment) {
    const confirmed =
        window.confirm(
            `Delete the comment from ${
                comment.author || "Customer"
            }?`
        );

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(
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

function updateLocalComment(
    commentId,
    changes
) {
    const comment =
        comments.find(
            (item) =>
                item.id === commentId
        );

    if (!comment) {
        return;
    }

    Object.assign(
        comment,
        changes
    );
}

function getPlatformIcon(platform = "") {
    const normalizedPlatform =
        String(platform)
            .trim()
            .toLowerCase();

    const icons = {
        facebook: "📘",
        instagram: "📸",
        tiktok: "🎵",
        youtube: "▶️",
        manual: "⌨️"
    };

    return (
        icons[normalizedPlatform] ||
        "💬"
    );
}

function formatPlatformName(platform = "") {
    const normalizedPlatform =
        String(platform || "manual")
            .trim()
            .toLowerCase();

    return (
        normalizedPlatform
            .charAt(0)
            .toUpperCase() +
        normalizedPlatform.slice(1)
    );
}

function formatDecisionSource(source = "") {
    const normalizedSource =
        String(source)
            .trim()
            .toUpperCase();

    if (normalizedSource === "RULE") {
        return "Rule Engine";
    }

    if (
        normalizedSource === "GPT" ||
        normalizedSource === "AI"
    ) {
        return "GPT";
    }

    if (!normalizedSource) {
        return "Not generated";
    }

    return normalizedSource;
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