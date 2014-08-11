module.exports = function(grunt) {

    var child_process = require('child_process');
    var fs = require('fs');
    var path = require('path');

    var outputDir = grunt.option('output') || process.cwd();
    var buildDir = path.join(outputDir, "build");
    var distDir = path.join(outputDir, "dist");
    var crxTempDir = path.join(buildDir, "crx");
    var iconTempDir = path.join(buildDir, "icons");
    var crxIconDir = path.join(crxTempDir, "icons");

	var dateString = (function(date) {

		var ljust = function(s, length, char) {
			var fill = [];
			while ( fill.length + s.length < length ) {
				fill[fill.length] = char;
			}
			return fill.join('') + s;
		};

		var year = date.getUTCFullYear().toString();
		var month = ljust(
			(date.getUTCMonth() + 1).toString(), 2, "0");
		var day  = ljust(date.getUTCDate().toString(), 2, "0");
		var hour = ljust(date.getUTCHours().toString(), 2, "0");
		var minute = ljust(date.getUTCMinutes().toString(), 2, "0");
		return year + '-' + month + day +
			'-' + hour +  minute;
	})(new Date());

	var promoImages = [{
        srcFile: path.join(process.cwd(), "icons", "promotional_440x280.svg"),
        destFile: path.join(iconTempDir, 'promotional_440x280.png'),
        destSize: 440
	},{
        srcFile: path.join(process.cwd(), "icons", "promotional_920x680.svg"),
        destFile: path.join(iconTempDir, 'promotional_920x680.png'),
        destSize: 920
	},{
        srcFile: path.join(process.cwd(), "icons", "promotional_1400x560.svg"),
        destFile: path.join(iconTempDir, 'promotional_1400x560.png'),
        destSize: 1400
	}
	];

    var installIcons = [{
        name: 'Chain_no_border',
        destSize: 19
    }, {
        name: 'Copy_font_awesome',
        destSize: 32
    }, {
		name: 'High-contrast-filter',
		destSize: 16
	}, {
        name: 'LinkInspector',
        destSize: 128
    }, {
        name: 'LinkInspector',
        destSize: 48
    }, {
        name: 'LinkInspector',
        destSize: 32
    }, {
        name: 'LinkInspector',
        destSize: 19
    }, {
        name: 'LinkInspector',
        destSize: 16
    }, {
        name: 'Save_font_awesome',
        destSize: 32
    }, {
        name: 'Share_alt_font_awesome',
        destSize: 32
    }];

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        clean: {
            options: {
                force: true
            },
            build: [buildDir],
            dist: [distDir]
        },
        jshint: {
            // define the files to lint
            files: [
                'Gruntfile.js',
                'js/eventPage.js',
                'js/page.js',
                'js/popup.js',
                'js/require.js',
                'js/simulateClick.js',
                'util/convertPngToIco.js',
                'util/svg.js'
            ],
            // configure JSHint (documented at http://www.jshint.com/docs/)
            options: {
                // more options here if you want to override JSHint defaults
            }
        },
        validation: {
            options: {
                stoponerror: false,
                reportpath: false,
                path: path.join(buildDir, "validation-status.json"),
                relaxerror: ["Bad value true for attribute async on element script."]
            },
            files: {
                src: [
                    'layout/popup.html',
                    'layout/webintents_popup_launcher.html'
                ]
            }
        },
        sync: {
			crx_favicons: {
                files: [{
                    cwd: iconTempDir,
                    src: [
                        'favicon.ico'
                    ],
                    dest: crxIconDir,
                }],
                verbose: true // Display log messages when copying files
			},
            crx_static: {
                files: [{
                    cwd: process.cwd(),
                    src: [
                        '**', /* Include everything */
                        '!.git/**', /* but exclude .git */
                        '!node_modules/**',
                        '!icons/*.png',
                        '!icons/favicon.ico' /* regenerate these from svg */
                    ],
                    dest: crxTempDir,
                }],
                verbose: true // Display log messages when copying files
            },
            crx_pngs: {
                files: [{
                    cwd: iconTempDir,
                    src: [
                        '*.png'
                    ],
                    dest: path.join(crxTempDir, 'icons'),
                }],
                verbose: true // Display log messages when copying files
            }
        },
        compress: {
            snapshot: {
                options: {
                    archive: path.join(distDir,
						"LinkInspector-" + dateString + ".zip")
                },
                files: [{
                    cwd: process.cwd(),
                    src: [
                        '**', /* Include everything */
                        '!.git/**', /* but exclude .git */
                        '!node_modules/**'
                    ],
                    dest: '',
                }],
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-html-validation');
    grunt.loadNpmTasks('grunt-sync');

    // Default task(s).
    grunt.registerTask('lint', ['jshint', 'validation']);

    grunt.registerTask('crx-chrome-command', 'Generate a crx.', function() {
        var done = this.async();
        var child = grunt.util.spawn({
            cmd: "google-chrome",
            args: [
                "--no-message-box",
                "--pack-extension=" + crxTempDir,
                "--pack-extension-key=" +
                path.join(path.dirname(process.cwd()), "LinkInspector.pem")
            ]
        }, function(error, result, code) {
            if (error === null && result.code === 0) {
                grunt.file.mkdir(distDir);
                fs.rename(path.join(path.dirname(crxTempDir),
                        path.basename(crxTempDir) + ".crx"),
                    path.join(distDir, "LinkInspector-" + dateString + ".crx"));
            }
            done(error);
        });
        child.stdout.pipe(process.stdout);
        child.stderr.pipe(process.stderr);
    });

    grunt.registerTask('generate-crx-pngs', 'Generate pngs from svgs.', function() {
        var done = this.async();
        var svg = require('./util/svg');
        var i = 0;
        var scale;
        var iconInfo;
        var convertUntilDone = function() {
            if (i == installIcons.length)
                done();
            else {
                iconInfo = installIcons[i++];
                svg.renderPng(
					path.join(process.cwd(), "icons", iconInfo.name) + ".svg",
					path.join(iconTempDir, iconInfo.name) + "_" + iconInfo.destSize + ".png",
					iconInfo,
					function(err) {
						if (err !== null) {
							done(err);
						} else
						// call asynchronously, avoiding recursion
							setTimeout(convertUntilDone, 0);
				});
            }
        };
        convertUntilDone();
    });

    grunt.registerTask('generate-promo-images', 'Generate pngs from svgs.', function() {
        var done = this.async();
        var svg = require('./util/svg');
        var i = 0;
        var imageInfo;
        var convertUntilDone = function() {
            if (i == promoImages.length)
                done();
            else {
                imageInfo = promoImages[i++];
                svg.renderPng(imageInfo.srcFile,
					imageInfo.destFile,
					imageInfo,
					function(err) {
						if (err !== null) {
							done(err);
						} else
						// call asynchronously, avoiding recursion
							setTimeout(convertUntilDone, 0);
				});
            }
        };
        convertUntilDone();
    });

	grunt.registerTask('generate-favicon', 'Generate favicon.ico from png', function () {
		var done = this.async();
		var inputFile = path.join(iconTempDir, "LinkInspector_32.png");
		var outputFile = path.join(iconTempDir, "favicon.ico");
		var convertPngToIco = require('./util/convertPngToIco');
		convertPngToIco.convertFile(inputFile, outputFile, function(err) {
			done(err);
		});
	});

    grunt.registerTask('crx', ['icons', 'sync:crx_pngs', 'sync:crx_favicons', 'sync:crx_static', 'crx-chrome-command']);
    grunt.registerTask('snapshot', ['compress:snapshot']);
    grunt.registerTask('icons', ['generate-crx-pngs', 'generate-favicon']);
    grunt.registerTask('promo-images', ['generate-promo-images']);
};
