
var ot = require('../');

function _delete(doc, region) {
	var b = region.begin();
	var e = region.end();
	return ot.invert(doc.prefix(b,e));
}

module.exports = api;
function api(getSnapshot, submitOp) {
	function replace(region, operations) {
		var doc = getSnapshot();
		var b = region.begin();
		var e = region.end();
		if (e > doc.size)
			throw "Cannot replace region that is outside the document";
		var ops = [{op:"retain", n:b}];
		ops = ops.concat(_delete(doc, region)); //canot start with a mergable op
		for (var i = 0; i < operations.length; i++) {
			var op = operations[i];
			ops.push(op); //TODO change this for the push with merge
		};
		submitOp(ops);
	}

	function insert(point, operations) {
		var ops = [{op:"retain", n:point}].concat(operations);
		submitOp(ops);
	}

	return {
		insert: insert,
		replace: replace,

		//attributes optional (point assumed to be in some text)
		insertText: function(point, str, attributes) {
			insert(point, [{op:"insert", value:str, type:"char", n:str.length, attributes:attributes}]);
		},

		//attributes optional
		replaceText: function(region, str, attributes) {
			replace(region, [{op:"insert", value:str, type:"char", n:str.length, attributes:attributes}]);
		},

		setAttributes: function(region, attributes) {
			//TODO ?? should this filter for valid regions in the document?
			var b = region.begin();
			var e = region.end();
			var doc = getSnapshot();
			if (e > doc.size)
				throw "Cannot setAttributes in region that is outside the document";
			submitOp([{op:"retain", n:b},{op:"retain", n:(e-b), attributes:attributes}]);
		},

		unsetAttributes: function(region, attributes) {
			//TODO ?? should this filter for valid regions in the document?
			var b = region.begin();
			var e = region.end();
			var doc = getSnapshot();
			if (e > doc.size)
				throw "Cannot unsetAttributes in region that is outside the document";
			submitOp([{op:"retain", n:b},{op:"retain", n:(e-b), unattributes:attributes}]);
		},
	}
}