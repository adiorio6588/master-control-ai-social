const commentsPanel =
    document.querySelector(".comments-panel");

const detailsPanel =
    document.querySelector(".details-panel");

const countBadge =
    document.querySelector(".count-badge");

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

        countBadge.textContent = comments.length;

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

        countBadge.textContent = "ERR";

        commentsPanel.innerHTML = `
            <div class="panel-header">
                <h2>Pending Comments</h2>
                <span class="count-badge">ERR</span>
            </div>

            <div class="empty-state">
                <div class="empty-icon">⚠️</div>

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
            <span class="count-badge">...</span>
        </div>

        <div class="empty-state">
            <div class="empty-icon">⏳</div>

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

        <div id="comment-list" class="comment-list"></div>
    `;

    const commentList =
        document.getElementById("comment-list");

    if (!comments.length) {
        commentList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💬</div>

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

        card.innerHTML = `
            <div class="comment-card-top">

                <div class="platform-icon">
                    ${getPlatformIcon(comment.platform)}
                </div>

                <div class="comment-author">

                    <strong>
                        ${escapeHtml(comment.author || "Customer")}
                    </strong>

                    <small>
                        ${escapeHtml(
                            `${comment.business_emoji || "🏢"} ${comment.business_name || "Unknown Business"}`
                        )}
                        //
                        ${escapeHtml(comment.platform || "manual")}
                    </small>

                </div>

                <span class="status-badge ${escapeHtml(comment.status || "pending")}">
                    ${escapeHtml(comment.status || "pending")}
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
    detailsPanel.innerHTML = `
        <div class="panel-header">
            <h2>AI Assistant</h2>

            <span class="status-badge ${escapeHtml(comment.status || "pending")}">
                ${escapeHtml(comment.status || "pending")}
            </span>
        </div>

        <div class="detail-section">
            <span class="detail-label">
                Customer
            </span>

            <div class="detail-value">
                ${escapeHtml(comment.author || "Customer")}
            </div>
        </div>

        <div class="detail-section">
            <span class="detail-label">
                Business
            </span>

            <div class="detail-value">
                ${escapeHtml(
                    `${comment.business_emoji || "🏢"} ${comment.business_name || "Unknown Business"}`
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
                Suggested Reply
            </span>

            <div class="detail-value detail-reply">
                ${
                    comment.reply
                        ? escapeHtml(comment.reply)
                        : "No reply has been generated yet."
                }
            </div>
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
                platform, suggested reply, and approval options.
            </p>
        </div>
    `;
}

function attachDetailEvents(comment) {
    const generateButton =
        document.getElementById("generate-inbox-reply");

    const approveButton =
        document.getElementById("approve-comment");

    const postedButton =
        document.getElementById("mark-posted");

    const ignoreButton =
        document.getElementById("ignore-comment");

    const deleteButton =
        document.getElementById("delete-comment");

    generateButton.addEventListener("click", async () => {
        await generateReplyForComment(comment);
    });

    approveButton.addEventListener("click", async () => {
        await updateCommentStatus(
            comment.id,
            "approved"
        );
    });

    postedButton.addEventListener("click", async () => {
        await updateCommentStatus(
            comment.id,
            "posted"
        );
    });

    ignoreButton.addEventListener("click", async () => {
        await updateCommentStatus(
            comment.id,
            "ignored"
        );
    });

    deleteButton.addEventListener("click", async () => {
        await deleteComment(comment);
    });
}

async function generateReplyForComment(comment) {
    const button =
        document.getElementById("generate-inbox-reply");

    button.disabled = true;
    button.textContent = "Generating...";

    try {
        const response = await fetch("/api/reply", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                comment: comment.content,
                businessId: comment.business_id
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                "Unable to generate reply."
            );
        }

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
        button.textContent = "Generate Reply";
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
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    status
                })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                "Unable to update comment status."
            );
        }

        selectedCommentId = commentId;

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
    const confirmed = window.confirm(
        `Delete the comment from ${comment.author || "Customer"}?`
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

        const result = await response.json();

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

function getPlatformIcon(platform = "") {
    const normalizedPlatform =
        platform.toLowerCase();

    const icons = {
        facebook: "📘",
        instagram: "📸",
        tiktok: "🎵",
        youtube: "▶️",
        manual: "⌨️"
    };

    return icons[normalizedPlatform] || "💬";
}

function formatPlatformName(platform = "") {
    const normalizedPlatform =
        String(platform || "manual")
            .trim()
            .toLowerCase();

    return normalizedPlatform
        .charAt(0)
        .toUpperCase() +
        normalizedPlatform.slice(1);
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