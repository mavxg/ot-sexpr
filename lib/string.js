//Advantage of using this rather than a real string
//is that it cannot be coerced into a number

var is = require('./is');

function _sliceAttributes(attr, start, end) {
	var offset = 0;
	var ret = [];
	for (var i = 0; i < attr.length; i++) {
		if (offset >= end) break;
		var ap = attr[i];
		var n = ap[0];
		if (offset + n > start) {
			//(....)(...)(...)(....)
			//       [         ]
			if (offset > start) {
				if (offset + n <= end)
					ret.push(ap);
				else
					ret.push([end - offset, ap[1]]);
			} else {
				if (offset + n <= end)
					ret.push([n + offset - start, ap[1]]);
				else
					ret.push([end - start, ap[1]]);
			}
		}
		offset += n;
	}
	return ret;
}

function _concatAttributes(a, b) {
	var la = a[a.length - 1];
	var fa = b[0];
	if (la && fa && is.equal(la[1], fa[1])) {
		var na = a.slice(0,a.length - 1);
		na.push([la[0] + fa[0], la[1]]);
		return na.concat(b.slice(1));
	} else {
		return a.concat(b);
	}
}

function AttributedString(str, attributes) {
	this.str = str;
	this.length = str.length;
	this.size = this.length + 2;
	this.attributes = attributes || [[this.length,{}]];
};
AttributedString.prototype.nodeAt = function(point) {
	if (point === 0) return {node:this, offset:0, index:-1};
	if (point >= this.size) throw "Point outside of string";
	return {node:this, offset:point, index:(point-1)}; 
};
AttributedString.prototype.toSexpr = function() {
	var ret = JSON.stringify(this.str);
	if (this.attributes &&
		(this.attributes.length > 1 ||
		 Object.keys(this.attributes[0][1]).length > 0))
		return JSON.stringify(this.attributes) + ret;
	return ret;
};
AttributedString.prototype.slice = function(start,end) {
	if (end===undefined) end = this.length;
	if (start < 0) start = 0;
	var ns = this.str.slice(start, end);
	var na = _sliceAttributes(this.attributes, start, end);
	return new AttributedString(ns, na);
};
AttributedString.prototype.updateAttributes = function(f, start, end) {
	if (start===undefined) start = 0;
	if (end===undefined) end = this.length;
	var ba = _sliceAttributes(this.attributes, 0, start);
	var ma = _sliceAttributes(this.attributes, start, end).map(f);
	var aa = _sliceAttributes(this.attributes, end, this.length);
	var na = _concatAttributes(_concatAttributes(ba, ma), aa);
	return new AttributedString(this.str, na);
};
AttributedString.prototype.addAttributes = function(attributes, start, end) {
	function addAttr(ats) {
		var l = ats[0];
		var a = ats[1];
		var na = {};
		for (var k in a)
			na[k] = a[k];
		for (var k in attributes)
			na[k] = attributes[k];
		return [l, na]
	}
	return this.updateAttributes(addAttr, start, end);
};
AttributedString.prototype.removeAttributes = function(attributes, start, end) {
	function remAttr(ats) {
		var l = ats[0];
		var a = ats[1];
		var na = {};
		for (var k in a)
			if (!attributes.hasOwnProperty(k))
				na[k] = a[k];
		return [l, na]
	}
	return this.updateAttributes(remAttr, start, end);
};
//create attributed string from the concatenation of two attributed strings
AttributedString.prototype.concat = function(astr) {
	var ns = this.str + astr.str;
	var na = _concatAttributes(this.attributes, astr.attributes);
	return new AttributedString(ns, na);
};
//add strings and attributes to end of attributed strings
AttributedString.prototype.add = function(str, attributes) {
	if (attributes == undefined) 
		attributes = this.attributes.length > 0 ? this.attributes[this.attributes.length - 1][1] : {};
	var ns = this.str + str;
	var na = _concatAttributes(this.attributes, [[str.length, attributes]]);
	return new AttributedString(ns, na);
};
//return a [{str:str, attributes:attributes}] for each attributes
AttributedString.prototype.chunk = function() {
	var ret = [];
	var o = 0;
	var str = this.str;
	for (var i = 0; i < this.attributes.length; i++) {
		var a = this.attributes[i];
		var l = a[0];
		var aa = a[1];
		ret.push({str:str.slice(o,o+l), attributes:aa});
		o += l;
	};
	return ret;
};
AttributedString.prototype.isText = function(point) {
	return (point > 0 && point < this.size);
};

module.exports = AttributedString;