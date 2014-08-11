
require(['LinkInspectorConfig', 'LinkInspectorConstants'],
	function(LinkInspectorConfig, LinkInspectorConstants) {

	var CHROME_EXTENSION_ID = /.*\/\/([^\/]*)\//.exec(document.baseURI)[1];
	var currentRequest = null;
	var helperWindow = null;
	var config = new LinkInspectorConfig("LinkInspector");

	chrome.runtime.onMessage.addListener(
		function(request, sender, sendResponse) {
		console.log("onMessage request: " + JSON.stringify(request));
		console.log(sender.tab ?
					"from a content script:" + sender.tab.url :
					"from the extension");

		if (request.command == "exportLinks") {
			currentRequest = request;
			helperWindow = window.open(
				LinkInspectorConstants.WEBINTENTS_POPUP_LAUNCHER_ORIGIN +
				'/git/layout/webintents_popup_launcher.html' +
				"#chrome-extension-id=" + CHROME_EXTENSION_ID,
				"LinkInspectorIntentLauncher");
		}
	});

	chrome.runtime.onConnectExternal.addListener(function(port) {
		console.log("onConnectExternal request: " + JSON.stringify(port));
		var connectionOrigin = /(^.*\/\/[^\/]*)\//.exec(port.sender.url)[1];
		if (connectionOrigin != LinkInspectorConstants.WEBINTENTS_POPUP_LAUNCHER_ORIGIN)
			return;

		port.onMessage.addListener(function(msg) {
			console.log("onMessage: " + JSON.stringify(msg));
			if (msg.command == "getWebintentHelperConfig") {
				port.postMessage({
					command: "getWebintentHelperConfigReply",
					data: {
						items: [
							{
								key: "IntentHelperAutoClose",
								value: config.getBoolean(
									"IntentHelperAutoClose", false),
								type: "boolean",
								desc: "Auto-close webintents popup launcher page",
								longDesc: "Automatically close this page after the webintents popup has been launched. NOTE: Popups from this page must be accepted prior to enabling this."
							}
						],
						version: 1
					},
				});
			}
			else if (msg.command == "setIntentHelperConfigItem") {
				if (msg.data.type == "boolean")
					config.setBoolean(msg.data.key, msg.data.value);
			}
		});

		var temp = currentRequest;
		currentRequest = null;
		port.postMessage(temp);
	});

});
