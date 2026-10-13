
document.addEventListener("DOMContentLoaded", function () {

    const API_BASE =
        "https://jjce2az1hl.execute-api.eu-north-1.amazonaws.com";

    const API_URL = `${API_BASE}/items`;
    const UPLOAD_URL = `${API_BASE}/upload-url`;
    const IMAGE_URL_ENDPOINT = `${API_BASE}/image-url`;

    const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

    const ALLOWED_IMAGE_TYPES = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    // ======================================================
    // REPORT ITEM PAGE
    // ======================================================

    const reportForm = document.getElementById("report-form");
    const reportType = document.getElementById("type");
    const reportTitle = document.getElementById("report-title");
    const formMessage = document.getElementById("form-message");
    const imageInput = document.getElementById("image");

    function setFormMessage(message) {
        if (formMessage) {
            formMessage.textContent = message;
        }
    }

    if (reportForm && reportType) {
        const params = new URLSearchParams(window.location.search);
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

        reportForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const token =
                typeof getAccessToken === "function"
                    ? getAccessToken()
                    : null;

            if (!token) {
                setFormMessage(
                    "Please log in before submitting a report."
                );
                return;
            }

            const reportData = {
                type: reportType.value,
                itemName: document.getElementById("item-name").value,
                category: document.getElementById("category").value,
                description: document.getElementById("description").value,
                location: document.getElementById("location").value,
                date: document.getElementById("date").value,
                status: "OPEN"
            };

            const imageFile =
                imageInput && imageInput.files
                    ? imageInput.files[0]
                    : null;

            if (imageFile) {
                if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
                    setFormMessage(
                        "Please select a JPEG, PNG, or WebP image."
                    );
                    return;
                }

                if (imageFile.size > MAX_IMAGE_SIZE) {
                    setFormMessage(
                        "Image must be smaller than 5 MB."
                    );
                    return;
                }

                if (imageFile.size === 0) {
                    setFormMessage(
                        "The selected image is empty."
                    );
                    return;
                }
            }

            console.log("CloudLost Report:", reportData);

            const submitButton =
                reportForm.querySelector('button[type="submit"]');

            if (submitButton) {
                submitButton.disabled = true;
            }

            setFormMessage("Submitting report...");

            try {
                if (imageFile) {
                    setFormMessage("Uploading image...");

                    const imageKey = await uploadImage(
                        imageFile,
                        token
                    );

                    reportData.imageKey = imageKey;
                }

                setFormMessage("Submitting report...");

                const response = await fetch(API_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(reportData)
                });

                if (
                    response.status === 401 ||
                    response.status === 403
                ) {
                    setFormMessage(
                        "Your session is not authorized. Please log in again."
                    );
                    return;
                }

                if (!response.ok) {
                    throw new Error("Unable to submit report");
                }

                const result = await response.json();

                console.log("AWS Response:", result);

                setFormMessage("Item reported successfully!");

            } catch (error) {
                console.error("Error submitting report:", error);

                if (error.message === "UPLOAD_UNAUTHORIZED") {
                    setFormMessage(
                        "Image upload was not authorized. Please log in again."
                    );
                } else if (error.message === "UPLOAD_URL_FAILED") {
                    setFormMessage(
                        "Unable to prepare image upload. Please try again."
                    );
                } else if (error.message === "IMAGE_UPLOAD_FAILED") {
                    setFormMessage(
                        "Image upload failed. Please try again."
                    );
                } else {
                    setFormMessage(
                        "Unable to submit report. Please try again."
                    );
                }
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                }
            }
        });
    }

    // ======================================================
    // AWS S3 IMAGE UPLOAD
    // ======================================================

    async function uploadImage(file, token) {
        const urlResponse = await fetch(UPLOAD_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                contentType: file.type,
                fileSize: file.size
            })
        });

        if (
            urlResponse.status === 401 ||
            urlResponse.status === 403
        ) {
            throw new Error("UPLOAD_UNAUTHORIZED");
        }

        if (!urlResponse.ok) {
            throw new Error("UPLOAD_URL_FAILED");
        }

        const uploadData = await urlResponse.json();

        if (!uploadData.uploadUrl || !uploadData.imageKey) {
            throw new Error("UPLOAD_URL_FAILED");
        }

        const s3Response = await fetch(uploadData.uploadUrl, {
            method: "PUT",
            headers: {
                "Content-Type": file.type
            },
            body: file
        });

        if (!s3Response.ok) {
            throw new Error("IMAGE_UPLOAD_FAILED");
        }

        return uploadData.imageKey;
    }

    // ======================================================
    // BROWSE ITEMS PAGE
    // ======================================================

    const itemsGrid = document.getElementById("items-grid");
    const searchInput = document.getElementById("search-input");
    const typeFilter = document.getElementById("type-filter");
    const categoryFilter = document.getElementById("category-filter");

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

            const matchesSearch = itemName.includes(searchText);

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
            const itemCard = document.createElement("article");
            itemCard.className = "item-card";

            const cardHeader = document.createElement("div");
            cardHeader.className = "item-card-header";

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

            // Display an image for reports with an image key.
            if (item.imageKey) {
                itemCard.appendChild(createItemImage(item));
            }

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

        const descriptionHeading = document.createElement("h3");
        descriptionHeading.textContent = "Description";

        const description = document.createElement("p");
        description.className = "item-description";
        description.textContent =
            item.description || "No description provided.";

        card.appendChild(header);

        // Display a photo on the item details page.
        if (item.imageKey) {
            card.appendChild(createItemImage(item));
        }

        card.appendChild(title);
        card.appendChild(details);
        card.appendChild(descriptionHeading);
        card.appendChild(description);

        itemDetailsContainer.appendChild(card);
    }

    // ======================================================
    // AWS S3 PUBLIC PHOTO DISPLAY - FIXED
    // ======================================================

    function createItemImage(item) {
        const wrapper = document.createElement("div");
        wrapper.className = "item-photo-container";

        const image = document.createElement("img");
        image.className = "item-photo";
        image.alt = `Photo of ${item.itemName || "reported item"}`;

        // Important:
        // A lazy image hidden with display:none may not load.
        // Use eager loading to prevent this problem.
        image.loading = "eager";
        image.decoding = "async";

        image.style.width = "100%";
        image.style.maxHeight = "320px";
        image.style.objectFit = "cover";
        image.style.borderRadius = "10px";
        image.style.margin = "12px 0";
        image.style.display = "none";

        const fallback = document.createElement("p");
        fallback.className = "item-photo-fallback";
        fallback.textContent = "Loading photo...";

        wrapper.appendChild(image);
        wrapper.appendChild(fallback);

        function showImage() {
            image.style.display = "block";
            fallback.style.display = "none";
        }

        function showImageError(error) {
            image.style.display = "none";
            fallback.style.display = "block";
            fallback.textContent = "Photo unavailable";

            console.error(
                "CloudLost image error:",
                item.itemName,
                error
            );
        }

        image.onload = function () {
            showImage();
        };

        image.onerror = function () {
            showImageError(
                new Error("Browser could not load S3 image")
            );
        };

        const requestUrl =
            `${IMAGE_URL_ENDPOINT}?imageKey=${encodeURIComponent(item.imageKey)}`;

        // GET /image-url is public, so no login token is required.
        fetch(requestUrl)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error(
                        `Image URL request failed: ${response.status}`
                    );
                }

                return response.json();
            })
            .then(function (data) {
                if (!data.imageUrl) {
                    throw new Error(
                        "Image URL missing from API response"
                    );
                }

                // Assign the signed S3 URL.
                // The browser will now download the image.
                image.src = data.imageUrl;

                // Handle images already available in the cache.
                if (image.complete && image.naturalWidth > 0) {
                    showImage();
                }
            })
            .catch(function (error) {
                showImageError(error);
            });

        return wrapper;
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
