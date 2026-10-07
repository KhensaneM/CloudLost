/**
 * @jest-environment jsdom
 */

const fs = require("fs");
const path = require("path");

function loadReportPage(url = "/report.html") {
    document.body.innerHTML = `
        <h1 id="report-title">Report an Item</h1>

        <form id="report-form">
            <select id="type">
                <option value="">Select report type</option>
                <option value="lost">Lost Item</option>
                <option value="found">Found Item</option>
            </select>

            <input id="item-name">

            <select id="category">
                <option value="">Select category</option>
                <option value="bags">Bags</option>
            </select>

            <textarea id="description"></textarea>

            <input id="location">

            <input id="date" type="date">

            <button type="submit">Submit Report</button>
        </form>

        <div id="form-message"></div>
    `;

    window.history.pushState({}, "", url);

    const script = fs.readFileSync(
        path.resolve(__dirname, "../js/app.js"),
        "utf8"
    );

    eval(script);

    document.dispatchEvent(new Event("DOMContentLoaded"));
}

describe("CloudLost report form", () => {

    beforeEach(() => {
        document.body.innerHTML = "";
        window.history.pushState({}, "", "/");
    });

    test("selects Lost Item when type=lost is in the URL", () => {
        loadReportPage("/report.html?type=lost");

        expect(
            document.getElementById("type").value
        ).toBe("lost");

        expect(
            document.getElementById("report-title").textContent
        ).toBe("Report a Lost Item");
    });

    test("selects Found Item when type=found is in the URL", () => {
        loadReportPage("/report.html?type=found");

        expect(
            document.getElementById("type").value
        ).toBe("found");

        expect(
            document.getElementById("report-title").textContent
        ).toBe("Report a Found Item");
    });

    test("changes heading when report type changes", () => {
        loadReportPage();

        const type = document.getElementById("type");

        type.value = "lost";
        type.dispatchEvent(new Event("change"));

        expect(
            document.getElementById("report-title").textContent
        ).toBe("Report a Lost Item");

        type.value = "found";
        type.dispatchEvent(new Event("change"));

        expect(
            document.getElementById("report-title").textContent
        ).toBe("Report a Found Item");
    });

    test("prevents normal form submission", () => {
        loadReportPage("/report.html?type=lost");

        document.getElementById("item-name").value =
            "Black Backpack";

        document.getElementById("category").value =
            "bags";

        document.getElementById("description").value =
            "Black backpack with laptop sleeve";

        document.getElementById("location").value =
            "Campus";

        document.getElementById("date").value =
            "2026-10-07";

        const form =
            document.getElementById("report-form");

        const submitEvent = new Event("submit", {
            bubbles: true,
            cancelable: true
        });

        form.dispatchEvent(submitEvent);

        expect(submitEvent.defaultPrevented)
            .toBe(true);

        expect(
            document.getElementById("form-message")
                .textContent
        ).toBe(
            "Report ready! AWS connection will be added next."
        );
    });

});