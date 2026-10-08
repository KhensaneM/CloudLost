
/**
 * @jest-environment jsdom
 */

const fs = require("fs");
const path = require("path");

const APP_JS_PATH = path.join(__dirname, "../js/app.js");

const API_URL =
    "https://jjce2az1hl.execute-api.eu-north-1.amazonaws.com/items";

// ======================================================
// TEST HTML
// ======================================================

const reportPageHtml = `
    <h1 id="report-title">Report an Item</h1>

    <form id="report-form">
        <select id="type">
            <option value="">Select report type</option>
            <option value="lost">Lost Item</option>
            <option value="found">Found Item</option>
        </select>

        <input id="item-name" type="text">

        <select id="category">
            <option value="bags">Bags</option>
            <option value="electronics">Electronics</option>
            <option value="other">Other</option>
        </select>

        <textarea id="description"></textarea>
        <input id="location" type="text">
        <input id="date" type="date">

        <button type="submit">Submit Report</button>
    </form>

    <div id="form-message"></div>
`;

const browsePageHtml = `
    <input
        id="search-input"
        type="text"
        placeholder="Search for an item..."
    >

    <select id="type-filter">
        <option value="all">All Reports</option>
        <option value="lost">Lost Items</option>
        <option value="found">Found Items</option>
    </select>

    <select id="category-filter">
        <option value="all">All Categories</option>
        <option value="electronics">Electronics</option>
        <option value="bags">Bags</option>
        <option value="keys">Keys</option>
        <option value="documents">Documents</option>
        <option value="clothing">Clothing</option>
        <option value="jewellery">Jewellery</option>
        <option value="other">Other</option>
    </select>

    <section id="items-grid"></section>
`;

const itemDetailsPageHtml = `
    <section id="item-details-container">
        <div class="empty-items">
            <h2>Loading item details...</h2>
        </div>
    </section>
`;

// ======================================================
// MOCK AWS DATA
// ======================================================

const mockItems = [
    {
        itemId: "1",
        type: "lost",
        itemName: "Black Backpack",
        category: "bags",
        description: "Black backpack with laptop sleeve",
        location: "Campus",
        date: "2026-10-07",
        status: "OPEN"
    },
    {
        itemId: "2",
        type: "found",
        itemName: "Blue Water Bottle",
        category: "other",
        description: "Blue bottle with black lid",
        location: "Library",
        date: "2026-10-07",
        status: "OPEN"
    },
    {
        itemId: "3",
        type: "lost",
        itemName: "Silver Laptop",
        category: "electronics",
        description: "Silver laptop in black case",
        location: "Classroom",
        date: "2026-10-07",
        status: "OPEN"
    }
];

// ======================================================
// TEST HELPERS
// ======================================================

function runAppCode() {
    const appCode = fs.readFileSync(APP_JS_PATH, "utf8");

    let domReadyCallback = null;

    const originalAddEventListener =
        document.addEventListener;

    document.addEventListener = jest.fn(
        (eventName, callback, options) => {
            if (eventName === "DOMContentLoaded") {
                domReadyCallback = callback;
                return;
            }

            return originalAddEventListener.call(
                document,
                eventName,
                callback,
                options
            );
        }
    );

    try {
        eval(appCode);
    } finally {
        document.addEventListener = originalAddEventListener;
    }

    if (domReadyCallback) {
        domReadyCallback();
    }
}

function loadReportPage(search = "") {
    document.body.innerHTML = reportPageHtml;

    window.history.replaceState(
        {},
        "",
        `/report.html${search}`
    );

    runAppCode();
}

function loadBrowsePage() {
    document.body.innerHTML = browsePageHtml;

    window.history.replaceState(
        {},
        "",
        "/items.html"
    );

    runAppCode();
}

function loadItemDetailsPage(itemId) {
    document.body.innerHTML = itemDetailsPageHtml;

    window.history.replaceState(
        {},
        "",
        `/item-details.html?id=${encodeURIComponent(itemId)}`
    );

    runAppCode();
}

function fillReportForm() {
    document.getElementById("type").value = "lost";

    document.getElementById("item-name").value =
        "Blue Backpack";

    document.getElementById("category").value = "bags";

    document.getElementById("description").value =
        "Blue school backpack";

    document.getElementById("location").value = "Campus";

    document.getElementById("date").value = "2026-10-07";
}

function submitReportForm() {
    const form = document.getElementById("report-form");

    const event = new Event("submit", {
        bubbles: true,
        cancelable: true
    });

    form.dispatchEvent(event);

    return event;
}

async function waitForAsyncUpdates() {
    await new Promise(resolve => setTimeout(resolve, 0));
}

function getItemsGridText() {
    return document.getElementById("items-grid").textContent;
}

function getDetailsText() {
    return document.getElementById(
        "item-details-container"
    ).textContent;
}

// ======================================================
// TEST SETUP
// ======================================================

beforeEach(() => {
    jest.clearAllMocks();

    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
            message: "Item reported successfully",
            items: mockItems
        })
    });

    window.fetch = global.fetch;
});

afterEach(() => {
    delete global.fetch;
    delete window.fetch;

    document.body.innerHTML = "";
});

// ======================================================
// REPORT ITEM TESTS
// ======================================================

