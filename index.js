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

//with critical regions we also need START END

var RETAIN  = "retain";
var INSERT  = "insert";
var PUSH    = "push";
var POP     = "pop";
var DELETE  = "delete";
var UNPOP   = "unpop";
var UNPUSH  = "unpush";
var UP      = "up";
var DOWN    = "down";
var START   = "start";
var END     = "end";

var pop     = {op:POP};
var unpop   = {op:UNPOP};
var pushA   = {op:PUSH, kind:[]};
var pushS   = {op:PUSH, kind:""};
var unpushA = {op:UNPUSH, kind:[]};
var unpushS = {op:UNPUSH, kind:""};

//linearisation
var upA     = {op:UP, kind:[]};
var upS     = {op:UP, kind:""};
var down    = {op:DOWN};

//critical regions
var start   = {op:START};
var end     = {op:END};

//standard text/list operations
function r(n) {
  return {op:RETAIN, n:n};
}

function _i(vs) {
  return {op:INSERT, values:vs, n:vs.length};
}

function _d(vs) {
  return {op:DELETE, values:vs, n:vs.length};
}

pop.toJSON = function() { return "pop"; };
unpop.toJSON = function() { return "unpop"; };
upA.toJSON = function() { return "upA"; };
upS.toJSON = function() { return "upS"; };
down.toJSON = function() { return "down"; };
pushA.toJSON = function() { return "pushA"; };
pushS.toJSON = function() { return "pushS"; };
unpushA.toJSON = function() { return "unpushA"; };
unpushS.toJSON = function() { return "unpushS"; };

//we might have the pops the wrong way up... (at the moment we don't check kind)

//RULES
// [r(a),r(b)] -> [r(a+b)]
// [i(a),i(b)] -> [i(a.concat(b))]
// [start,end] -> []
// [end,start] -> []
// [upA,r(n),down] ->[r(1)]

