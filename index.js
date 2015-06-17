//operations

//retain {op:'retain', n:5}
//pop {op:'pop'}
//push {op:'push', kind:[]} or {op:'push', kind:""}
//insert {op:'insert', values:[a b c]}
//insert {op:'insert', values:"text"}
//delete {op:'delete', values:[a b c]}
//delete {op:'delete', values:"text"}
// unpush, unpop

//with linearisation we also need UP and DOWN (with kind)

var doc     = "doc";
var p       = "p";
var bold    = "bold";

var RETAIN  = "retain";
var INSERT  = "insert";
var PUSH    = "push";
var POP     = "pop";
var DELETE  = "delete";
var UNPOP   = "unpop";
var UNPUSH  = "unpush";
var UP      = "up"
var DOWN    = "down"

var popA    = {op:POP, kind:""};
var popS    = {op:POP, kind:[]};
var unpopA  = {op:UNPOP, kind:""};
var unpopS  = {op:UNPOP, kind:[]};
var pushA   = {op:PUSH, kind:[]};
var pushS   = {op:PUSH, kind:""};
var unpushA = {op:UNPUSH, kind:[]};
var unpushS = {op:UNPUSH, kind:""};
var upA     = {op:UP, kind:[]};
var upS     = {op:UP, kind:""};
var downA   = {op:DOWN, kind:[]};
var downS   = {op:DOWN, kind:""};


function r(n) {
	return {op:RETAIN, n:n};
}

function i(vs) {
	return {op:INSERT, values:vs};
}

function d(vs) {
	return {op:DELETE, values:vs};
}

var doca = [doc,[],[p,[],"Hello, World!"]];
var docb = [doc,[],[p,[],'Hello, ',[bold,[],'World!']]];

//IDEA: linearisation - might be easier to do things like compose and transform.
//we can serialise this into a simple form and generate it pretty easily.
var lopa = [upA,r(2),upA,r(2),upS,r(7),i("Cruel "),r(6),downS,downA,downA];
var lopb = [upA,r(2),upA,r(2),upS,r(7),
	popS,pushA,i(["bold",[]]),pushS,r(6),popA,downS,downA,downA];

//we might have the pops the wrong way up... (at the moment we don't check kind)


//RULES
// [upX,r(n),downX] ->[r(1)]
// [r(a),r(b)] -> [r(a+b)]
// [i(a),i(b)] -> [i(a+b)] //where + is concat if array.

function push(ops, op) {
	//TODO (check rules first)
	return ops.push(op);
}

/*
NOTE:

Any list value you might be modifying non atomically should probably
be put in as pushA,popA except we need the system to know how to deal
with that kind of thing as we will want to insert large tables without
resorting to that kind of thing.

Although, we can simplify things by just throwing an error if we don't know
what to do. We should also not be transposing things if we are in a critical region.
perhaps we can have start critical and endcritical.

when we compose it is the unions of the critical regions.

*/

var opa = [r(2),[r(2),[r(7),i("Cruel "),r(6)]]];
//popS has to come where it is to put the string consumed so far into the list
var opb = [r(2),[r(2),[r(7),popS,pushA,i(["bold",[]]),pushS,r(6),popA]]];

function invert(ops) {
	function invertOp(op) {
		if (Array.isArray(op)) return invert(op);
		switch (op.op) {
			case RETAIN: return op;
			case INSERT: return d(op.values);
			case DELETE: return i(op.values);
			case PUSH:
				return (typeof op.kind === 'string') ? unpushS : unpushA;
			case POP:
				return (typeof op.kind === 'string') ? unpopS : unpopA;
			case UNPUSH: 
				return (typeof op.kind === 'string') ? pushS : pushA;
			case UNPOP:
				return (typeof op.kind === 'string') ? popS : popA;
			default:
				return op;
		}
	}
	return ops.map(invertOp);
}

function makeAppend(result) {
	return function(op) { 
		return push(result, op); 
	};
}

