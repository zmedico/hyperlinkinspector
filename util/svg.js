module.exports.getSize = function(inputFile, callback) {
	var fs = require('fs');
	var DOMParser = require('xmldom').DOMParser;
	fs.readFile(inputFile, {encoding: 'utf8'}, function (err, data) {
		if (err)
			callback(err, data);
		else {
			var doc = new DOMParser().parseFromString(
				data, "application/xml");
			var width = doc.documentElement.getAttribute("width");
			var height = doc.documentElement.getAttribute("height");
			callback(err, {
				width: width === null ? null : parseInt(width), 
				height: height === null ? null : parseInt(height)
			});
		}
	});
};

module.exports.renderPng = function(srcFile, destFile, options, callback) {
	var svg2png = require('svg2png');
	module.exports.getSize(srcFile, function(err, size) {
		if (options.hasOwnProperty("destSize"))
			scale = options.destSize / size.width;
		else
			scale = 1;
		svg2png(srcFile, destFile, scale, callback);
	});
};
