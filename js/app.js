
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

    // Only run report functionality on report.html
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

        // Update heading when report type changes
        reportType.addEventListener("change", function () {

            if (!reportTitle) {
                return;
            }

            if (reportType.value === "lost") {

                reportTitle.textContent =
                    "Report a Lost Item";

            } else if (reportType.value === "found") {

                reportTitle.textContent =
                    "Report a Found Item";

            } else {

                reportTitle.textContent =
                    "Report an Item";
            }
        });

        // Submit reports to AWS
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

                    const response = await fetch(
                        API_URL,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body: JSON.stringify(reportData)
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

    const searchInput =
        document.getElementById("search-input");

    const typeFilter =
        document.getElementById("type-filter");

    const categoryFilter =
        document.getElementById("category-filter");

    // Store items loaded from AWS
    let allItems = [];

    // Only run browse functionality on items.html
    if (itemsGrid) {

        if (searchInput) {
            searchInput.addEventListener(
                "input",
                filterItems
            );
        }

        if (typeFilter) {
            typeFilter.addEventListener(
                "change",
                filterItems
            );
        }

        if (categoryFilter) {
            categoryFilter.addEventListener(
                "change",
                filterItems
            );
        }

        loadItems();
    }


    /*
     * LOAD ITEMS FROM AWS
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

            allItems = result.items || [];

            // Apply active search and filters
            filterItems();

        } catch (error) {

            console.error(
                "Error loading items:",
                error
            );

            if (itemsGrid) {
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
    }


    /*
     * SEARCH AND FILTER ITEMS
     */
    function filterItems() {

        const searchText = searchInput
            ? searchInput.value.trim().toLowerCase()
            : "";

        const selectedType = typeFilter
            ? typeFilter.value
            : "all";

        const selectedCategory = categoryFilter
            ? categoryFilter.value
            : "all";

        const filteredItems = allItems.filter(
            function (item) {

                const itemName =
                    (item.itemName || "").toLowerCase();

                const itemType =
                    (item.type || "").toLowerCase();

                const itemCategory =
                    (item.category || "").toLowerCase();

                const matchesSearch =
                    itemName.includes(searchText);

                const matchesType =
                    selectedType === "all" ||
                    itemType === selectedType;

                const matchesCategory =
                    selectedCategory === "all" ||
                    itemCategory === selectedCategory;

                return (
                    matchesSearch &&
                    matchesType &&
                    matchesCategory
                );
            }
        );

        displayItems(filteredItems);
    }


    /*
     * DISPLAY ITEMS ON THE PAGE
     */
    function displayItems(items) {

        if (!itemsGrid) {
            return;
        }

        // Show empty state
        if (items.length === 0) {

            itemsGrid.innerHTML = `
                <div class="empty-items">

                    <div class="empty-icon">
                        🔎
                    </div>

                    <h2>
                        No matching items found
                    </h2>

                    <p>
                        Try changing your search
                        or filter selections.
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

        // Clear previously displayed items
        itemsGrid.innerHTML = "";

        items.forEach(function (item) {

            const itemCard =
                document.createElement("article");

            itemCard.className = "item-card";

            const type =
                String(item.type || "unknown");

            const itemName =
                String(item.itemName || "Unnamed Item");

            const category =
                String(item.category || "other");

            const description =
                String(
                    item.description ||
                    "No description provided."
                );

            const location =
                String(
                    item.location ||
                    "Location not provided"
                );

            const date =
                String(
                    item.date ||
                    "Date not provided"
                );

            const status =
                String(item.status || "OPEN");

            // Create the card structure
            // Use textContent for user-submitted data
            // to prevent HTML injection.
            const cardHeader =
                document.createElement("div");

            cardHeader.className =
                "item-card-header";

            const typeBadge =
                document.createElement("span");

            typeBadge.className =
                "item-type";

            if (type.toLowerCase() === "lost") {
                typeBadge.classList.add("lost");
            } else if (type.toLowerCase() === "found") {
                typeBadge.classList.add("found");
            }

            typeBadge.textContent =
                type.toUpperCase();

            const statusBadge =
                document.createElement("span");

            statusBadge.className =
                "item-status";

            statusBadge.textContent = status;

            cardHeader.appendChild(typeBadge);
            cardHeader.appendChild(statusBadge);

            const title =
                document.createElement("h2");

            title.textContent = itemName;

            const categoryText =
                document.createElement("p");

            categoryText.className =
                "item-category";

            categoryText.textContent = category;

            const descriptionText =
                document.createElement("p");

            descriptionText.className =
                "item-description";

            descriptionText.textContent =
                description;

            const details =
                document.createElement("div");

            details.className =
                "item-details";

            const locationText =
                document.createElement("p");

            const locationLabel =
                document.createElement("strong");

            locationLabel.textContent =
                "Location: ";

            locationText.appendChild(locationLabel);
            locationText.appendChild(
                document.createTextNode(location)
            );

            const dateText =
                document.createElement("p");

            const dateLabel =
                document.createElement("strong");

            dateLabel.textContent =
                "Date: ";

            dateText.appendChild(dateLabel);
            dateText.appendChild(
                document.createTextNode(date)
            );

            details.appendChild(locationText);
            details.appendChild(dateText);

            itemCard.appendChild(cardHeader);
            itemCard.appendChild(title);
            itemCard.appendChild(categoryText);
            itemCard.appendChild(descriptionText);
            itemCard.appendChild(details);

            itemsGrid.appendChild(itemCard);
        });
    }
});
