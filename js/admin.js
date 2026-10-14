
document.addEventListener("DOMContentLoaded", async function () {
    const API_URL =
        "https://jjce2az1hl.execute-api.eu-north-1.amazonaws.com/claims";

    const container = document.getElementById("claims-container");
    const message = document.getElementById("admin-message");

    function setMessage(text) {
        message.textContent = text;
    }

    function updateCount(id, count) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = count;
        }
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

    function displayClaims(claims) {
        container.replaceChildren();

        updateCount("total-claims", claims.length);

        updateCount(
            "pending-claims",
            claims.filter(claim => claim.status === "PENDING").length
        );

        updateCount(
            "approved-claims",
            claims.filter(claim => claim.status === "APPROVED").length
        );

        updateCount(
            "rejected-claims",
            claims.filter(claim => claim.status === "REJECTED").length
        );

        if (claims.length === 0) {
            setMessage("No claims have been submitted yet.");
            return;
        }

        setMessage("");

        claims.forEach(function (claim) {
            const card = document.createElement("article");
            card.className = "item-card";

            const heading = createTextElement(
                "h3",
                "Claim " + claim.claimId
            );

            const status = createTextElement(
                "p",
                "Status: " + claim.status
            );

            const itemId = createTextElement(
                "p",
                "Item ID: " + claim.itemId
            );

            const userId = createTextElement(
                "p",
                "User ID: " + claim.userId
            );

            const explanationHeading = createTextElement(
                "h4",
                "Ownership Explanation"
            );

            const explanation = createTextElement(
                "p",
                claim.explanation
            );

            const date = createTextElement(
                "p",
                "Submitted: " + claim.createdAt
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

            if (claim.status === "PENDING") {
                const actions = document.createElement("div");
                actions.className = "claim-actions";

                const approveButton = document.createElement("button");
                approveButton.type = "button";
                approveButton.textContent = "Approve";
                approveButton.className = "approve-button";

                const rejectButton = document.createElement("button");
                rejectButton.type = "button";
                rejectButton.textContent = "Reject";
                rejectButton.className = "reject-button";

                const notice = createTextElement(
                    "p",
                    "Awaiting administrator review"
                );

                approveButton.addEventListener("click", function () {
                    reviewClaim(
                        claim.claimId,
                        "APPROVED",
                        approveButton,
                        rejectButton
                    );
                });

                rejectButton.addEventListener("click", function () {
                    reviewClaim(
                        claim.claimId,
                        "REJECTED",
                        approveButton,
                        rejectButton
                    );
                });

                actions.append(approveButton, rejectButton);
                card.append(notice, actions);
            }

            container.appendChild(card);
        });
    }

    async function reviewClaim(
        claimId,
        newStatus,
        approveButton,
        rejectButton
    ) {
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
            setMessage("Your session has expired. Please log in again.");
            return;
        }

        approveButton.disabled = true;
        rejectButton.disabled = true;

        setMessage(`Processing claim ${action} request...`);

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

            const data = await response.json();

            if (response.status === 401) {
                throw new Error(
                    "Your session has expired. Please log in again."
                );
            }

            if (response.status === 403) {
                throw new Error(
                    "Access denied. Administrator privileges required."
                );
            }

            if (response.status === 409) {
                throw new Error(
                    "This claim has already been reviewed or no longer exists."
                );
            }

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to review claim."
                );
            }

            await loadClaims();

            setMessage(
                `Claim ${newStatus.toLowerCase()} successfully!`
            );

        } catch (error) {
            console.error("Claim review error:", error);
            setMessage(error.message);

            approveButton.disabled = false;
            rejectButton.disabled = false;
        }
    }

    async function loadClaims() {
        const token = getToken();

        if (!token) {
            setMessage("Please log in to access the admin dashboard.");
            return;
        }

        try {
            const response = await fetch(API_URL, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.status === 403) {
                setMessage(
                    "Access denied. Only CloudLost administrators can view claims."
                );
                return;
            }

            if (response.status === 401) {
                setMessage(
                    "Your session has expired. Please log in again."
                );
                return;
            }

            if (!response.ok) {
                throw new Error("Unable to retrieve claims.");
            }

            const data = await response.json();

            if (!Array.isArray(data.claims)) {
                throw new Error("Invalid claims response.");
            }

            displayClaims(data.claims);

        } catch (error) {
            console.error("Admin dashboard error:", error);
            setMessage("Unable to load claims. Please try again.");
            throw error;
        }
    }

    try {
        await loadClaims();
    } catch (error) {
        // Error message is already displayed by loadClaims.
    }
});
