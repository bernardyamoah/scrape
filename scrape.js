const { chromium } = require("playwright");
const fs = require("fs");
const credentials = require("./credentials/credentials.json");
const { google } = require("googleapis");

(async () => {
    nameSheet = "dentist.csv";
    // Input 
	let googleUrl =
		"https://www.google.com/maps/search/dentist/@36.3671965,-86.5156829,10z/data=!3m1!4b1?authuser=0&hl=en&entry=ttu";
	console.time("Execution Time");
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage();
	await page.goto(googleUrl, { timeout: 100000 });
	await page.waitForSelector('[jstcache="3"]');
	const scrollable = await page.$(
		"xpath=/html/body/div[2]/div[3]/div[8]/div[9]/div/div/div[1]/div[2]/div/div[1]/div/div/div[1]/div[1]"
	);
	const auth = new google.auth.JWT(
		credentials.client_email,
		null,
		credentials.private_key,
		["https://www.googleapis.com/auth/spreadsheets"]
	);
	if (!scrollable) {
		console.log("Scrollable element not found.");
		await browser.close();
		return;
	}
	// let scrollCount = 0;
	// while (scrollCount < 20) {
	// 	await scrollable.evaluate((node) => node.scrollBy(0, 500));
	// 	await page.waitForTimeout(1000); // Wait for 1 second between scrolls
	// 	scrollCount++;
    // }
    let endOfList = false;
	while (!endOfList) {
		await scrollable.evaluate((node) => node.scrollBy(0, 300));
		endOfList = await page.evaluate(() =>
			document.body.innerText.includes("You've reached the end of the list")
		);
	}
	const urls = await page.$$eval("a", (links) =>
		links
			.map((link) => link.href)
			.filter((href) => href.startsWith("https://www.google.com/maps/place/"))
	);
	const scrapePageData = async (url) => {
		const newPage = await browser.newPage();
		await newPage.goto(url, { timeout: 100000 });
		await newPage.waitForSelector('[jstcache="3"]');
		const nameElement = await newPage.$(
			"xpath=/html/body/div[2]/div[3]/div[8]/div[9]/div/div/div[1]/div[2]/div/div[1]/div/div/div[2]/div/div[1]/div[1]/h1"
		);
		let name = nameElement
			? await newPage.evaluate((element) => element.textContent, nameElement)
			: "";
		name = `"${name}"`;
		const ratingElement = await newPage.$(
			"xpath=/html/body/div[2]/div[3]/div[8]/div[9]/div/div/div[1]/div[2]/div/div[1]/div/div/div[2]/div/div[1]/div[2]/div/div[1]/div[2]/span[1]/span[1]"
		);
		let rating = ratingElement
			? await newPage.evaluate((element) => element.textContent, ratingElement)
			: "";
		rating = `"${rating}"`;
		const reviewsElement = await newPage.$(
			"xpath=/html/body/div[2]/div[3]/div[8]/div[9]/div/div/div[1]/div[2]/div/div[1]/div/div/div[2]/div/div[1]/div[2]/div/div[1]/div[2]/span[2]/span/span"
		);
		let reviews = reviewsElement
			? await newPage.evaluate((element) => element.textContent, reviewsElement)
			: "";
		reviews = reviews.replace(/\(|\)/g, "");
		reviews = `"${reviews}"`;
		const categoryElement = await newPage.$(
			"xpath=/html/body/div[2]/div[3]/div[8]/div[9]/div/div/div[1]/div[2]/div/div[1]/div/div/div[2]/div/div[1]/div[2]/div/div[2]/span/span/button"
		);
		let category = categoryElement
			? await newPage.evaluate(
					(element) => element.textContent,
					categoryElement
			  )
			: "";
		category = `"${category}"`;
		const addressElement = await newPage.$(
			'button[data-tooltip="Copy address"]'
		);
		let address = addressElement
			? await newPage.evaluate((element) => element.textContent, addressElement)
			: "";
		address = `"${address}"`;
		const websiteElement =
			(await newPage.$('a[data-tooltip="Open website"]')) ||
			(await newPage.$('a[data-tooltip="Open menu link"]'));
		let website = websiteElement
			? await newPage.evaluate(
					(element) => element.getAttribute("href"),
					websiteElement
			  )
			: "";
		website = `"${website}"`;
		const phoneElement = await newPage.$(
			'button[data-tooltip="Copy phone number"]'
		);
		let phone = phoneElement
			? await newPage.evaluate((element) => element.textContent, phoneElement)
			: "";
		phone = `"${phone}"`;
		url = `"${url}"`;
		await newPage.close();
		return { name, rating, reviews, category, address, website, phone, url };
	};
	const batchSize = 5;
	const results = [];
	for (let i = 0; i < urls.length; i += batchSize) {
		const batchUrls = urls.slice(i, i + batchSize);
		const batchResults = await Promise.all(
			batchUrls.map((url) => scrapePageData(url))
		);
		results.push(...batchResults);
		console.log(`Batch ${i / batchSize + 1} completed.`);
	}
	const csvHeader = "Name,Rating,Reviews,Category,Address,Website,Phone,Url\n";
	const csvRows = results
		.map(
			(r) =>
				`${r.name},${r.rating},${r.reviews},${r.category},${r.address},${r.website},${r.phone},${r.url}`
		)
		.join("\n");
	fs.writeFileSync(nameSheet, csvHeader + csvRows);

	try {
		// Authorize the client
		await auth.authorize();

		// Initialize the Google Sheets API client
		const sheets = google.sheets({ version: "v4", auth });

		// Specify the spreadsheet ID
		const spreadsheetId = "1_bU2KFngOvH_R0u63F2n4F57ZZKPcrimSeowkRpEoB0";

		// Write data to the spreadsheet
		const range = "Sheet1!A1"; // Specify the range where you want to write the data
		const values = results.map((result) => [
			result.name,
			result.rating,
			result.reviews,
			result.category,
			result.address,
			result.website,
			result.phone,
			result.url,
		]);

		const resource = {
			values,
		};

		await sheets.spreadsheets.values.update({
			spreadsheetId,
			range,
			valueInputOption: "RAW",
			resource,
		});

		return `Updated cells `;
	} catch (error) {
		console.error("Authorization failed:", error);
	}
	await browser.close();
	console.timeEnd("Execution Time");
})();
