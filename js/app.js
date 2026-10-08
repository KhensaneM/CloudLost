
document.addEventListener("DOMContentLoaded", function () {

    const API_URL =
        "https://jjce2az1hl.execute-api.eu-north-1.amazonaws.com/items";

    // ======================================================
    // REPORT ITEM PAGE
    // ======================================================

    const reportForm =
        document.getElementById("report-form");

    const reportType =
        document.getElementById("type");

    const reportTitle =
        document.getElementById("report-title");

    const formMessage =
        document.getElementById("form-message");

    if (reportForm && reportType) {

        const params =
            new URLSearchParams(window.location.search);

        const typeFromUrl = params.get("type");

        if (typeFromUrl === "lost") {
            reportType.value = "lost";

            if (reportTitle) {
                reportTitle.textContent = "Report a Lost Item";
            }
        }

        if (typeFromUrl === "found") {
            reportType.value = "found";

            if (reportTitle) {
                reportTitle.textContent = "Report a Found Item";
            }
        }

        reportType.addEventListener("change", function () {

            if (!reportTitle) return;

            if (reportType.value === "lost") {
                reportTitle.textContent = "Report a Lost Item";

            } else if (reportType.value === "found") {
                reportTitle.textContent = "Report a Found Item";

            } else {
                reportTitle.textContent = "Report an Item";
            }
        });

        reportForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                const reportData = {
                    type: reportType.value,
                    itemName: document.getElementById("item-name").value,
                    category: document.getElementById("category").value,
                    description: document.getElementById("description").value,
                    location: document.getElementById("location").value,
                    date: document.getElementById("date").value,
                    status: "OPEN"
                };

                console.log("CloudLost Report:", reportData);

                if (formMessage) {
                    formMessage.textContent = "Submitting report...";
                }

                try {
                    const response = await fetch(API_URL, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(reportData)
                    });

                    if (!response.ok) {
                        throw new Error("Unable to submit report");
                    }

                    const result = await response.json();

                    console.log("AWS Response:", result);

                    if (formMessage) {
                        formMessage.textContent =
                            "Item reported successfully!";
                    }

                } catch (error) {
                    console.error("Error submitting report:", error);

                    if (formMessage) {
                        formMessage.textContent =
                            "Unable to submit report. Please try again.";
                    }
                }
            }
        );
    }

    // ======================================================
    // BROWSE ITEMS PAGE
    // ======================================================

    const itemsGrid =
        document.getElementById("items-grid");

    const searchInput =
        document.getElementById("search-input");

    const typeFilter =
        document.getElementById("type-filter");

    const categoryFilter =
        document.getElementById("category-filter");

    let allItems = [];

    if (itemsGrid) {

        if (searchInput) {
            searchInput.addEventListener("input", filterItems);
        }

        if (typeFilter) {
            typeFilter.addEventListener("change", filterItems);
        }

        if (categoryFilter) {
            categoryFilter.addEventListener("change", filterItems);
        }

        loadItems();
    }

    async function loadItems() {

        try {
            const response = await fetch(API_URL);

            if (!response.ok) {
                throw new Error("Unable to load items");
            }

            const result = await response.json();

            allItems = result.items || [];

            filterItems();

        } catch (error) {
            console.error("Error loading items:", error);

            if (itemsGrid) {
                showMessage(
                    itemsGrid,
                    "Unable to load items",
                    "Please try again later."
                );
            }
        }
    }

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

        const filteredItems = allItems.filter(function (item) {

            const itemName =
                String(item.itemName || "").toLowerCase();

            const itemType =
                String(item.type || "").toLowerCase();

            const itemCategory =
                String(item.category || "").toLowerCase();

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
        });

        displayItems(filteredItems);
    }

    function displayItems(items) {

        if (!itemsGrid) return;

        if (items.length === 0) {
            showMessage(
                itemsGrid,
                "No matching items found",
                "Try changing your search or filter selections."
            );
            return;
        }

        itemsGrid.innerHTML = "";

        items.forEach(function (item) {

            const itemCard =
                document.createElement("article");

            itemCard.className = "item-card";

            const cardHeader =
                document.createElement("div");

            cardHeader.className = "item-card-header";

            const typeBadge =
                document.createElement("span");

            typeBadge.className = "item-type";

            const type = String(item.type || "unknown");

            if (type.toLowerCase() === "lost") {
                typeBadge.classList.add("lost");

            } else if (type.toLowerCase() === "found") {
                typeBadge.classList.add("found");
            }

            typeBadge.textContent = type.toUpperCase();

            const statusBadge =
                document.createElement("span");

            statusBadge.className = "item-status";

            statusBadge.textContent =
                String(item.status || "OPEN");

            cardHeader.appendChild(typeBadge);
            cardHeader.appendChild(statusBadge);

            const title = document.createElement("h2");
            title.textContent = item.itemName || "Unnamed Item";

            const categoryText = document.createElement("p");
            categoryText.className = "item-category";
            categoryText.textContent = item.category || "other";

            const descriptionText = document.createElement("p");
            descriptionText.className = "item-description";
            descriptionText.textContent =
                item.description || "No description provided.";

            const details = document.createElement("div");
            details.className = "item-details";

            details.appendChild(
                createDetailRow(
                    "Location:",
                    item.location || "Location not provided"
                )
            );

            details.appendChild(
                createDetailRow(
                    "Date:",
                    item.date || "Date not provided"
                )
            );

            const detailsLink = document.createElement("a");

            detailsLink.className =
                "btn btn-browse item-details-link";

            detailsLink.textContent = "View Details";

            detailsLink.href =
                "item-details.html?id=" +
                encodeURIComponent(item.itemId);

            itemCard.appendChild(cardHeader);
            itemCard.appendChild(title);
            itemCard.appendChild(categoryText);
            itemCard.appendChild(descriptionText);
            itemCard.appendChild(details);
            itemCard.appendChild(detailsLink);

            itemsGrid.appendChild(itemCard);
        });
    }

    // ======================================================
    // ITEM DETAILS PAGE
    // ======================================================

    const itemDetailsContainer =
        document.getElementById("item-details-container");

    if (itemDetailsContainer) {
        loadItemDetails();
    }

    async function loadItemDetails() {

        const params =
            new URLSearchParams(window.location.search);

        const itemId = params.get("id");

        if (!itemId) {
            showMessage(
                itemDetailsContainer,
                "Item not found",
                "No item ID was provided."
            );
            return;
        }

        try {
            const response = await fetch(API_URL);

            if (!response.ok) {
                throw new Error("Unable to load item details");
            }

            const result = await response.json();

            const items = result.items || [];

            const selectedItem = items.find(function (item) {
                return String(item.itemId) === itemId;
            });

            if (!selectedItem) {
                showMessage(
                    itemDetailsContainer,
                    "Item not found",
                    "This item may have been removed or does not exist."
                );
                return;
            }

            displayItemDetails(selectedItem);

        } catch (error) {
            console.error("Error loading item details:", error);

            showMessage(
                itemDetailsContainer,
                "Unable to load item details",
                "Please try again later."
            );
        }
    }

    function displayItemDetails(item) {

        if (!itemDetailsContainer) return;

        itemDetailsContainer.innerHTML = "";

        const card = document.createElement("article");
        card.className = "item-card item-details-card";

        const header = document.createElement("div");
        header.className = "item-card-header";

        const typeBadge = document.createElement("span");
        typeBadge.className = "item-type";

        const type = String(item.type || "unknown");

        if (type.toLowerCase() === "lost") {
            typeBadge.classList.add("lost");

        } else if (type.toLowerCase() === "found") {
            typeBadge.classList.add("found");
        }

        typeBadge.textContent = type.toUpperCase();

        const statusBadge = document.createElement("span");
        statusBadge.className = "item-status";
        statusBadge.textContent = String(item.status || "OPEN");

        header.appendChild(typeBadge);
        header.appendChild(statusBadge);

        const title = document.createElement("h2");
        title.textContent = item.itemName || "Unnamed Item";

        const details = document.createElement("div");
        details.className = "item-details";

        details.appendChild(
            createDetailRow("Category:", item.category || "other")
        );

        details.appendChild(
            createDetailRow(
                "Location:",
                item.location || "Location not provided"
            )
        );

        details.appendChild(
            createDetailRow(
                "Date:",
                item.date || "Date not provided"
            )
        );

        const descriptionHeading =
            document.createElement("h3");

        descriptionHeading.textContent = "Description";

        const description = document.createElement("p");
        description.className = "item-description";

        description.textContent =
            item.description || "No description provided.";

        card.appendChild(header);
        card.appendChild(title);
        card.appendChild(details);
        card.appendChild(descriptionHeading);
        card.appendChild(description);

        itemDetailsContainer.appendChild(card);
    }

    // ======================================================
    // SHARED HELPERS
    // ======================================================

    function createDetailRow(label, value) {

        const row = document.createElement("p");

        const strong = document.createElement("strong");
        strong.textContent = label + " ";

        row.appendChild(strong);

        row.appendChild(
            document.createTextNode(String(value))
        );

        return row;
    }

    function showMessage(container, heading, message) {

        if (!container) return;

        container.innerHTML = "";

        const wrapper = document.createElement("div");
        wrapper.className = "empty-items";

        const title = document.createElement("h2");
        title.textContent = heading;

        const description = document.createElement("p");
        description.textContent = message;

        wrapper.appendChild(title);
        wrapper.appendChild(description);

        container.appendChild(wrapper);
    }
});
