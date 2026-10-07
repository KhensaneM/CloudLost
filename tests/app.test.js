/**
 * @jest-environment jsdom
 */

const fs = require("fs");
const path = require("path");

const APP_JS_PATH = path.join(__dirname, "../js/app.js");

const API_URL =
    "https://jjce2az1hl.execute-api.eu-north-1.amazonaws.com/items";

const reportPageHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>CloudLost Test</title>
</head>

<body>

    <h1 id="report-title">Report an Item</h1>

    <form id="report-form">

        <select id="type" name="type">
            <option value="">Select report type</option>
            <option value="lost">Lost Item</option>
            <option value="found">Found Item</option>
        </select>

        <input
            type="text"
            id="item-name"
            name="itemName"
        >

        <select id="category" name="category">
            <option value="">Select category</option>
            <option value="bags">Bags</option>
            <option value="electronics">Electronics</option>
            <option value="other">Other</option>
        </select>

        <textarea
            id="description"
            name="description"
        ></textarea>

        <input
            type="text"
            id="location"
            name="location"
        >

        <input
            type="date"
            id="date"
            name="date"
        >

        <button type="submit">
            Submit Report
        </button>

    </form>

    <div id="form-message"></div>

</body>
</html>
`;

const browsePageHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Browse Items | CloudLost</title>
</head>

<body>

    <input
        type="text"
        id="search-input"
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

    <section
        class="items-grid"
        id="items-grid"
    ></section>

</body>
</html>
`;

function runAppCode() {
    const appCode =
        fs.readFileSync(APP_JS_PATH, "utf8");

    let domReadyCallback = null;

    const originalAddEventListener =
        document.addEventListener.bind(document);

    document.addEventListener = jest.fn(
        (eventName, callback, options) => {

            if (eventName === "DOMContentLoaded") {
                domReadyCallback = callback;
                return;
            }

            originalAddEventListener(
                eventName,
                callback,
                options
            );
        }
    );

    eval(appCode);

    document.addEventListener =
        originalAddEventListener;

    if (domReadyCallback) {
        domReadyCallback();
    }
}

function loadReportPage(search = "") {
    document.body.innerHTML =
        reportPageHtml;

    window.history.replaceState(
        {},
        "",
        `/report.html${search}`
    );

    runAppCode();
}

function loadBrowsePage() {
    document.body.innerHTML =
        browsePageHtml;

    window.history.replaceState(
        {},
        "",
        "/items.html"
    );

    runAppCode();
}

function fillReportForm() {
    document.getElementById("type").value =
        "lost";

    document.getElementById("item-name").value =
        "Blue Backpack";

    document.getElementById("category").value =
        "bags";

    document.getElementById("description").value =
        "Blue school backpack";

    document.getElementById("location").value =
        "Campus";

    document.getElementById("date").value =
        "2026-10-07";
}

function submitReportForm() {
    const form =
        document.getElementById("report-form");

    const event = new Event("submit", {
        bubbles: true,
        cancelable: true,
    });

    form.dispatchEvent(event);

    return event;
}


describe("CloudLost report form", () => {

    beforeEach(() => {
        jest.clearAllMocks();

        global.fetch = jest.fn().mockResolvedValue({
            ok: true,

            json: jest.fn().mockResolvedValue({
                message:
                    "Item reported successfully",
            }),
        });

        window.fetch = global.fetch;
    });

    afterEach(() => {
        delete global.fetch;
        delete window.fetch;

        document.body.innerHTML = "";
    });


    test(
        "selects Lost Item when type=lost is in the URL",
        () => {

            loadReportPage("?type=lost");

            expect(
                document.getElementById("type").value
            ).toBe("lost");

            expect(
                document.getElementById(
                    "report-title"
                ).textContent
            ).toBe("Report a Lost Item");
        }
    );


    test(
        "selects Found Item when type=found is in the URL",
        () => {

            loadReportPage("?type=found");

            expect(
                document.getElementById("type").value
            ).toBe("found");

            expect(
                document.getElementById(
                    "report-title"
                ).textContent
            ).toBe("Report a Found Item");
        }
    );


    test(
        "changes heading when report type changes",
        () => {

            loadReportPage();

            const reportType =
                document.getElementById("type");

            const reportTitle =
                document.getElementById(
                    "report-title"
                );

            reportType.value = "lost";

            reportType.dispatchEvent(
                new Event("change", {
                    bubbles: true,
                })
            );

            expect(
                reportTitle.textContent
            ).toBe("Report a Lost Item");

            reportType.value = "found";

            reportType.dispatchEvent(
                new Event("change", {
                    bubbles: true,
                })
            );

            expect(
                reportTitle.textContent
            ).toBe("Report a Found Item");
        }
    );


    test(
        "prevents normal form submission",
        () => {

            loadReportPage("?type=lost");

            fillReportForm();

            const event =
                submitReportForm();

            expect(
                event.defaultPrevented
            ).toBe(true);
        }
    );


    test(
        "sends the report to the CloudLost API",
        async () => {

            loadReportPage("?type=lost");

            fillReportForm();

            submitReportForm();

            await new Promise(
                (resolve) =>
                    setTimeout(resolve, 0)
            );

            expect(fetch)
                .toHaveBeenCalledTimes(1);

            expect(fetch)
                .toHaveBeenCalledWith(
                    API_URL,
                    expect.objectContaining({
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                    })
                );

            const fetchOptions =
                fetch.mock.calls[0][1];

            const requestBody =
                JSON.parse(
                    fetchOptions.body
                );

            expect(requestBody).toEqual({
                type: "lost",
                itemName: "Blue Backpack",
                category: "bags",
                description:
                    "Blue school backpack",
                location: "Campus",
                date: "2026-10-07",
                status: "OPEN",
            });
        }
    );
});


describe("CloudLost browse items", () => {

    beforeEach(() => {
        jest.clearAllMocks();

        global.fetch = jest.fn().mockResolvedValue({
            ok: true,

            json: jest.fn().mockResolvedValue({
                items: [
                    {
                        itemId: "123",
                        type: "lost",
                        itemName:
                            "Black Backpack",
                        category: "bags",
                        description:
                            "Black backpack with laptop sleeve",
                        location: "Campus",
                        date: "2026-10-07",
                        status: "OPEN",
                    },
                ],
            }),
        });

        window.fetch = global.fetch;
    });


    afterEach(() => {
        delete global.fetch;
        delete window.fetch;

        document.body.innerHTML = "";
    });


    test(
        "displays items returned by the CloudLost API",
        async () => {

            loadBrowsePage();

            await new Promise(
                (resolve) =>
                    setTimeout(resolve, 0)
            );

            expect(fetch)
                .toHaveBeenCalledWith(API_URL);

            const itemsGrid =
                document.getElementById(
                    "items-grid"
                );

            expect(
                itemsGrid.textContent
            ).toContain("Black Backpack");
        }
    );
});