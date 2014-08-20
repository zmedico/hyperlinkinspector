
module.exports.update = function(libInfo, callback) {
	var crypto = require('crypto');
	var fs = require('fs');
	var http = require('http');
	var https = require('https');
	var hash = crypto.createHash('md5');
	var chunks = [];
	var size = 0;
	var proto;
	if (libInfo.remoteSrc.indexOf("https") === 0)
		proto = https;
	else
		proto = http;
	console.log("request: " + libInfo.remoteSrc);
	var req = proto.request(libInfo.remoteSrc, function(res) {
		res.on('data', function(chunk) {
			//console.log("chunk type: " + typeof chunk);
			size += chunk.length;
			chunks.push(chunk);
			hash.update(chunk);
		});
		res.on('end', function() {
			var hexDigest = hash.digest("hex");
			var lastModified = "",
				t;
			if ("last-modified" in res.headers) {
				t = new Date(Date.parse(res.headers["last-modified"]));
				lastModified = " last-modified: " +
					res.headers["last-modified"] +
					" " + t.getTime();
			}
			if (hexDigest == libInfo.localMd5) {
				console.log("unchanged: " + libInfo.localPath + lastModified);
				callback();
			} else {
				console.log("updated: " + libInfo.localPath + lastModified);
				var buf;
				if (chunks.length == 1)
					buf = chunks[0];
				else
					buf = Buffer.concat(chunks, size);
				fs.writeFile(libInfo.localPath, buf, {
					encoding: 'binary'
				}, function(err) {
					if (err)
						callback(err);
					else {
						if ("last-modified" in res.headers) {
							fs.utimes(libInfo.localPath, t, t, function() {
								callback();
							});
						} else
							callback();
					}
				});
			}
		});
	});
	req.on('error', function(e) {
		console.log('problem with request: ' + e.message);
		callback(e);
	});
	req.end();
};
