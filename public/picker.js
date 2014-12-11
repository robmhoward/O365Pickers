
var rows;
var isSearched = false;

function navigateToRedirect(pickedurl) {
	window.location = redirect_uri + "?picked_url=" + pickedurl;
}

var redirect_uri = "http://localhost:8081/";

var Choice = function(title, url, description, logo) {
    this.title = title;
    this.url = url;
    this.description = description;
    this.logo = logo;
    this.onclick = "navigateToRedirect('" + url + "');";
}
 
var viewModel = {
    choices: ko.observableArray()
};

function runSearch() {
	if (isSearched) {
		createChoicesFromRows();
	}
	viewModel.choices.remove(function(item) { return item.title.indexOf(searchBox.value) < 0 });
	isSearched = true;
}

function createChoicesFromRows() {
	viewModel.choices.removeAll();
	for (var i = 0; i < rows.length; i++) {
		viewModel.choices.push(createChoiceFromRow(rows[i]));
	}
}