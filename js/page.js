(function() {
	'use strict';

    var intentQueue = [];

    chrome.runtime.onConnect.addListener(function(port) {
        var NODE_BATCH_SIZE = 20;
        var base = /(.*)\//.exec(document.baseURI)[1];
        var origin = /(^.*\/\/[^\/]*)\//.exec(document.baseURI)[1];
        var nodeStack = [];
        var popupPort = null;
        var messageBuffer = [];
        var processStackTimeout = null;

        var visitNode = function(node) {
            var attrs = node.attributes;
            var match, url;
            for (var i = 0; i < attrs.length; i++) {
                match = /^[a-zA-Z]+:\/\//.exec(attrs[i].value);
                if (match !== null)
                    messageBuffer.push(attrs[i].value);
                else if (attrs[i].value.length > 0 &&
					(attrs[i].name == "src" ||
                    attrs[i].name == "href")) {
					if (attrs[i].value[0] == "/")
						url = origin + attrs[i].value;
					else
						url = base + "/" +
							/^\/*(.*)/.exec(attrs[i].value)[1];
                    messageBuffer.push(url);
                }
            }
        };

        var processStack = function() {
            var currentNode, i, j, messageStack = [];
            for (i = 0;
                (i < NODE_BATCH_SIZE) && (nodeStack.length !== 0); i++) {
                currentNode = nodeStack.pop();
                visitNode(currentNode);
                /* Add in reverse order so that pop calls return the nodes
			in their original order.
			*/
                for (j = currentNode.children.length - 1; j >= 0; j--)
                    nodeStack.push(currentNode.children[j]);
            }

            if (messageBuffer.length !== 0) {
                popupPort.postMessage(messageBuffer);
                messageBuffer = [];
            }

            if (nodeStack.length === 0) {
                processStackTimeout = null;
                popupPort.postMessage(null);
            } else
                processStackTimeout = setTimeout(processStack, 0);
        };

        port.onMessage.addListener(function(msg) {
            console.log("page.js: onConnect");

			if (msg.command == "requestLinks") {
				popupPort = port;
				nodeStack.push(document.documentElement);
				if (processStackTimeout !== null)
					clearTimeout(processStackTimeout);
				processStackTimeout = setTimeout(processStack, 0);
			}
        });
    });

})();
