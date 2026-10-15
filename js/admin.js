
document.addEventListener("DOMContentLoaded", async function () {
    const API_URL =
        "https://jjce2az1hl.execute-api.eu-north-1.amazonaws.com/claims";

    const container = document.getElementById("claims-container");
    const message = document.getElementById("admin-message");

    let requestInProgress = false;

    // =========================================
    // HELPER FUNCTIONS
    // =========================================

    function setMessage(text, type = "info") {
        message.textContent = text;
        message.dataset.type = type;
    }

    function updateCount(id, count) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = String(count);
        }
    }

    function resetCounts() {
        updateCount("total-claims", 0);
        updateCount("pending-claims", 0);
        updateCount("approved-claims", 0);
        updateCount("rejected-claims", 0);
    }

    function createTextElement(tag, text) {
        const element = document.createElement(tag);
        element.textContent = String(text ?? "");
        return element;
    }

    function getToken() {
        return typeof getAccessToken === "function"
            ? getAccessToken()
            : null;
    }

    function formatDate(value) {
        if (!value) {
            return "Unknown";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleString("en-ZA", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    async function readResponse(response) {
        try {
            return await response.json();
        } catch {
            return {};
        }
    }

    function getErrorMessage(status, data, fallback) {
        if (status === 401) {
            return "Your session has expired. Please log in again.";
        }

        if (status === 403) {
            return "Access denied. Administrator privileges required.";
        }

        if (status === 404) {
            return "The requested claim could not be found.";
        }

        if (status === 409) {
            return (
                "This claim cannot be reviewed because it has " +
                "already been processed or the item is no longer available."
            );
        }

        return data?.message || fallback;
    }

    // =========================================
    // STATISTICS
    // =========================================

    function updateStatistics(claims) {
        updateCount("total-claims", claims.length);

        updateCount(
            "pending-claims",
            claims.filter(
                claim => claim.status === "PENDING"
            ).length
        );

        updateCount(
            "approved-claims",
            claims.filter(
                claim => claim.status === "APPROVED"
            ).length
        );

        updateCount(
            "rejected-claims",
            claims.filter(
                claim => claim.status === "REJECTED"
            ).length
        );
    }

    // =========================================
    // CLAIM STATUS BADGE
    // =========================================

    function createStatusBadge(status) {
        const badge = createTextElement(
            "span",
            status || "UNKNOWN"
        );

        badge.className = "claim-status";

        if (status === "PENDING") {
            badge.classList.add("pending");
        } else if (status === "APPROVED") {
            badge.classList.add("approved");
        } else if (status === "REJECTED") {
            badge.classList.add("rejected");
        }

        return badge;
    }

    // =========================================
    // CLAIM CARD
    // =========================================

    function createClaimCard(claim) {
        const card = document.createElement("article");
        card.className = "item-card";

        const heading = createTextElement(
            "h3",
            "Claim " + (claim.claimId ?? "Unknown")
        );

        const status = createStatusBadge(claim.status);

        const itemId = createTextElement(
            "p",
            "Item ID: " + (claim.itemId ?? "Unknown")
        );

        const userId = createTextElement(
            "p",
            "User ID: " + (claim.userId ?? "Unknown")
        );

        const explanationHeading = createTextElement(
            "h4",
            "Ownership Explanation"
        );

        const explanation = createTextElement(
            "p",
            claim.explanation || "No explanation provided."
        );

        const date = createTextElement(
            "p",
            "Submitted: " + formatDate(claim.createdAt)
        );

        card.append(
            heading,
            status,
            itemId,
            userId,
            explanationHeading,
            explanation,
            date
        );

        // Display review information for processed claims.
        if (
            claim.status !== "PENDING" &&
            claim.reviewedAt
        ) {
            const reviewed = createTextElement(
                "p",
                "Reviewed: " + formatDate(claim.reviewedAt)
            );

            card.appendChild(reviewed);
        }

        // Only pending claims can be reviewed.
        if (claim.status === "PENDING") {
            const notice = createTextElement(
                "p",
                "Awaiting administrator review"
            );

            const actions = document.createElement("div");
            actions.className = "claim-actions";

            const approveButton = document.createElement("button");
            approveButton.type = "button";
            approveButton.className = "approve-button";
            approveButton.textContent = "✓ Approve";

            const rejectButton = document.createElement("button");
            rejectButton.type = "button";
            rejectButton.className = "reject-button";
            rejectButton.textContent = "✕ Reject";

            approveButton.addEventListener("click", function () {
                reviewClaim(
                    claim.claimId,
                    "APPROVED"
                );
            });

            rejectButton.addEventListener("click", function () {
                reviewClaim(
                    claim.claimId,
                    "REJECTED"
                );
            });

            actions.append(
                approveButton,
                rejectButton
            );

            card.append(
                notice,
                actions
            );
        }

        return card;
    }

    // =========================================
    // DISPLAY CLAIMS
    // =========================================

    function displayClaims(claims) {
        container.replaceChildren();

        updateStatistics(claims);

        if (claims.length === 0) {
            setMessage(
                "No claims have been submitted yet.",
                "info"
            );
            return;
        }

        // Pending claims appear first.
        const sortedClaims = [...claims].sort((a, b) => {
            if (
                a.status === "PENDING" &&
                b.status !== "PENDING"
            ) {
                return -1;
            }

            if (
                b.status === "PENDING" &&
                a.status !== "PENDING"
            ) {
                return 1;
            }

            const aTime = Date.parse(a.createdAt || "") || 0;
            const bTime = Date.parse(b.createdAt || "") || 0;

            return bTime - aTime;
        });

        const fragment = document.createDocumentFragment();

        sortedClaims.forEach(function (claim) {
            fragment.appendChild(createClaimCard(claim));
        });

        container.appendChild(fragment);

        setMessage("");
    }

    // =========================================
    // LOAD CLAIMS FROM AWS
    // =========================================

    async function loadClaims() {
        const token = getToken();

        if (!token) {
            throw new Error(
                "Please log in to access the admin dashboard."
            );
        }

        const response = await fetch(API_URL, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await readResponse(response);

        if (!response.ok) {
            throw new Error(
                getErrorMessage(
                    response.status,
                    data,
                    "Unable to retrieve claims."
                )
            );
        }

        if (!Array.isArray(data.claims)) {
            throw new Error(
                "Invalid claims response from AWS."
            );
        }

        displayClaims(data.claims);
    }

    // =========================================
    // APPROVE OR REJECT CLAIM
    // =========================================

    async function reviewClaim(claimId, newStatus) {
        if (requestInProgress) {
            return;
        }

        if (!claimId) {
            setMessage("Invalid claim ID.", "error");
            return;
        }

        const action =
            newStatus === "APPROVED" ? "approve" : "reject";

        const confirmed = window.confirm(
            `Are you sure you want to ${action} this claim?`
        );

        if (!confirmed) {
            return;
        }

        const token = getToken();

        if (!token) {
            setMessage(
                "Your session has expired. Please log in again.",
                "error"
            );
            return;
        }

        requestInProgress = true;

        const actionButtons = container.querySelectorAll(
            ".approve-button, .reject-button"
        );

        actionButtons.forEach(button => {
            button.disabled = true;
        });

        setMessage(
            `Processing ${action} request...`,
            "info"
        );

        let reviewSucceeded = false;

        try {
            const response = await fetch(
                `${API_URL}/${encodeURIComponent(claimId)}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        status: newStatus
                    })
                }
            );

            const data = await readResponse(response);

            if (!response.ok) {
                throw new Error(
                    getErrorMessage(
                        response.status,
                        data,
                        "Unable to review claim."
                    )
                );
            }

            reviewSucceeded = true;

            // Reload claim cards and statistics.
            await loadClaims();

            setMessage(
                `Claim ${newStatus.toLowerCase()} successfully!`,
                "success"
            );

        } catch (error) {
            console.error("Claim review error:", error);

            if (reviewSucceeded) {
                setMessage(
                    "The claim was reviewed successfully, but " +
                    "the dashboard could not refresh. " +
                    "Please reload the page.",
                    "error"
                );
            } else {
                setMessage(error.message, "error");
            }

        } finally {
            requestInProgress = false;

            // Re-enable buttons still present on the page.
            container.querySelectorAll(
                ".approve-button, .reject-button"
            ).forEach(button => {
                button.disabled = false;
            });
        }
    }

    // =========================================
    // INITIALIZE ADMIN DASHBOARD
    // =========================================

    async function initializeDashboard() {
        resetCounts();
        container.replaceChildren();

        setMessage("Loading claims...", "info");

        try {
            await loadClaims();
        } catch (error) {
            console.error("Admin dashboard error:", error);

            setMessage(
                error.message ||
                "Unable to load claims. Please try again.",
                "error"
            );
        }
    }

    await initializeDashboard();
});
