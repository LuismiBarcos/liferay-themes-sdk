/**
 * © 2017 Liferay, Inc. <https://liferay.com>
 *
 * SPDX-License-Identifier: MIT
 */

const _ = require('lodash');
const fs = require('fs-extra');
const listStream = require('list-stream');
const path = require('path');
const plugins = require('gulp-load-plugins')();

const lfrThemeConfig = require('../lib/liferay_theme_config');
const themeUtil = require('../lib/util');
const WarDeployer = require('../lib/war_deployer');

const themeConfig = lfrThemeConfig.getConfig(true);
const DEPLOYMENT_STRATEGIES = themeUtil.DEPLOYMENT_STRATEGIES;

function registerTasks(options) {
	const {argv, gulp, pathBuild, pathSrc, pathDist} = options;
	const {storage} = gulp;

	const runSequence = require('run-sequence').use(gulp);
	const deploymentStrategy = storage.get('deploymentStrategy');
	const dockerContainerName = storage.get('dockerContainerName');
	const pluginName = storage.get('pluginName') || '';
	const dockerThemePath = path.posix.join('/tmp', pluginName);

	gulp.task('deploy', function(cb) {
		const sequence = ['build', 'deploy:war', cb];

		const webBundleDir = storage.get('webBundleDir');

		if (argv.l || argv.live) {
			sequence.splice(1, 1, 'deploy-live:war');
		} else if (webBundleDir === 'watching') {
			sequence.splice(2, 0, 'watch:teardown');
		}

		runSequence.apply(this, sequence);
	});

	gulp.task('deploy:css-files', () => {
		const srcPath = path.join(pathBuild, 'css/*.css');

		return fastDeploy(srcPath, pathBuild, '*.css');
	});

	gulp.task('deploy:docker', function(cb) {
		const deployPath = storage.get('deployPath');
		const themeName = themeConfig.name;

		themeUtil.dockerCopy(
			dockerContainerName,
			pathDist,
			deployPath,
			[themeName + '.war'],
			function(err, _data) {
				if (err) throw err;

				storage.set('deployed', true);
				cb();
			}
		);
	});

	gulp.task('deploy:file', function() {
		const changedFile = storage.get('changedFile');

		return fastDeploy(changedFile.path, pathSrc);
	});

	gulp.task('deploy:folder', function() {
		const changedFile = storage.get('changedFile');

		const relativeFilePath = path.relative(
			path.join(process.cwd(), pathSrc),
			changedFile.path
		);

		const filePathArray = relativeFilePath.split(path.sep);

		const rootDir = filePathArray.length ? filePathArray[0] : '';

		return fastDeploy(path.join(pathBuild, rootDir, '**/*'), pathBuild);
	});

	gulp.task('deploy:war', function(cb) {
		const sequence = [];

		if (deploymentStrategy === DEPLOYMENT_STRATEGIES.DOCKER_CONTAINER) {
			sequence.push('deploy:docker');
		} else {
			sequence.push('plugin:deploy');
		}

		sequence.push(cb);
		runSequence.apply(this, sequence);
	});

	gulp.task('deploy-live:war', function(cb) {
		const password = argv.p || argv.password;
		const url = argv.url || storage.get('url');
		const username = argv.u || argv.username;

		const themeName = themeConfig.name;

		const warDeployer = new WarDeployer({
			fileName: themeName,
			password,
			url,
			username,
		}).on('end', cb);

		warDeployer.deploy();
	});

	/**
	 * Force a hot deploy of modified files and notify browserSync about the
	 * change with the given file globs.
	 * @param  {String} srcPath glob expression of files to be refreshed
	 * @param  {String} basePath the base path of the srcPath expression
	 * @return {Stream} the gulp stream
	 */
	function fastDeploy(srcPath, basePath) {
		const fastDeployPaths = getFastDeployPaths();

		const stream = gulp
			.src(srcPath, {
				base: basePath,
			})
			.pipe(plugins.debug())
			.pipe(gulp.dest(fastDeployPaths.dest));

		if (deploymentStrategy === DEPLOYMENT_STRATEGIES.DOCKER_CONTAINER) {
			const deployDir = path.basename(fastDeployPaths.dest);
			const dockerDestDirPath = path.posix.join(
				dockerThemePath,
				deployDir
			);
			const deployFiles = [];

			stream.pipe(
				listStream.obj(function(err, files) {
					if (err) throw err;

					_.forEach(files, function(file) {
						const filePath = file.path
							.substring(fastDeployPaths.dest.length)
							.split(path.sep)
							.join(path.posix.sep);
						deployFiles.push(filePath);
					});

					themeUtil.dockerCopy(
						dockerContainerName,
						deployDir,
						dockerDestDirPath,
						deployFiles,
						function(err) {
							if (err) throw err;
						}
					);
				})
			);
		}

		if (fastDeployPaths.tempDest) {
			stream.pipe(gulp.dest(fastDeployPaths.tempDest));
		}

		return stream;
	}

	function getFastDeployPaths() {
		const fastDeployPaths = {
			dest: storage.get('appServerPathPlugin'),
		};

		const tempDirPath = path.join(fastDeployPaths.dest, '../../temp/');

		let tempThemeDir;

		if (
			fs.existsSync(tempDirPath) &&
			fs.statSync(tempDirPath).isDirectory()
		) {
			const themeName = storage.get('themeName');

			const tempDir = fs.readdirSync(tempDirPath);

			tempThemeDir = _.find(tempDir, function(fileName) {
				return fileName.indexOf(themeName) > -1;
			});
		}

		fastDeployPaths.tempDest = tempThemeDir;

		return fastDeployPaths;
	}
}

module.exports = registerTasks;
