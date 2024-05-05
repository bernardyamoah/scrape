const { chromium } = require("playwright");
const { google } = require("googleapis");
const credentials = require("./credentials/credentials.json");

(async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage();
	const startTime = new Date();
	const auth = new google.auth.JWT(
		credentials.client_email,
		null,
		credentials.private_key,
		["https://www.googleapis.com/auth/spreadsheets"]
	);
	// Navigate to the webpage
	await page.goto(
		"https://www.google.com/maps/search/pizza/@5.5849164,-0.2751148,13z/data=!3m1!4b1?entry=ttu"
	);

	// Wait for the element you want to extract text from to appear
	await page.waitForSelector('[jstcache="3"]');

	// Get the scrollable container
	const scrollable = await page.$(
		"xpath=/html/body/div[2]/div[3]/div[8]/div[9]/div/div/div[1]/div[2]/div/div[1]/div/div/div[1]/div[1]"
	);
	let scrollCount = 0;
	let endOfList = false;

	while (!endOfList) {
		await scrollable.evaluate((node) => {
			node.scrollBy(0, node.scrollHeight);
		});
		scrollCount++;
		console.log("Scrolled");
		await page.waitForTimeout(10000); // Wait for a brief moment after scrolling
		endOfList = await page.evaluate(() => {
			return document
				.querySelector(".section-listbox-next")
				.innerText.includes("You've reached the end of the list");
		});
	}

	console.log("Scrolled to end of list");

	// Extract links from the page
	const urls = await page.$$eval("a", (links) => {
		return links
			.map((link) => link.href)
			.filter((href) => href.startsWith("https://www.google.com/maps/place/"));
	});

	console.log(
		`Found ${urls.length} links. Scrolling took ${
			(new Date() - startTime) / 1000
		} seconds`
	);

	try {
		// Authorize the client
		await auth.authorize();

		// Initialize the Google Sheets API client
		const sheets = google.sheets({ version: "v4", auth });

		// Specify the spreadsheet ID
		const spreadsheetId = "1_bU2KFngOvH_R0u63F2n4F57ZZKPcrimSeowkRpEoB0";

		// Write data to the spreadsheet
		const range = "Sheet1!A1"; // Specify the range where you want to write the data
		const values = urls.map((url) => [url]); // Convert URLs to a 2D array

		const resource = {
			values,
		};

		const response = await sheets.spreadsheets.values.update({
			spreadsheetId,
			range,
			valueInputOption: "RAW",
			resource,
		});

		console.log(`${response.data.updatedCells} cells updated.`);
	} catch (error) {
		console.error("Authorization failed:", error);
	}
	await browser.close();
})();
