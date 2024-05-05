const credentials = require("./credentials/credentials.json");
const { google } = require("googleapis");
async function saveToGoogleSheets(data) {
	const auth = new google.auth.JWT(
		credentials.client_email,
		null,
		credentials.private_key,
		["https://www.googleapis.com/auth/spreadsheets"]
	);

	try {
		// Authorize the client
		await auth.authorize();

		// Initialize the Google Sheets API client
		const sheets = google.sheets({ version: "v4", auth });

		// Specify the spreadsheet ID
		const spreadsheetId = "1_bU2KFngOvH_R0u63F2n4F57ZZKPcrimSeowkRpEoB0";

		// Write data to the spreadsheet
		const range = "Sheet1!A1:F1"; // Specify the range where you want to write the data
		const values = data.map((result) => [
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

		const response = await sheets.spreadsheets.values.update({
			spreadsheetId,
			range,
			valueInputOption: "RAW",
			resource,
		});

		return `${response.data.updatedCells} cells updated.`;
	} catch (error) {
		console.error("Authorization failed:", error);
	}
}
export default saveToGoogleSheets;
