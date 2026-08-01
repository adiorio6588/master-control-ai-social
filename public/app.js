const generateButton =
    document.getElementById("generate");

const copyReplyButton =
    document.getElementById("copy-reply");

const refreshHistoryButton =
    document.getElementById("refresh-history");

const businessSelect =
    document.getElementById("business");

const businessCount =
    document.getElementById("business-count");

const replyCount =
    document.getElementById("reply-count");

const commentInput =
    document.getElementById("comment");

const replyInput =
    document.getElementById("reply");

const replyStatus =
    document.getElementById("reply-status");

const historyList =
    document.getElementById("history-list");

/*
 * Prevent unfinished sidebar links from navigating.
 */
document
    .querySelectorAll(".disabled-link")
    .forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
        });
    });

async function loadBusinesses() {
    businessSelect.disabled = true;

    try {
        const response =
            await fetch("/api/businesses");

        if (!response.ok) {
            throw new Error(
                "Unable to load businesses."
            );
        }

        const businesses =
            await response.json();

        businessSelect.innerHTML = "";
        businessCount.textContent =
            businesses.length;

        if (!businesses.length) {
            businessSelect.innerHTML = `
                <option value="">
                    No businesses found
                </option>
            `;

            return;
        }

        businesses.forEach((business) => {
            const option =
                document.createElement("option");

            option.value = business.id;

            option.textContent =
                `${business.emoji || "◉"} ${business.name}`;

            businessSelect.appendChild(option);
        });
    } catch (error) {
        console.error(
            "Business loading error:",
            error
        );

        businessSelect.innerHTML = `
            <option value="">
                Unable to load businesses
            </option>
        `;

        businessCount.textContent = "ERR";
    } finally {
        businessSelect.disabled = false;
    }
}

async function loadHistory() {
    historyList.innerHTML = `
        <div class="history-empty">
            Loading activity log...
        </div>
    `;

    try {
        const response =
            await fetch("/api/history");

        if (!response.ok) {
            throw new Error(
                "Unable to load reply history."
            );
        }

        const history =
            await response.json();

        replyCount.textContent =
            history.length;

        renderHistory(history);
    } catch (error) {
        console.error(
            "History loading error:",
            error
        );

        replyCount.textContent = "ERR";

        historyList.innerHTML = `
            <div class="history-empty history-error">
                Unable to load activity log.
            </div>
        `;
    }
}

function renderHistory(history) {
    historyList.innerHTML = "";

    if (!history.length) {
        historyList.innerHTML = `
            <div class="history-empty">
                No replies have been generated yet.
            </div>
        `;

        return;
    }

    history.forEach((item, index) => {
        const historyItem =
            document.createElement("article");

        historyItem.className =
            "history-item";

        const itemNumber =
            String(index + 1).padStart(2, "0");

        const businessLabel =
            `${item.business_emoji || "◉"} ` +
            `${item.business_name || "Unknown Business"}`;

        historyItem.innerHTML = `
            <div class="history-top-row">

                <span class="history-number">
                    ${itemNumber}
                </span>

                <div class="history-business">

                    <strong>
                        ${escapeHtml(businessLabel)}
                    </strong>

                    <small>
                        ${escapeHtml(item.platform || "manual")}
                        //
                        ${escapeHtml(formatDate(item.created_at))}
                    </small>

                </div>

                <span class="draft-badge">
                    ${item.posted ? "POSTED" : "DRAFT"}
                </span>

            </div>

            <div class="history-block">

                <span>INCOMING</span>

                <p>
                    ${escapeHtml(item.comment || "")}
                </p>

            </div>

            <div class="history-block response-block">

                <span>RESPONSE</span>

                <p>
                    ${escapeHtml(item.reply || "")}
                </p>

            </div>

            <button
                class="control-button history-copy"
                data-reply="${encodeURIComponent(item.reply || "")}"
                type="button"
            >
                Copy Response
            </button>
        `;

        historyList.appendChild(historyItem);
    });

    document
        .querySelectorAll(".history-copy")
        .forEach((button) => {
            button.addEventListener(
                "click",
                async () => {
                    const reply =
                        decodeURIComponent(
                            button.dataset.reply
                        );

                    await copyText(
                        reply,
                        button
                    );
                }
            );
        });
}

generateButton.addEventListener(
    "click",
    async () => {
        const comment =
            commentInput.value.trim();

        const businessId =
            businessSelect.value;

        if (!businessId) {
            alert(
                "Please select a business."
            );

            return;
        }

        if (!comment) {
            alert(
                "Please enter a customer comment."
            );

            commentInput.focus();

            return;
        }

        setGeneratingState(true);

        replyInput.value =
            "PROCESSING MESSAGE...";

        replyStatus.textContent = "";

        try {
            const response =
                await fetch("/api/reply", {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        comment,
                        businessId
                    })
                });

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Unable to generate reply."
                );
            }

            replyInput.value =
                data.reply || "";

            if (data.source === "rule") {
                replyStatus.textContent =
                    `RULE MATCHED // ${data.ruleName} // ${data.business}`;
            } else {
                replyStatus.textContent =
                    `AI RESPONSE SAVED // ${data.business}`;
            }

            await loadHistory();
        } catch (error) {
            console.error(
                "Reply generation error:",
                error
            );

            replyInput.value = "";

            replyStatus.textContent =
                `SYSTEM ERROR // ${error.message}`;
        } finally {
            setGeneratingState(false);
        }
    }
);

copyReplyButton.addEventListener(
    "click",
    async () => {
        const reply =
            replyInput.value.trim();

        if (!reply) {
            alert(
                "There is no reply to copy."
            );

            return;
        }

        await copyText(
            reply,
            copyReplyButton
        );
    }
);

refreshHistoryButton.addEventListener(
    "click",
    async () => {
        refreshHistoryButton.disabled = true;
        refreshHistoryButton.textContent =
            "Loading...";

        await loadHistory();

        refreshHistoryButton.disabled = false;
        refreshHistoryButton.textContent =
            "Refresh";
    }
);

function setGeneratingState(
    isGenerating
) {
    generateButton.disabled =
        isGenerating;

    businessSelect.disabled =
        isGenerating;

    commentInput.disabled =
        isGenerating;

    generateButton.textContent =
        isGenerating
            ? "Processing..."
            : "Generate AI Reply";
}

async function copyText(
    text,
    button
) {
    const originalText =
        button.textContent;

    try {
        await navigator.clipboard.writeText(
            text
        );
    } catch (error) {
        const temporaryTextarea =
            document.createElement(
                "textarea"
            );

        temporaryTextarea.value =
            text;

        document.body.appendChild(
            temporaryTextarea
        );

        temporaryTextarea.select();

        document.execCommand("copy");

        temporaryTextarea.remove();
    }

    button.textContent = "Copied";

    window.setTimeout(() => {
        button.textContent =
            originalText;
    }, 1500);
}

function formatDate(value) {
    if (!value) {
        return "Unknown";
    }

    const normalizedValue =
        value.includes("T")
            ? value
            : `${value.replace(" ", "T")}Z`;

    const date =
        new Date(normalizedValue);

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

async function initializeApp() {
    await loadBusinesses();
    await loadHistory();
}

initializeApp();