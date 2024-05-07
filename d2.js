const { chromium } = require("playwright");

(async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage();
	// Navigate to the webpage
	await page.goto(
		"https://www.google.com/maps/place/Divine+Lillies+Mont.+School/@5.5650861,-0.3370241,16z/data=!4m6!3m5!1s0xfdfbd4dd48c8f4d:0x35d44e895ecb58ca!8m2!3d5.559016!4d-0.3308922!16s%2Fg%2F11r27ksm7h?entry=ttu"
	,{timeout:100000});
	await page.waitForSelector('[jstcache="3"]');

	// Name
	const nameElement = await page.$(
		"xpath=/html/body/div[2]/div[3]/div[8]/div[9]/div/div/div[1]/div[2]/div/div[1]/div/div/div[2]/div/div[1]/div[1]/h1"
	);
	const name = await page.evaluate(
		(element) => element.textContent,
		nameElement
	);

	// Rating
	const ratingElement = await page.$(
		"xpath=/html/body/div[2]/div[3]/div[8]/div[9]/div/div/div[1]/div[2]/div/div[1]/div/div/div[2]/div/div[1]/div[2]/div/div[1]/div[2]/span[1]/span[1]"
	);
	const rating = await page.evaluate(
		(element) => element.textContent,
		ratingElement
	);

	// Category
	const categoryElement = await page.$(
		"xpath=/html/body/div[2]/div[3]/div[8]/div[9]/div/div/div[1]/div[2]/div/div[1]/div/div/div[2]/div/div[1]/div[2]/div/div[2]/span/span/button"
	);
	let category = "";
	if (categoryElement) {
		category = await page.evaluate(
			(element) => element.textContent,
			categoryElement
		);
	}

	// Reviews
	const reviewsElement = await page.$(
		"xpath=/html/body/div[2]/div[3]/div[8]/div[9]/div/div/div[1]/div[2]/div/div[1]/div/div/div[2]/div/div[1]/div[2]/div/div[1]/div[2]/span[2]/span/span"
	);
	let reviews = await page.evaluate(
		(element) => element.textContent,
		reviewsElement
	);
	reviews = reviews.replace(/[()]/g, "");

	// Address
	const addressElement = await page.$('button[data-tooltip="Copy address"]');
	const address = await page.evaluate(
		(element) => element.textContent,
		addressElement
	);

	// Website
	const websiteElement =
		(await page.$('a[data-tooltip="Open website"]')) ||
		(await page.$('a[data-tooltip="Open menu link"]'));
	let website = "";
	if (websiteElement) {
		website = await page.evaluate(
			(element) => element.getAttribute("href"),
			websiteElement
		);
	}

	// Phone
	let phone = "";
	const phoneElement = await page.$('button[data-tooltip="Copy phone number"]');
	if (phoneElement) {
		phone = await page.evaluate((element) => element.textContent, phoneElement);
	}

	console.log(
		`Found Name: ${name}, Rating: ${rating}, Category: ${category}, Reviews: ${reviews}, Address: ${address}, Website: ${website}, Phone: ${phone}`
	);

	await browser.close();
})();
