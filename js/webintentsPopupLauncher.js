(function() {
	var port = null;
	var urlFragmentParams;
	var config = null;

	var parseUrlFragmentParams = function () {
		var match,
			pl = /\+/g, // Regex for replacing addition symbol with a space
			search = /([^&=]+)=?([^&]*)/g,
			decode = function (s) {
				return decodeURIComponent(s.replace(pl, " "));
			},
			query = window.location.hash.substring(1);

		urlFragmentParams = {};
		while ((match = search.exec(query)) !== null)
			urlFragmentParams[decode(match[1])] = decode(match[2]);
	};
	parseUrlFragmentParams();

	var CHROME_EXTENSION_ID = urlFragmentParams['chrome-extension-id'];
	var webintents = document.createElement("script");
	webintents.setAttribute("type", "text/javascript");
	webintents.setAttribute("async", "true");
	webintents.setAttribute("src", "../js/webintents.min.js");
	document.head.appendChild(webintents);

	var onComplete = function() {
		port = chrome.runtime.connect(CHROME_EXTENSION_ID,
			{name: "intentHelper"});

		port.postMessage({
			command: "getWebintentHelperConfig",
			data: null
		});

		port.onMessage.addListener(function(msg) {
			console.log("onMessage: " + JSON.stringify(msg));
			if (msg.command == "exportLinks") {
				var intent = new Intent("http://webintents.org/view", 
					"text/uri-list", msg.data);
				window.navigator.startActivity(intent);
			}
			else if (msg.command == "getWebintentHelperConfigReply") {
				config = msg.data;
				applyConfig();
			}
		});

	};

	var applyConfig = function() {
		var configDiv = document.getElementById("configDiv");
		while (configDiv.lastChild !== null)
			configDiv.removeChild(configDiv.lastChild);
		if (config.version === 1) {
			var i, checkbox, itemDiv;
			var checkBoxOnchange = function(i) {
				config.items[i].value = this.checked;
				port.postMessage({
					command: "setIntentHelperConfigItem",
					data: config.items[i]
				});
			}
			for (i = 0; i < config.items.length; i++) {
				if (config.items[i].key == "IntentHelperAutoClose" &&
					config.items[i].value)
					window.close();
				if (config.items[i].type == "boolean") {
					checkbox = document.createElement("input");
					checkbox.setAttribute("type", "checkbox");
					checkbox.checked = config.items[i].value;
					checkbox.onchange = checkBoxOnchange.bind(
						checkbox, i);
					itemDiv = document.createElement("div");
					itemDiv.appendChild(checkbox);
					itemDiv.appendChild(
						document.createTextNode(config.items[i].longDesc));
					configDiv.appendChild(itemDiv);
				}
			}
		}
		document.getElementById("headerDiv").innerHTML =
			"<h1>Link Inspector Webintents Popup Launcher</h1>";
	}

	if (document.readyState == "complete")
		onComplete();
	else {
		var listener;
		document.addEventListener("readystatechange",
			listener = (function (e) {
				if (document.readyState == "complete") {
					document.removeEventListener(
						"readystatechange", listener);
					onComplete();
				}
			})
		);
	}
})();

