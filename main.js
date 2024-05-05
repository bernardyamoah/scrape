const { chromium } = require("playwright");
const credentials = require("./credentials/credentials.json");
const { google } = require("googleapis");
const fs = require("fs");
(async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage();
	console.time("Execution Time");
	const auth = new google.auth.JWT(
		credentials.client_email,
		null,
		credentials.private_key,
		["https://www.googleapis.com/auth/spreadsheets"]
	);
	let url =
		"https://www.google.com/maps/search/pizza/@5.5849164,-0.2751148,13z/data=!3m1!4b1?entry=ttu";

	// Navigate to the webpage
	await page.goto(url, { timeout: 60000 }); // Set timeout to 60 seconds

	// Wait for the element you want to extract text from to appear
	await page.waitForSelector('[jstcache="3"]');

	const scrollable = await page.$(
		"xpath=/html/body/div[2]/div[3]/div[8]/div[9]/div/div/div[1]/div[2]/div/div[1]/div/div/div[1]/div[1]"
	);
	if (!scrollable) {
		console.log("Scrollable element not found.");
		await browser.close();
		return;
	}
	let endOfList = false;
	while (!endOfList) {
		await scrollable.evaluate((node) => node.scrollBy(0, 300));
		endOfList = await page.evaluate(() =>
			document.body.innerText.includes("You've reached the end of the list")
		);
	}
	const urls = await page.$$eval("a", (links) => {
		return links
			.map((link) => link.href)
			.filter((href) => href.startsWith("https://www.google.com/maps/place/"));
	});
	console.log(`Found ${urls.length} results.`);

	const scrapePageData = async (url) => {
		const newPage = await browser.newPage();
		await newPage.goto(url, { timeout: 60000 });
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
	await saveToGoogleSheets(results);
	console.timeEnd("Execution Time");

	await browser.close();
})();