describe("CloudLost report form", () => {

    test("selects Lost Item when type=lost is in the URL", () => {
        loadReportPage("?type=lost");

        expect(
            document.getElementById("type").value
        ).toBe("lost");

        expect(
            document.getElementById("report-title").textContent
        ).toBe("Report a Lost Item");
    });

    test("selects Found Item when type=found is in the URL", () => {
        loadReportPage("?type=found");

        expect(
            document.getElementById("type").value
        ).toBe("found");

        expect(
            document.getElementById("report-title").textContent
        ).toBe("Report a Found Item");
    });

    test("changes heading when report type changes", () => {
        loadReportPage();

        const reportType =
            document.getElementById("type");

        const reportTitle =
            document.getElementById("report-title");

        reportType.value = "lost";

        reportType.dispatchEvent(
            new Event("change", { bubbles: true })
        );

        expect(reportTitle.textContent)
            .toBe("Report a Lost Item");

        reportType.value = "found";

        reportType.dispatchEvent(
            new Event("change", { bubbles: true })
        );

        expect(reportTitle.textContent)
            .toBe("Report a Found Item");
    });

    test("prevents normal form submission", () => {
        loadReportPage("?type=lost");

        fillReportForm();

        const event = submitReportForm();

        expect(event.defaultPrevented).toBe(true);
    });

    test("sends the report to the CloudLost API", async () => {
        loadReportPage("?type=lost");

        fillReportForm();
        submitReportForm();

        await waitForAsyncUpdates();

        expect(fetch).toHaveBeenCalledTimes(1);

        expect(fetch).toHaveBeenCalledWith(
            API_URL,
            expect.objectContaining({
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                }
            })
        );

        const requestBody = JSON.parse(
            fetch.mock.calls[0][1].body
        );

        expect(requestBody).toEqual({
            type: "lost",
            itemName: "Blue Backpack",
            category: "bags",
            description: "Blue school backpack",
            location: "Campus",
            date: "2026-10-07",
            status: "OPEN"
        });
    });
});

// ======================================================
// BROWSE ITEMS TESTS
// ======================================================

describe("CloudLost browse items", () => {

    test("displays items returned by the CloudLost API", async () => {
        loadBrowsePage();

        await waitForAsyncUpdates();

        expect(fetch).toHaveBeenCalledWith(API_URL);

        expect(getItemsGridText())
            .toContain("Black Backpack");

        expect(getItemsGridText())
            .toContain("Blue Water Bottle");

        expect(getItemsGridText())
            .toContain("Silver Laptop");
    });

    test("searches items by name", async () => {
        loadBrowsePage();

        await waitForAsyncUpdates();

        const searchInput =
            document.getElementById("search-input");

        searchInput.value = "black";

        searchInput.dispatchEvent(
            new Event("input", { bubbles: true })
        );

        expect(getItemsGridText())
            .toContain("Black Backpack");

        expect(getItemsGridText())
            .not.toContain("Blue Water Bottle");

        expect(getItemsGridText())
            .not.toContain("Silver Laptop");
    });

    test("filters items by report type", async () => {
        loadBrowsePage();

        await waitForAsyncUpdates();

        const typeFilter =
            document.getElementById("type-filter");

        typeFilter.value = "found";

        typeFilter.dispatchEvent(
            new Event("change", { bubbles: true })
        );

        expect(getItemsGridText())
            .toContain("Blue Water Bottle");

        expect(getItemsGridText())
            .not.toContain("Black Backpack");

        expect(getItemsGridText())
            .not.toContain("Silver Laptop");
    });

    test("filters items by category", async () => {
        loadBrowsePage();

        await waitForAsyncUpdates();

        const categoryFilter =
            document.getElementById("category-filter");

        categoryFilter.value = "electronics";

        categoryFilter.dispatchEvent(
            new Event("change", { bubbles: true })
        );

        expect(getItemsGridText())
            .toContain("Silver Laptop");

        expect(getItemsGridText())
            .not.toContain("Black Backpack");

        expect(getItemsGridText())
            .not.toContain("Blue Water Bottle");
    });
});

// ======================================================
// ITEM DETAILS LINK TEST
// ======================================================

describe("CloudLost item details link", () => {

    test("opens the details page when an item is clicked", async () => {
        loadBrowsePage();

        await waitForAsyncUpdates();

        const itemCard =
            document.querySelector(".item-card");

        expect(itemCard).not.toBeNull();

        const detailsLink =
            itemCard.querySelector("a");

        expect(detailsLink).not.toBeNull();

        expect(detailsLink.getAttribute("href"))
            .toBe("item-details.html?id=1");
    });
});

// ======================================================
// ITEM DETAILS PAGE TESTS
// ======================================================

describe("CloudLost item details page", () => {

    test("loads the selected item using its URL ID", async () => {
        loadItemDetailsPage("1");

        await waitForAsyncUpdates();

        expect(fetch).toHaveBeenCalledWith(API_URL);

        expect(getDetailsText())
            .toContain("Black Backpack");

        expect(getDetailsText())
            .not.toContain("Silver Laptop");
    });

    test("displays the selected item's complete information", async () => {
        loadItemDetailsPage("1");

        await waitForAsyncUpdates();

        expect(getDetailsText())
            .toContain("Black Backpack");

        expect(getDetailsText())
            .toContain("Black backpack with laptop sleeve");

        expect(getDetailsText())
            .toContain("Campus");

        expect(getDetailsText())
            .toContain("2026-10-07");

        expect(getDetailsText())
            .toContain("LOST");

        expect(getDetailsText())
            .toContain("OPEN");

        expect(getDetailsText())
            .toContain("bags");
    });

    test("shows a message when the item does not exist", async () => {
        loadItemDetailsPage("999");

        await waitForAsyncUpdates();

        expect(getDetailsText())
            .toContain("Item not found");
    });
});