function compose(opA, opB) {
	var result = [];

	var append = makeAppend(result);
	//TODO
	return result;
}

function transform(op1, op2, side) {
	var left = side == 'left';
	//TODO
	return op1;
}

function applyl(d,ops) {
	var stack = []
	var t = [];
	var docStack = [];
	var dp = [d]; //wrap the doc so the first upA gets it.
	var o = 0;

	function append(vals) {
		if (typeof t === 'string') {
			t += vals
		} else {
			t = t.concat(vals);
		}
	}

	for (var i = 0; i < ops.length; i++) {
		var op = ops[i];
		switch (op.op) {
			case INSERT:
				append(op.values);
				break;
			case RETAIN:
				append(dp.slice(o,o+op.n));
				o += op.n;
				break;
			case PUSH:
				stack.push(t);
				t = (typeof op.kind === 'string') ? "" : [];
				break;
			case POP:
				var temp = t;
				t = stack.pop();
				if (typeof t === 'string')
					t += temp;
				else
					t.push(temp);
				break;
			case DELETE:
				o += op.values.length;
				break;
			case UNPUSH:
				//move deeper into the doc
				docStack.push({o:o, dp:dp});
				dp = dp[o];
				o = 0;
				break;
			case UNPOP:
				//move shallower in the doc
				var _d = docStack.pop();
				dp = _d.dp;
				o = _d.o + 1;
				break;
			case UP:
				stack.push(t);
				t = (typeof op.kind === 'string') ? "" : [];
				docStack.push({o:o, dp:dp});
				dp = dp[o];
				o = 0;
				break;
			case DOWN:
				//move shallower in the doc
				var _d = docStack.pop();
				dp = _d.dp;
				o = _d.o + 1;
				var temp = t;
				t = stack.pop();
				if (typeof t === 'string')
					t += temp;
				else
					t.push(temp);
				break;

		}
	};

	return t[0];
}

function apply(d,ops) {
	var stack = []
	var t = [];
	var docStack = [];
	var dp = d;
	var o = 0;

	//IDEA: unroll the tree into a linear POP UNPOP solution.
	//it might be easier to do things like compose that way.
	//and we can always roll it up again at the end.

	//The reason that it is hard to unroll is that we don't currently
	//distinguish between string and not string so we would need the
	//doc to know how to unroll.

	//could store the op like that though.

	function append(vals) {
		if (typeof t === 'string') {
			t += vals
		} else {
			t = t.concat(vals);
		}
	}

	function up(opy) {
		for (var i = 0; i < opy.length; i++) {
			var op = opy[i];
			if (Array.isArray(op)) {
				//push
				stack.push(t)
				t =  (typeof dp[o] === 'string') ? "" : [];
				//unpush
				docStack.push({o:o, dp:dp});
				dp = dp[o];
				o = 0;
				//up
				up(op);
				//unpop
				var _d = docStack.pop();
				dp = _d.dp;
				o = _d.o + 1;
				//pop
				var temp = t;
				t = stack.pop();
				if (typeof t === 'string')
					t += temp;
				else
					t.push(temp);
				continue;
			}
			switch (op.op) {
				case INSERT:
					append(op.values);
					break;
				case RETAIN:
					append(dp.slice(o,o+op.n));
					o += op.n;
					break;
				case PUSH:
					stack.push(t);
					t = (typeof op.kind === 'string') ? "" : [];
					break;
				case POP:
					var temp = t;
					t = stack.pop();
					if (typeof t === 'string')
						t += temp;
					else
						t.push(temp);
					break;
				case DELETE:
					o += op.values.length;
					break;
				case UNPUSH:
					//move deeper into the doc
					docStack.push({o:o, dp:dp});
					dp = dp[o];
					o = 0;
					break;
				case UNPOP:
					//move shallower in the doc
					var _d = docStack.pop();
					dp = _d.dp;
					o = _d.o + 1;
					break;
			}
		};
	}

	up(ops);
	return t;
}