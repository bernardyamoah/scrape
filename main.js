var IPGeolocationAPI = require("ip-geolocation-api-javascript-sdk");
var ipgeolocationApi = new IPGeolocationAPI(
	"16384525d83942168016b11f57f495d6",
	false
);
function handleResponse(json) {
	console.log(json);
}
ipgeolocationApi.getGeolocation(handleResponse);
