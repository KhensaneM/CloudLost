
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
        element.textContent = String(text || "");
        return element;
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
                const notice = createTextElement(
                    "p",
                    "Awaiting administrator review"
                );

                card.appendChild(notice);
            }

            container.appendChild(card);
        });
    }

    try {
        const token =
            typeof getAccessToken === "function"
                ? getAccessToken()
                : null;

        if (!token) {
            setMessage("Please log in to access the admin dashboard.");
            return;
        }

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
    }
});
