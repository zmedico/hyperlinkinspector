require(['LinkInspectorConfig'], function(LinkInspectorConfig) {
	var config = new LinkInspectorConfig("LinkInspector");
	var autoCloseCheckBox = null;
	var onComplete = function() {
		autoCloseCheckBox = document.getElementById("intentHelperAutoCloseCheckbox");
		autoCloseCheckBox.checked = config.getBoolean("IntentHelperAutoClose");
		autoCloseCheckBox.onchange = function() {
			config.setBoolean("IntentHelperAutoClose", autoCloseCheckBox.checked);
		};
	};
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
});
