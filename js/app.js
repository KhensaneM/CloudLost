document.addEventListener("DOMContentLoaded", function () {

    const API_URL =
        "https://jjce2az1hl.execute-api.eu-north-1.amazonaws.com/items";

    /*
     * =========================================================
     * REPORT ITEM PAGE
     * =========================================================
     */

    const reportForm =
        document.getElementById("report-form");

    const reportType =
        document.getElementById("type");

    const reportTitle =
        document.getElementById("report-title");

    const formMessage =
        document.getElementById("form-message");

    // Only run report-page code if we are on report.html
    if (reportForm && reportType) {

        // Read ?type=lost or ?type=found from the URL
        const params =
            new URLSearchParams(window.location.search);

        const typeFromUrl =
            params.get("type");

        if (typeFromUrl === "lost") {

            reportType.value = "lost";

            if (reportTitle) {
                reportTitle.textContent =
                    "Report a Lost Item";
            }
        }

        if (typeFromUrl === "found") {

            reportType.value = "found";

            if (reportTitle) {
                reportTitle.textContent =
                    "Report a Found Item";
            }
        }

        // Change heading when report type changes
        reportType.addEventListener(
            "change",
            function () {

                if (!reportTitle) {
                    return;
                }

                if (reportType.value === "lost") {

                    reportTitle.textContent =
                        "Report a Lost Item";

                } else if (
                    reportType.value === "found"
                ) {

                    reportTitle.textContent =
                        "Report a Found Item";

                } else {

                    reportTitle.textContent =
                        "Report an Item";
                }
            }
        );

        // Send report to AWS
        reportForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                const itemName =
                    document.getElementById(
                        "item-name"
                    ).value;

                const category =
                    document.getElementById(
                        "category"
                    ).value;

                const description =
                    document.getElementById(
                        "description"
                    ).value;

                const location =
                    document.getElementById(
                        "location"
                    ).value;

                const date =
                    document.getElementById(
                        "date"
                    ).value;

                const reportData = {
                    type: reportType.value,
                    itemName: itemName,
                    category: category,
                    description: description,
                    location: location,
                    date: date,
                    status: "OPEN"
                };

                console.log(
                    "CloudLost Report:",
                    reportData
                );

                if (formMessage) {
                    formMessage.textContent =
                        "Submitting report...";
                }

                try {

                    const response =
                        await fetch(
                            API_URL,
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },
                                body: JSON.stringify(
                                    reportData
                                )
                            }
                        );

                    if (!response.ok) {
                        throw new Error(
                            "Unable to submit report"
                        );
                    }

                    const result =
                        await response.json();

                    console.log(
                        "AWS Response:",
                        result
                    );

                    if (formMessage) {
                        formMessage.textContent =
                            "Item reported successfully!";
                    }

                } catch (error) {

                    console.error(
                        "Error submitting report:",
                        error
                    );

                    if (formMessage) {
                        formMessage.textContent =
                            "Unable to submit report. Please try again.";
                    }
                }
            }
        );
    }


    /*
     * =========================================================
     * BROWSE ITEMS PAGE
     * =========================================================
     */

    const itemsGrid =
        document.getElementById("items-grid");

    // Only run browse-page code if we are on items.html
    if (itemsGrid) {

        loadItems();
    }


    /*
     * Load items from AWS
     */
    async function loadItems() {

        try {

            const response =
                await fetch(API_URL);

            if (!response.ok) {
                throw new Error(
                    "Unable to load items"
                );
            }

            const result =
                await response.json();

            const items =
                result.items || [];

            displayItems(items);

        } catch (error) {

            console.error(
                "Error loading items:",
                error
            );

            itemsGrid.innerHTML = `
                <div class="empty-items">

                    <div class="empty-icon">
                        ⚠️
                    </div>

                    <h2>
                        Unable to load items
                    </h2>

                    <p>
                        Please try again later.
                    </p>

                </div>
            `;
        }
    }


    /*
     * Display items on the Browse Items page
     */
    function displayItems(items) {

        if (items.length === 0) {

            itemsGrid.innerHTML = `
                <div class="empty-items">

                    <div class="empty-icon">
                        🔎
                    </div>

                    <h2>
                        No items to display yet
                    </h2>

                    <p>
                        No lost or found items
                        have been reported yet.
                    </p>

                    <a
                        href="report.html"
                        class="btn btn-browse"
                    >
                        Report an Item
                    </a>

                </div>
            `;

            return;
        }

        itemsGrid.innerHTML = "";

        items.forEach(function (item) {

            const itemCard =
                document.createElement("article");

            itemCard.className = "item-card";

            const type =
                item.type || "unknown";

            const itemName =
                item.itemName || "Unnamed Item";

            const category =
                item.category || "other";

            const description =
                item.description ||
                "No description provided.";

            const location =
                item.location ||
                "Location not provided";

            const date =
                item.date ||
                "Date not provided";

            const status =
                item.status || "OPEN";

            itemCard.innerHTML = `
                <div class="item-card-header">

                    <span
                        class="item-type ${type}"
                    >
                        ${type.toUpperCase()}
                    </span>

                    <span class="item-status">
                        ${status}
                    </span>

                </div>

                <h2>
                    ${itemName}
                </h2>

                <p class="item-category">
                    ${category}
                </p>

                <p class="item-description">
                    ${description}
                </p>

                <div class="item-details">

                    <p>
                        <strong>Location:</strong>
                        ${location}
                    </p>

                    <p>
                        <strong>Date:</strong>
                        ${date}
                    </p>

                </div>
            `;

            itemsGrid.appendChild(
                itemCard
            );
        });
    }
});