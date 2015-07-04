
var ot = require('../operations');

require('./list')(ot);
require('./string')(ot);
require('./symbol')(ot);

module.exports = {
	operations: ot.operations,

	provides: {sexpr: true},

	replace: function(selection, operations) {
		var doc = this.getSnapshot();
		var ops = [];
		function _replace(region) {
			var op;
			if (region.empty())
				op = doc.insert(region.focus, operations);
			else
				op = doc.replace(region, operations);
			ops = ot.compose(ops, ot.transform(op,ops));
		}
		selection.forEachR(_replace);
		this.submitOp(ops);
	},

	//attributes optional
	replaceText: function(selection, str, attributes) {
		var doc = this.getSnapshot();
		var ops = [];
		function _replace(region) {
			var op;
			if (region.empty())
				op = doc.insertText(region.focus, str, attributes);
			else
				op = doc.replaceText(region, str, attributes);
			ops = ot.compose(ops, ot.transform(op,ops));
		}
		selection.forEachR(_replace);
		this.submitOp(ops);
	},

	setAttributes: function(selection, attributes, type) {
		var doc = this.getSnapshot();
		var ops = [];
		function _attribute(region) {
			var op = doc.attribute(region, attributes, type);
			ops = ot.compose(ops, ot.transform(op,ops));
		}
		selection.forEachR(_attribute);
		this.submitOp(ops);
	},

	unsetAttributes: function(selection, attributes, type) {
		var doc = this.getSnapshot();
		var ops = [];
		function _attribute(region) {
			var op = doc.unattribute(region, attributes, type);
			ops = ot.compose(ops, ot.transform(op,ops));
		}
		selection.forEachR(_attribute);
		this.submitOp(ops);
	},
};