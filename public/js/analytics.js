const totalComments =
    document.getElementById(
        "analytics-total-comments"
    );

const commentsToday =
    document.getElementById(
        "analytics-comments-today"
    );

const repliesToday =
    document.getElementById(
        "analytics-replies-today"
    );

const responseTime =
    document.getElementById(
        "analytics-response-time"
    );

const gptReplies =
    document.getElementById(
        "analytics-gpt"
    );

const ruleReplies =
    document.getElementById(
        "analytics-rules"
    );

const estimatedCost =
    document.getElementById(
        "analytics-cost"
    );

const pending =
    document.getElementById(
        "analytics-pending"
    );

const replied =
    document.getElementById(
        "analytics-replied"
    );

const approved =
    document.getElementById(
        "analytics-approved"
    );

const posted =
    document.getElementById(
        "analytics-posted"
    );

const ignored =
    document.getElementById(
        "analytics-ignored"
    );

const businessesContainer =
    document.getElementById(
        "analytics-businesses"
    );


async function loadAnalytics() {

    try {

        const data =
            await MasterControlAPI.getDashboard();


        totalComments.textContent =
            data.totalComments || 0;


        commentsToday.textContent =
            data.commentsToday || 0;


        repliesToday.textContent =
            data.repliesToday || 0;


        responseTime.textContent =
            `${data.averageProcessingTime || 0} ms`;


        gptReplies.textContent =
            data.gptReplies || 0;


        ruleReplies.textContent =
            data.ruleReplies || 0;


        estimatedCost.textContent =
            `$${Number(
                data.estimatedCost || 0
            ).toFixed(4)}`;


        pending.textContent =
            data.statuses?.pending || 0;


        replied.textContent =
            data.statuses?.replied || 0;


        approved.textContent =
            data.statuses?.approved || 0;


        posted.textContent =
            data.statuses?.posted || 0;


        ignored.textContent =
            data.statuses?.ignored || 0;


        renderBusinesses(
            data.businessActivity || []
        );

    }
    catch (error) {

        console.error(
            "Analytics loading error:",
            error
        );


        businessesContainer.innerHTML = `
            <div class="analytics-empty">
                Unable to load analytics.
            </div>
        `;

    }

}


function renderBusinesses(
    businesses
) {

    if (!businesses.length) {

        businessesContainer.innerHTML = `
            <div class="analytics-empty">
                No business activity yet.
            </div>
        `;

        return;

    }


    businessesContainer.innerHTML =
        businesses
            .map(
                (business) => `
                    <article class="business-analytics-item">

                        <div class="business-analytics-name">

                            <strong>
                                ${escapeHtml(
                                    business.business_emoji ||
                                    business.emoji ||
                                    "🏢"
                                )}
                                ${escapeHtml(
                                    business.business_name ||
                                    business.name ||
                                    "Business"
                                )}
                            </strong>

                            <small>
                                ACTIVITY
                            </small>

                        </div>


                        <div class="business-metric">

                            <span>
                                Comments
                            </span>

                            <strong>
                                ${business.total_comments || 0}
                            </strong>

                        </div>


                        <div class="business-metric">

                            <span>
                                Pending
                            </span>

                            <strong>
                                ${business.pending_comments || 0}
                            </strong>

                        </div>


                        <div class="business-metric">

                            <span>
                                Approved
                            </span>

                            <strong>
                                ${business.approved_comments || 0}
                            </strong>

                        </div>


                        <div class="business-metric">

                            <span>
                                AI
                            </span>

                            <strong>
                                ${business.gpt_replies || 0}
                            </strong>

                        </div>


                        <div class="business-metric">

                            <span>
                                Rules
                            </span>

                            <strong>
                                ${business.rule_replies || 0}
                            </strong>

                        </div>

                    </article>
                `
            )
            .join("");

}


function escapeHtml(
    value = ""
) {

    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


loadAnalytics();