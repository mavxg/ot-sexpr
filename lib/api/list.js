var List = require('../list');
var is = require('../is');

module.exports = function(ot) {

var push = ot._push;
var ops = ot.operations;

//return the prefixed document in this region
List.prototype.prefix = function(start, end, op) {
	var _start = (start < 0 ? 0 : start);
	var _end = (end > this.size ? this.size : end);
	var pre = [];
	var offset = 1; //skip the push

	op = op || ops.insert;

	if (_start === _end) return pre;
	if (_start === 0)
		pre.push(op("list", "push", this.attributes));

	for (var i = 0; i < this.values.length && offset < _end; i++) {
		var c = this.values[i];
		var n = (typeof c.toSexpr === 'function' ? c.size : 1);
		if (offset < _end && offset + n > _start) {
			if (typeof c.prefix === 'function') {
				var ps = c.prefix(_start - offset,_end - offset, op);
				for (var j = 0; j < ps.length; j++) {
					pre.push(ps[j]);
				};
			} else {
				pre.push(op(JSON.stringify(c), "obj"));
			}
		}
		offset += n;
	};

	if (_end === this.size)
		pre.push(op('list', "pop"));

	return pre;
};
//generate delete operations for given region
List.prototype._delete = function(start, end) {
	if (start === undefined) start = 0;
	if (end === undefined) end = this.size;
	return this.prefix(start, end, ops.delete);
};
//generate insert operations for given region
List.prototype._insert = function(start, end) {
	if (start === undefined) start = 0;
	if (end === undefined) end = this.size;
	return this.prefix(start, end, ops.insert);
};
List.prototype._diff = function(other) {
	if (target === this) return [ops.retain(this.size)];
	var result;

	//if (other instanceof List && other.id === this.id) {
		//modification of the same object.
	//} else {
		//different objects
		result = this._delete();
		if (typeof target._insert === 'function') {
			result = result.concat(target._insert());
		} else {
			result.push(_d(JSON.stringify(target),'obj'));
		}
	//}
	return result;
};
List.prototype.replace = function(region, oprs) {
	var b = region.begin();
	var e = region.end();
	if (e >= this.size || b < 0)
			throw "Cannot replace a region that is outside the document";
	var ret = this._delete(b, e);
	ret.unshift(ops.retain(b));
	return ret.concat(oprs); //assume that we cannot merge ops;
};
List.prototype.insert = function(point, oprs) {
	if (point >= this.size || point <= 0)
		throw "Cannot insert outside the document";
	return [ops.retain(point)].concat(oprs);
};
List.prototype._reattributeText = function(start, end, attributes, unattributes, ret) {
	var _start = (start < 0 ? 0 : start);
	var _end = (end > this.size ? this.size : end);
	var offset = 1;

	if (_start === _end) return ret;
	if (_start === 0)
		push(ret, ops.retain(1));

	for (var i = 0; i < this.values.length && offset < _end; i++) {
		var c = this.values[i];
		var n = (typeof c.toSexpr === 'function' ? c.size : 1);
		if (offset < _end && offset + n > _start) {
			var l = offset + n - _start;
			if (typeof c._reattributeText === 'function') {
				c._reattributeText(_start - offset,_end - offset, attributes, unattributes, ret);
			} else {
				push(ret, ops.retain(l));
			}
		}
		offset += n;
	};

	if (_end === this.size)
		push(ret, ops.retain(1))
};
List.prototype._reattributeList = function(start, end, attributes, unattributes, ret) {
	var _start = (start < 0 ? 0 : start);
	var _end = (end > this.size ? this.size : end);
	var offset = 1;

	if (_start === _end) return ret;
	if (_start === 0)
		push(ret, ops.retain(1,attributes,unattributes));

	for (var i = 0; i < this.values.length && offset < _end; i++) {
		var c = this.values[i];
		var n = (typeof c.toSexpr === 'function' ? c.size : 1);
		if (offset < _end && offset + n > _start) {
			if (typeof c._reattributeList === 'function') {
				c._reattributeList(_start - offset,_end - offset, attributes, unattributes, ret);
			} else {
				push(ret, ops.retain(n));
			}
		}
		offset += n;
	};

	if (_end === this.size)
		push(ret, ops.retain(1))
};
//return operations of applying attributes to the region
// limits the operation to valid regions.
// text === true ... apply attribute to text only
// text === false ... apply attributes to list starts only
List.prototype.reattribute = function(region, attributes, unattributes, type) {
	var b = region.begin();
	var e = region.end();
	var ret = [ops.retain(b)];
	if (type === 'text')
		this._reattributeText(b, e, attributes, unattributes, ret);
	else
		this._reattributeList(b, e, attributes, unattributes, ret);
	return ret;
}
List.prototype.attribute = function(region, attributes, type) {
	return this.reattribute(region, attributes, {}, type);
};
List.prototype.unattribute = function(region, attributes, type) {
	return this.reattribute(region, {}, attributes, type);
};
List.prototype.insertText = function(point, str, attributes) {
	if (!this.isText(point))
		throw "Cannot insert text outside of a string";
	return this.insert(point, [ops.insert(str, 'char', attributes)]);
};
List.prototype.replaceText = function(region, str, attributes) {
	if (!this.isText(region.focus) || !this.isText(region.anchor))
		throw "Cannot replace text outside of a string";
	return this.replace(region, [ops.insert(str, 'char', attributes)]);
};

};