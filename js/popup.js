require(['simulateClick', 'vkbeautify'],
    function(simulateClick, vkbeautify) {
        'use strict';

        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, function(tabs) {
            var uris = [];
            var tableRows = [];
            var uniqueUrls = {};
            var selectAllCheckbox = null;
            var port = chrome.tabs.connect(tabs[0].id);
            port.postMessage({
                command: "requestLinks"
            });

			var rowCheckboxOnchange = function(uriData) {
				uriData.selected = this.checked;
				if (!this.checked)
					selectAllCheckbox.checked = false;
			};

			var createRow = function(uriData) {
				var checkbox, tr, td;
				tr = document.createElement("tr");
				tr.setAttribute("class", "tableRow");

				td = document.createElement("td");
				td.setAttribute("class", "tableCell");
				checkbox = document.createElement("input");
				checkbox.setAttribute("type", "checkbox");
				checkbox.checked = uriData.selected;
				checkbox.onchange = rowCheckboxOnchange.bind(
					checkbox, uriData);
				td.appendChild(checkbox);
				tr.appendChild(td);

				td = document.createElement("td");
				td.setAttribute("class", "tableCell");
				td.textContent = uriData.uri;
				tr.appendChild(td);
				return {
					checkbox: checkbox,
					rowElement: tr,
					data: uriData
				};
			};

            port.onMessage.addListener(function getResp(response) {
                if (response !== null) {
                    var row, tbody = document.getElementById("output"),
                        uri, uriData;
                    for (var i = 0; i < response.length; i++) {
                        uri = response[i];
                        if (!uniqueUrls.hasOwnProperty(uri)) {
                            uniqueUrls[uri] = true;
                            uriData = {selected: true, uri: uri};
                            uris.push(uriData);
                            row = createRow(uriData);
                            tableRows.push(row);
                            tbody.appendChild(row.rowElement);
                        }
                    }
                }
            });

            // http://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
            function escapeRegExp(str) {
                return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
            }

            var connectActionListeners = function() {

                var copyButton = document.getElementById("copyButton");
                copyButton.onclick = function() {
					var selected = [];
					for (var i = 0; i < tableRows.length; i++) {
						if (tableRows[i].checkbox.checked)
							selected.push(tableRows[i].data.uri);
					}
					if (selected.length > 1)
						selected.push("");
					var textarea = document.createElement("textarea");
					textarea.textContent = selected.join("\n");
					document.body.appendChild(textarea);
					textarea.select();
					document.execCommand("copy");
					document.body.removeChild(textarea);
                };

                var saveButton = document.getElementById("saveButton");
                saveButton.onclick = function() {
                    var URL = window.webkitURL || window.URL;
                    var Blob = window.Blob;
                    var BlobBuilder = window.BlobBuilder ||
                        window.WebKitBlobBuilder ||
                        window.MozBlobBuilder ||
                        window.MSBlobBuilder;

                    if ((Blob || BlobBuilder) && URL) {
                        var doc = document.implementation.createDocument(null, 'xbel', null);
                        doc.documentElement.setAttribute("version", "1.0");
                        var bookmark, parent = doc.documentElement;
                        for (var i = 0; i < tableRows.length; i++) {
                            bookmark = doc.createElement("bookmark");
                            bookmark.setAttribute("href", tableRows[i].data.uri);
                            parent.appendChild(bookmark);
                        }
                        var content = new XMLSerializer().serializeToString(doc);
                        content = vkbeautify.xml(content, "\t");
                        content = '<?xml version="1.0" encoding="UTF-8"?>\n' +
                            content + '\n';
                        var mimeType = "application/xbel+xml";
                        var blob = null;
                        if (Blob)
                            blob = new Blob([content], {
                                type: mimeType
                            });
                        else {
                            var bb = new BlobBuilder();
                            bb.append(content);
                            blob = bb.getBlob(mimeType);
                        }

                        var a = document.createElement("a");
                        a.download = "links.xbel";
                        a.href = URL.createObjectURL(blob);
                        simulateClick(a);
                        setTimeout(
                            function() {
                                URL.revokeObjectURL(a.href);
                            },
                            1500);
                    }
                };

                var exportButton = document.getElementById("exportButton");
                exportButton.onclick = function() {
					var extensionOrigin = /.*\/\/[^\/]*\//.exec(document.baseURI)[0];
					var chromeExtensionId = /.*\/\/([^\/]*)\//.exec(document.baseURI)[1];

					var selected = [];
					for (var i = 0; i < tableRows.length; i++) {
						if (tableRows[i].checkbox.checked)
							selected.push(tableRows[i].data.uri);
					}

					chrome.runtime.sendMessage(chromeExtensionId, {command: "exportLinks", data: selected}, function(response) {
						console.log("sendMessage response: " + JSON.stringify(response));
					});
                };

				selectAllCheckbox = document.getElementById("selectAllCheckbox");
				selectAllCheckbox.onchange = function () {
					var checked = selectAllCheckbox.checked;
					for (var i = 0; i < tableRows.length; i++) {
						tableRows[i].checkbox.checked = checked;
						tableRows[i].data.selected = checked;
					}
				};

				var renderLinkTable = function() {
					var checkbox, i, matcher = null, row, tr, td;
					if (filterTextField.value.length > 0) {
						var pattern = filterTextField.value.replace(/\s+/g, "");
						// Derived from codereview.stackexchange.com/a/23905
						var regex = new RegExp(pattern.split("").reduce(function(a,b){
							return a + '[^' + b + ']{0,2}' + b;
						}), "i");
						var index = {};
						for (i = 0; i < uris.length; i++)
							if (regex.test(uris[i].uri))
								index[uris[i].uri] = true;
						matcher = function(s) {
							return s in index;
						};
					}
					var tbody = document.getElementById("output");
					while (tbody.lastChild !== null)
						tbody.removeChild(tbody.lastChild);
					tableRows = [];
					var allSelected = true;
					for (i = 0; i < uris.length; i++) {
						if (matcher !== null && !matcher(uris[i].uri))
							continue;
						row = createRow(uris[i]);
						if (!row.data.selected)
							allSelected = false;
						tableRows.push(row);
						tbody.appendChild(row.rowElement);
					}

					selectAllCheckbox.checked = allSelected;
				};

				var filterInputTimeout = null;
                var filterTextField = document.getElementById("filterTextField");
                filterTextField.addEventListener('keypress', function(event) {
                    if (event.keyCode == 13 && !filterTextField.disabled) {
						if (filterInputTimeout !== null) {
							clearTimeout(filterInputTimeout);
						}
						renderLinkTable();
                    }
                });

                filterTextField.addEventListener('input', function(event) {
					if (filterInputTimeout !== null) {
						clearTimeout(filterInputTimeout);
					}
					filterInputTimeout = setTimeout(function() {
						renderLinkTable();
					}, 1000);
                });

				filterTextField.focus();

				// For smaller screen sizes, adjust popup size to fit
				if (window.screen.availHeight < 768) {
					var newHeight = window.screen.availHeight - 250;
					document.getElementById("linksScrollbox").style.setProperty("max-height", newHeight + "px");
				}

				if (window.screen.availWidth < 1024) {
					var remainingWidth = window.screen.availWidth -
						window.outerWidth;
					if (window.screenX > 0)
						remainingWidth -= window.screenX;
					remainingWidth -= 100;
					document.body.style.removeProperty("min-width");
					document.body.style.setProperty("max-width",
						remainingWidth + "px");
				}

            };

            if (document.readyState == "complete")
                connectActionListeners();
            else {
                var listener;
                document.addEventListener("readystatechange",
                    listener = (function(e) {
                        if (document.readyState == "complete") {
                            document.removeEventListener(
                                "readystatechange", listener);
                            connectActionListeners();
                        }
                    })
                );
            }

        });
    });
