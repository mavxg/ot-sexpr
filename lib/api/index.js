
var ot = require('../operations');

require('./list')(ot);
require('./string')(ot);

module.exports = api;
function api(getSnapshot, submitOp) {
	return {
		replace: function(selection, operations) {
			var doc = getSnapshot();
			var ops = [];
			function _replace(region) {
				var op;
				if (region.empty())
					op = doc.insert(region.focus, operations);
				else
					op = doc.replace(region, operations);
				ops = ot.compose(ops, op);
			}
			selection.regions.forEach(_replace);
			submitOp(ops);
		},

		//attributes optional
		replaceText: function(selection, str, attributes) {
			var doc = getSnapshot();
			var ops = [];
			function _replace(region) {
				var op;
				if (region.empty())
					op = doc.insertText(region.focus, str, attributes);
				else
					op = doc.replaceText(region, str, attributes);
				ops = ot.compose(ops, op);
			}
			selection.regions.forEach(_replace);
			submitOp(ops);
		},

		setAttributes: function(selection, attributes) {
			var doc = getSnapshot();
			var ops = [];
			function _attribute(region) {
				ops = ot.compose(ops, doc.attribute(region, attributes));
			}
			selection.regions.forEach(_attribute);
			submitOp(ops);
		},

		unsetAttributes: function(selection, attributes) {
			var doc = getSnapshot();
			var ops = [];
			function _attribute(region) {
				ops = ot.compose(ops, doc.unattribute(region, attributes));
			}
			selection.regions.forEach(_attribute);
			submitOp(ops);
		},
	}
}