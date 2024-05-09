const { chromium } = require("playwright");
const fs = require("fs");
const credentials = require("./credentials/credentials.json");
const { google } = require("googleapis");
var IPGeolocationAPI = require("ip-geolocation-api-javascript-sdk");

(async () => {
	// User search term
	term = "University";
	nameSheet = `${term}.csv`;
	try {
		console.time("Execution Time");
		var ipgeolocationApi = new IPGeolocationAPI(
			"16384525d83942168016b11f57f495d6",
			false
		);
		const spreadsheetId = "1_bU2KFngOvH_R0u63F2n4F57ZZKPcrimSeowkRpEoB0";

		// Fetch geolocation data
		const geolocationData = await new Promise((resolve, reject) => {
			ipgeolocationApi.getGeolocation((json) => {
				resolve(json);
			});
		});

		const {
			latitude,
			longitude,
			ip,
			country_name,
			isp,
			country_flag,
			city,
			time_zone,
		} = geolocationData;

		let googleUrl = `https://www.google.com/maps/search/${term}/@${latitude},${longitude},12z/data=!3m1!4b1?authuser=0&hl=en&entry=ttu`;

		const browser = await chromium.launch({ headless: true });
		const page = await browser.newPage();
		await page.goto(googleUrl, { timeout: 49600000 });
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
		const userInfo = [
			["IP", "Country", "City", "ISP", "Country Flag", "Time Zone"],
			[ip, country_name, city, isp, country_flag, time_zone.current_time],
		];
		const sheets = google.sheets({ version: "v4", auth });
		// Create a new sheet with the generated sheet name
		await auth.authorize();

		await sheets.spreadsheets.values.update({
			spreadsheetId,
			range: "Sheet1!A1:F2",
			valueInputOption: "RAW",
			resource: {
				values: userInfo,
			},
		});

		// let endOfList = false;
		// while (!endOfList) {
		// 	await scrollable.evaluate((node) => node.scrollBy(0, 100));
		// 	endOfList = await page.evaluate(() =>
		// 		document.body.innerText.includes("You've reached the end of the list")
		// 	);
		// }

		// Scrolling
		let scrollCount = 0;
		let endOfList = false;
		while (!endOfList) {
			await scrollable.evaluate((node) => node.scrollBy(0, 100));
			endOfList = await page.evaluate(() =>
				document.body.innerText.includes("You've reached the end of the list")
			);
			console.log(`Scrolled ${scrollCount}`);
			scrollCount++;
		}
		const urls = await page.$$eval("a", (links) =>
			links
				.map((link) => link.href)
				.filter((href) => href.startsWith("https://www.google.com/maps/place/"))
		);
		const scrapePageData = async (url) => {
			const newPage = await browser.newPage();
			await newPage.goto(url, { timeout: 960000 });
			await newPage.waitForSelector('[jstcache="3"]');
			const nameElement = await newPage.$(
				"xpath=/html/body/div[2]/div[3]/div[8]/div[9]/div/div/div[1]/div[2]/div/div[1]/div/div/div[2]/div/div[1]/div[1]/h1"
			);
			let name = nameElement
				? await newPage.evaluate((element) => element.textContent, nameElement)
				: "";
			name = `${name}`;
			const ratingElement = await newPage.$(
				"xpath=/html/body/div[2]/div[3]/div[8]/div[9]/div/div/div[1]/div[2]/div/div[1]/div/div/div[2]/div/div[1]/div[2]/div/div[1]/div[2]/span[1]/span[1]"
			);
			let rating = ratingElement
				? await newPage.evaluate(
						(element) => element.textContent,
						ratingElement
				  )
				: "";
			rating = Math.round(parseFloat(rating));
			rating = `${rating}`;
			const reviewsElement = await newPage.$(
				"xpath=/html/body/div[2]/div[3]/div[8]/div[9]/div/div/div[1]/div[2]/div/div[1]/div/div/div[2]/div/div[1]/div[2]/div/div[1]/div[2]/span[2]/span/span"
			);
			let reviews = reviewsElement
				? await newPage.evaluate(
						(element) => element.textContent,
						reviewsElement
				  )
				: "";
			reviews = reviews.replace(/\(|\)/g, "");
			reviews = `${reviews}`;
			const categoryElement = await newPage.$(
				"xpath=/html/body/div[2]/div[3]/div[8]/div[9]/div/div/div[1]/div[2]/div/div[1]/div/div/div[2]/div/div[1]/div[2]/div/div[2]/span/span/button"
			);
			let category = categoryElement
				? await newPage.evaluate(
						(element) => element.textContent,
						categoryElement
				  )
				: "";
			category = `${category}`;
			const addressElement = await newPage.$(
				'button[data-tooltip="Copy address"]'
			);
			let address = addressElement
				? await newPage.evaluate(
						(element) => element.textContent,
						addressElement
				  )
				: "";
			address = `${address}`;
			const websiteElement =
				(await newPage.$('a[data-tooltip="Open website"]')) ||
				(await newPage.$('a[data-tooltip="Open menu link"]'));
			let website = websiteElement
				? await newPage.evaluate(
						(element) => element.getAttribute("href"),
						websiteElement
				  )
				: "";
			website = `${website}`;
			const phoneElement = await newPage.$(
				'button[data-tooltip="Copy phone number"]'
			);
			let phone = phoneElement
				? await newPage.evaluate((element) => element.textContent, phoneElement)
				: "";
			phone = phone.replace(/[()]/g, "");
			phone = `${phone}`;
			url = `${url}`;
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
		const csvHeader =
			"Name,Rating,Reviews,Category,Address,Website,Phone,Url\n";
		const csvRows = results
			.map(
				(r) =>
					`${r.name},${r.rating},${r.reviews},${r.category},${r.address},${r.website},${r.phone},${r.url}`
			)
			.join("\n");
		fs.writeFileSync(nameSheet, csvHeader + csvRows);

		try {
			await auth.authorize();

			// Initialize the Google Sheets API client
			const sheets = google.sheets({ version: "v4", auth });
			// Write data to the spreadsheet
			const range = "Sheet1!A4"; // Specify the range where you want to write the data
			const values = [
				[
					"Name",
					"Rating",
					"Reviews",
					"Category",
					"Address",
					"Website",
					"Phone",
					"Url",
				], // Column keys
				...results.map((result) => [
					result.name,
					result.rating,
					result.reviews,
					result.category,
					result.address,
					result.website,
					result.phone,
					result.url,
				]),
			];

			const resource = {
				values,
			};

			sheets.spreadsheets.values.update({
				spreadsheetId,
				range,
				valueInputOption: "RAW",
				resource,
			});

			console.log(`Updated cells `);
			console.timeEnd("Execution Time");
		} catch (error) {
			console.error("Authorization failed:", error);
		}

		// Close the browser
		await browser.close();
	} catch (error) {
		console.log("Error:", error);
	}
})();
