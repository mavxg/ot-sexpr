/*

TODO:

Benchmark and then
Don't build symbols and numbers a character at a time.

*/

var sym = require('./symbol').sym;
var List = require('./list');
var AttributedString = require('./string');


//where can we put the cursor
// ( p 1 "string" )
// . . . ........ .

/*
 * parse takes a string and returns a list of expressions
 */
function parse(str) {
	var t = [];
	var sexpr = [];
	var attributes;
	var word = '';
	var i = 0;
	var len = str.length;
	var c;

	function isSpace(c) {
		return (c === ' ' || c === '\n' || c === '\t');
	}

	function isJSON(c) {
		return (c === '"' || c === '[' || c === '{');
	}

	function parse_string() {
		i++;
		while (i < len) {
			c = str[i];
			if (c === '\\') {
				i++;
			} else if (c === '"') {
				break;
			}
			i++;
		}
		if (c !== '"') throw "Expected end of string";
	}

	function parse_object() {
		i++;
		while (i < len) {
			c = str[i];
			if (c === '}') break;
			else if (c === '[') parse_array();
			else if (c === '"') parse_string();
			else if (c === '{') parse_object();
			i++;
		}
		if (c !== '}') throw "Expected end of object";

	}

	function parse_array() {
		i++;
		while (i < len) {
			c = str[i];
			if (c === ']') break;
			else if (c === '[') parse_array();
			else if (c === '"') parse_string();
			else if (c === '{') parse_object();
			i++;
		}
		if (c !== ']') throw "Expected end of array";
	}

	function parse_json() {
		s = i;
		if (c === '"') parse_string();
		else if (c === '[') parse_array();
		else if (c === '{') parse_object();
		return JSON.parse(str.slice(s,i+1));
	}

	while (i < len) {
		c = str[i];
		if (c === '(')  {
			sexpr.push(t);
			t = new List(null, attributes);
			attributes = undefined;
		} else if (c === ')') {
			if (word.length > 0){
				t.push(isNaN(word) ? sym(word) : (+word));
				word = '';
			}
			var temp = sexpr.pop();
			temp.push(t);
			t = temp;
		} else if (isSpace(c)) {
			if (word.length > 0){
				t.push(isNaN(word) ? sym(word) : (+word));
				word = '';
			}
		} else if (isJSON(c)) {
			if (word.length > 0)
				throw "invalid expression: " + word + str.slice(i, i+10);
			var j = parse_json();
			if (c==='"') {
				j = new AttributedString(j, attributes);
				attributes = undefined;
			}
			if ((c===']' && str[i+1]==='"') ||
			    (c==='}' && str[i+1]==='(')) attributes = j;
			else
				t.push(j);
		} else {
			word += c;
		}
		i++;
	}
	if (word.length > 0)
		t.push(isNaN(word) ? sym(word) : (+word));
	return t;
}

module.exports = parse;