function _push(ops, op) {
  if (ops.length === 0)
    return ops.push(op);

  var t = ops[ops.length-1];
  switch (op.op) {
    case RETAIN:
      if (t.op === RETAIN) {
        ops.pop();
        return _push(ops, r(t.n + op.n));
      }
      break;
    case INSERT:
      if (t.op === INSERT && 
        typeof t.values === typeof op.values) {
        ops.pop();
        return _push(ops, i(t.values.concat(op.values)));
      }
      break;
    case START:
      if (t.op === END)
        return ops.pop();
      break;
    case END:
      if (t.op === START)
        return ops.pop();
      break;
    case DOWN:
      if (t.op === UP) {
        ops.pop();
        return _push(ops,r(1));
      }
      if (t.op === RETAIN && 
           ops.length > 1 && 
           ops[ops.length-2].op === UP) {
        ops.pop();
        ops.pop();
        return _push(ops, r(1));
      }
  }
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


/*
takes a source and target document and returns operations to modify
the source document into the target document.

Note: assumes simple operations where objects stay at the same level
within the tree.

takes an optional path and only does the diff at that path.
takes an optional critical bool to wrap the path in critical tags

Note, this assumes that strings that differ differ in entirety

*/

function diff(source, target, path, critical) {
  var result = [];
  var pre = _diff(source, target, path, critical);
  //cleanup the results.
  function append(op) { _push(result, op); }
  pre.forEach(append);
  return result;
}

function _diff(source, target, path, critical) {
  var result = [];
  if (path && path.length > 0) {
    var offset = path[0]
    result.push(typeof source[0] === 'string' ? upS : upA);
    result.push(r(offset));
    result = result.concat(diff(source[offset], target[offset], path.slice(1)));
    result.push(r(source[offset].length - offset - 1));
    result.push(down);
    return result;
  }
  if (source === target) {
    result.push(r(1));
    return;
  }

  if (critical) result.push(start); //start critical region
  //do an actual diff
  if (Array.isArray(source) && Array.isArray(target)) {
    result.push(upA);
    var i = 0;
    var j = 0;
    var rs = source.length;
    var ts = target.length;
    while (i < source.length && j < target.length) {
      var s = source[i];
      var t = target[j];
      if (s === t) {
        result.push(r(1));
        i++;
        j++;
        rs--;
        ts--;
      } else if (rs === ts) {
        result = result.concat(diff(s,t));
        rs--;
        ts--;
        i++;
        j++;
      } else if (rs > ts) {
        result.push(_d([s]));
        rs--;
        i++;
      } else {
        result.push(_i([t]));
        ts--;
        j++;
      }
    }
    if (rs > 0)
      result.push(_d(source.slice(i)));
    else if (ts > 0)
      result.push(_i(target.slice(j)));
    result.push(down);
  } else {
    result.push(_d([source]));
    result.push(_i([target]));
  }
  if (critical) result.push(end); //end critical region
  return result;
}

function invert(ops) {
  function invertOp(op) {
    switch (op.op) {
      case RETAIN: return op;
      case INSERT: return _d(op.values);
      case DELETE: return _i(op.values);
      case POP:    return unpop;
      case UNPOP:  return pop;
      case PUSH:
        return (typeof op.kind === 'string') ? unpushS : unpushA;
      case UNPUSH: 
        return (typeof op.kind === 'string') ? pushS : pushA;
      default:
        return op;
    }
  }
  return ops.map(invertOp);
}

function makeAppend(result) {
  return function(op) { 
    return _push(result, op); 
  };
}

function _slice(op, s, e) {
  switch (op.op) {
    case INSERT: return _i(op.values.slice(s,e));
    case DELETE: return _d(op.values.slice(s,e));
    case RETAIN: return r((e === undefined ? op.n : e) - s);
    default:     return op;
  }
}

function makeTake(ops) {
  var i = 0; //current operation
  var offset = 0; //sub offset within operation

  function take(n,indivisableField) {
    if (i === ops.length)
      return (n === -1) ? null : r(n);

    var part;
    var c = ops[i];
    if (n === -1
      || c.n === undefined
      || c.n - offset <= n
      || c.op === indivisableField) {
      //return the remainder of the current operation
      part = _slice(c, offset)
      i++;
      offset=0;
      return part;
    } else {
      part = _slice(c, offset, offset + n);
      offset += n;
      return part;
    }
  }

  function peek() {
    return ops[i];
  }

  return {
    take: take,
    peek: peek,
  }
}

function compose(opA, opB) {
  var result = [];
  var critical = 0;
  var level_b = 0; //does not include push pop
  var level_a = 0; //includes push and pop

  var append = makeAppend(result);
  var _funs  = makeTake(opA);
  var take   = _funs.take;
  var peek   = _funs.peek;

  var chunk;
  var length = 0;
  var op;

  function retain(length) {
    if (level_b > level_a) {
      append(r(length));
      return;
    }
    while (length > 0) {
      chunk = take(length, DELETE);
      if (chunk === null) throw "Retain failed for this compose"
      switch (chunk.op) {
        case INSERT:
        case RETAIN:
          append(chunk);
          if (level_a === level_b)
            length -= chunk.n;
          break;
        case DOWN:
        case POP:
          level_a--;
          if (level_a===level_b)
            length -= 1;
          append(chunk);
          break;
        case UP:
        case PUSH:
          level_a++;
          append(chunk);
          break;
        case START:
          if (critical === 0) append(chunk);
          critical++;
          break;
        case END:
          critical--;
          if (critical === 0) append(chunk);
          break;
        default:
          append(chunk);
          break;
      }
    }
  }

  for (var i = 0; i < opB.length; i++) {
    op = opB[i];
    switch (op.op) {
      case PUSH:
        chunk = peek();
        if (chunk && (chunk.op === UNPUSH &&
          typeof chunk.kind ===  typeof op.kind))
          take(-1);
        else
          append(op);
        break;
      case UNPUSH:
        chunk = peek();
        if (chunk && (chunk.op === PUSH &&
          typeof chunk.kind === typeof op.kind))
          take(-1)
        else
          append(op);
        break;
      case POP:
        chunk = peek();
        if (chunk && chunk.op === UNPOP)
          take(-1);
        else
          append(op);
        break;
      case UNPOP:
        chunk = peek();
        if (chunk && chunk.op === POP)
          take(-1);
        else
          append(op);
        break;
      case INSERT:
        append(op);
        break;
      case UP:
        level_b++;
        chunk = peek();
        if (chunk && (chunk.op === UP || chunk.op === PUSH)) {
          append(take(-1));
          level_a++;
        } else {
          append(op);
        }
        break;
      case DOWN:
        level_b--;
        chunk = peek();
        if (chunk && (chunk.op === DOWN || chunk.op === POP)) {
          append(take(-1));
          level_a--;
        } else {
          append(op);
          retain(1);
        }
        break;
      case RETAIN:
        length = op.n;
        retain(op.n);
        break;
      case DELETE:
        length = op.n;
        var s = 0;
        while (length > 0) {
          chunk = take(length, DELETE);
          if (chunk === null) throw "DELETE failed for this compose"
          switch (chunk.op) {
            case INSERT:
              if (level_a===level_b) {
                length -= chunk.n;
                s += chunk.n;
              }
              break;
            case RETAIN:
              if (level_a===level_b) {
                append(_slice(op,s,s+chunk.n));
                length -= chunk.n;
                s += chunk.n;
              }
              break;
            case DOWN:
            case POP:
              level_a--;
              if (level_a===level_b) {
                length -= 1;
                append(_slice(op,s,s+1));
                s += 1
              }
              break;
            case UP:
            case PUSH:
              level_a++;
              break;
            case START:
              if (critical === 0) append(chunk);
              critical++;
              break;
            case END:
              critical--;
              if (critical === 0) append(chunk);
              break;
            default:
              append(chunk);
              break;
          }
        }
        break;
      case START:
        if (critical === 0) append(op);
        critical++;
        break;
      case END:
        critical--;
        if (critical === 0) append(op);
        break;
    }
  };

  while ((chunk = take(-1)))
    append(chunk); //TODO: probably need special cases for each..

  return result;
}

function transform(opA, opB, side) {
  var left = side == 'left';
  var result = [];
  var critical_a = 0;
  var critical_b = 0;
  var level_b = 0; //does NOT include push and pop
  var level_a = 0; //does NOT include push and pop
  var level_bpp = 0; //push and pop
  var level_app = 0; //push and pop

  var append = makeAppend(result);
  var _funs  = makeTake(opA);
  var take   = _funs.take;
  var peek   = _funs.peek;

  var chunk;
  var op;

  //gobble opA while input
  function gobble() {
    while((chunk=peek()) && 
      (chunk.op === INSERT || chunk.op === PUSH || chunk.op === POP)) {
      append(take(-1));
      if (chunk.op === PUSH)
        level_app++;
      else if (chunk.op === POP)
        level_app--;
    }
  }

  function del(op) {
    var length = op.n;
    if (level_b > level_a) {
      return;
    }
    while (length > 0) {
      chunk = take(length, INSERT);
      switch (chunk.op) {
        case INSERT:
          append(chunk);
          break;
        case DELETE:
        case RETAIN:
          if (level_a < level_b) return;
          if (level_a===level_b) length -= chunk.n;
          break;
        case DOWN:
          level_a--;
          if (level_a===level_b) length -= 1;
          break;
        case UP:
          level_a++;
          break;
        case START:
          if (critical_b > 0)
            throw "Overlapping Critical Region";
          critical_a++;
          break;
        case END:
          critical_a--;
          break;
      }
    }
  }

  function retain(length) {
    if (level_b > level_a) {
      append(r(length));
      return;
    }
    while (length > 0) {
      chunk = take(length, INSERT);
      append(chunk);
      switch (chunk.op) {
        case INSERT:
          break;
        case RETAIN:
        case DELETE:
          if (level_a < level_b) return; 
          if (level_a===level_b) length -= chunk.n;
          break;
        case DOWN:
          level_a--;
          if (level_a===level_b) length -= 1;
          break;
        case UP:
          level_a++;
          break;
        case START:
          if (critical_b > 0)
            throw "Overlapping Critical Region";
          critical_a++;
          break;
        case END:
          critical_a--;
          break;
      }
    }
  }
  
  var level_x = 0;
  
  for (var i = 0; i < opB.length; i++) {
    op = opB[i];
    switch (op.op) {
      case PUSH:
        if (level_a === level_b) {
          if (left) gobble();
          append(typeof op.kind === 'string' ? upS : upA);
        } else {
          throw "Unsupported transform: PUSH different levels"
        }
        break;
      case UNPUSH:
        if (left) gobble();
        chunk = peek();
        if (chunk && chunk.op === UP &&
          typeof chunk.kind === typeof op.kind) {
          take(-1);
        } else {
          level_a--;
        }
        //OR do a level_a--
        // and if level_a=== level_b append(r(-1))
        break;
      case POP:
        if (left) gobble();
        append(down);
        break;
      case UNPOP:
        chunk = peek();
        if (chunk && chunk.op === DOWN &&
          typeof chunk.kind === typeof op.kind) {
          take(-1);
        } else {
          level_a++;
          if (level_a===level_b) append(r(-1))
        }
        //or do a level_a++
        // and if level_a=== level_b append(r(-1))
        break;
      case INSERT:
        if (level_b === level_a) {
          if (left) gobble();
          append(r(op.n)) //skip over inserted
        }
        break;
      case UP:
        level_b++;
        chunk = peek();
        if (chunk && chunk.op === UP) {
          append(take(-1));
          level_a++;
        }
        break;
      case DOWN:
        level_b--;
        if (chunk && chunk.op === DOWN) {
          append(take(-1));
          level_a--;
        } else if (level_b === level_a) retain(1);
        break;
      case RETAIN:
        retain(op.n);
        break;
      case DELETE:
        del(op);
        break;
      case START:
        if (critical_a > 0)
          throw "Overlapping Critical Region";
        critical_b++;
        break;
      case END:
        critical_b--;
        break;
    }
  };

  while ((chunk = take(-1)))
    append(chunk);

  return result;
}

function transformCursor(cursor, op, isOwnOp) {
  //TODO
  return cursor;
}

var uuid_seq = 0;
function uuid() {
  return uuid_seq++;
}

function identify(node) {
  if (!Array.isArray(node)) return;
  if (node.id === undefined) node.id = uuid();
  node.forEach(identify);
}

function apply(d,ops) {
  //stack and t(op) for traversing output documrny
  var stack = []
  var t = [];
  //stack and top(dp) for traversing input document
  var docStack = [];
  var dp = [d]; //wrap the doc so we can do [r(1)] and change nothing.
  var o = 0;

  //ensure document is identified (assumes that if doc is identified then children are too)
  if (d.id === undefined) identify(d);

  function append(vals) {
    if (typeof t === 'string') {
      t += vals
    } else {
      var id = t.id;
      identify(vals)
      t = t.concat(vals);
      t.id = id;
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
        if (typeof op.kind === 'string') {
          t = ""
        } else {
          t = [];
          t.id = uuid();
        }
        break;
      case POP:
        var temp = t;
        t = stack.pop();
        t.push(temp);
        break;
      case DELETE:
        o += op.n;
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
        //move deeper into the output
        stack.push(t);
        t = (typeof op.kind === 'string') ? "" : [];
        //move deeper into the doc
        docStack.push({o:o, dp:dp});
        dp = dp[o];
        o = 0;
        //maintain ids
        t.id = dp.id;
        break;
      case DOWN:
        //move shallower in the doc
        var _d = docStack.pop();
        dp = _d.dp;
        o = _d.o + 1;
        //move shallower in the output
        var temp = t;
        t = stack.pop();
        t.push(temp);
        break;
      default:
        //do nothing for Start and End.
        break;
    }
  };

  return t[0];
}

module.exports = {
  name: 'sexpr',
  uri: 'https://github.com/mavxg/ot-sexpr',
  apply: apply,
  transform: transform,
  compose: compose,
  invert: invert,
  transformCursor: transformCursor,
  identify: identify,
  Point: require('./lib/point'),
  Region: require('./lib/region'),
  Selection: require('./lib/selection'),
  diff: diff,
  optypes: {
    retain  : r,
    insert  : _i,
    "delete": _d,
    pop     : pop,
    unpop   : unpop,
    pushA   : pushA,
    pushS   : pushS,
    unpushA : unpushA,
    unpushS : unpushS,
    upA     : upA,
    upS     : upS,
    down    : down,
    start   : start,
    end     : end,
  },
};