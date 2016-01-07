'use strict';

var _ = require('lodash');
var chai = require('chai');
var fs = require('fs-extra');
var path = require('path');
var sinon = require('sinon');

var options = require('../../lib/options')({
	pathSrc: './custom_src_path'
});

var lookAndFeelUtil = require('../../lib/look_and_feel_util.js');

var baseLookAndFeelJSON = require('../assets/json/base-look-and-feel.json');

var assert = chai.assert;
chai.use(require('chai-fs'));

var baseThemePath = path.join(__dirname, '../assets/base-theme');

describe('Look and Feel Util functions', function() {
	// generateLookAndFeelXML
	it('should generate valid look-and-feel xml', function(done) {
		var xml = lookAndFeelUtil.generateLookAndFeelXML('<?xml version="1.0" standalone="true"?>\n\n<look-and-feel></look-and-feel>', '<!DOCTYPE look-and-feel>');

		assert.equal(xml, '<?xml version="1.0"?>\n<!DOCTYPE look-and-feel>\n\n\n<look-and-feel></look-and-feel>');

		done();
	});

	// getLookAndFeelDoctype
	it('should extract doctype from liferay-look-and-feel.xml', function(done) {
		var doctype = lookAndFeelUtil.getLookAndFeelDoctype(baseThemePath);

		assert.equal(doctype, '<!DOCTYPE look-and-feel PUBLIC "-//Liferay//DTD Look and Feel 7.0.0//EN" "http://www.liferay.com/dtd/liferay-look-and-feel_7_0_0.dtd">');

		done();
	});

	// getLookAndFeelJSON
	it('should convert look-and-feel xml to json', function(done) {
		lookAndFeelUtil.getLookAndFeelJSON(baseThemePath, function(result) {
			assert(result);
			assert(result['look-and-feel']);

			done();
		});
	});

	// mergeLookAndFeelJSON
	it('should merge look and feel json', function(done) {
		lookAndFeelUtil.mergeLookAndFeelJSON(baseThemePath, {}, function(result) {
			assert(result);
			assert(result['look-and-feel']);
		});

		done();
	});

	// readLookAndFeelXML
	it('should return xml and access file only once', function(done) {
		// erase cache for sinon spy
		lookAndFeelUtil._xmlCache = {};

		var spy = sinon.spy(fs, 'readFileSync');

		var xml = lookAndFeelUtil.readLookAndFeelXML(baseThemePath);
		xml = lookAndFeelUtil.readLookAndFeelXML(baseThemePath);

		assert(/<look-and-feel>/.test(xml));
		assert(spy.calledOnce);

		done();
	});

	// _extractThemeElement
	it('should extract elements based on tag name', function(done) {
		lookAndFeelUtil.getLookAndFeelJSON(baseThemePath, function(result) {
			var portletDecorators = lookAndFeelUtil._extractThemeElement(result, 'portlet-decorator');

			assert(portletDecorators.length == 2);
			assert(portletDecorators[0].$.id == 'portlet-decorator-1');
			assert(portletDecorators[1].$.id == 'portlet-decorator-2');

			done();
		});
	});

	// _extractThemeSettings
	it('should extract theme settings from object', function(done) {
		lookAndFeelUtil.getLookAndFeelJSON(baseThemePath, function(result) {
			var themeSettings = lookAndFeelUtil._extractThemeSettings(result);

			assert(themeSettings.length == 1);
			assert(themeSettings[0].$.key == 'show-breadcrumb');

			done();
		});
	});

	// _mergeJSON
	it('should merge look-and-feel json and output a valid look-and-feel json object', function(done) {
		var lookAndFeelJSON = lookAndFeelUtil._mergeJSON(baseLookAndFeelJSON, baseLookAndFeelJSON);

		assert.deepEqual(lookAndFeelJSON, baseLookAndFeelJSON);

		var parentLookAndFeelJSON = require('../assets/json/parent-look-and-feel.json');

		lookAndFeelJSON = lookAndFeelUtil._mergeJSON(baseLookAndFeelJSON, parentLookAndFeelJSON);

		assert.deepEqual(lookAndFeelJSON, require('../assets/json/merged-look-and-feel.json'));

		done();
	});

	// _mergeThemeElementById
	it('should pass', function(done) {
		done();
	});
});
