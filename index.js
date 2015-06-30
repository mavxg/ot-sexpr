//operations

//retain {op:'retain', n:5}
//insert {op:'insert', values:[a b c]}
//insert {op:'insert', values:"text"}
//delete {op:'delete', values:[a b c]}
//delete {op:'delete', values:"text"}
// unpush, unpop

//with linearisation we also need UP and DOWN (with kind)

//with critical regions we also need START END

var Region = require('./lib/region');
var Selection = require('./lib/selection');

//op types
var RETAIN  = "retain";
var INSERT  = "insert";
var DELETE  = "delete";
var START   = "start";
var END     = "end";

//types
var SYMBOL  = "sym";
var NUMBER  = "num";
var CHAR    = "char";
var OBJ     = "obj";
var PUSH    = "push"; //value is LIST or STRING
var POP     = "pop";

var STRING  = "string";
var LIST    = "list";

//linearisation
var pushA = function(attributes) { return {op:INSERT, value:LIST, type:PUSH, n:1, attributes:attributes}; }
var pushS = function(attributes) { return {op:INSERT, value:STRING, type:PUSH, n:1, attributes:attributes}; }
var pop   = {op:INSERT, type:POP, n:1};

//critical regions
var start   = {op:START};
var end     = {op:END};

//standard text/list operations
function r(n, attributes, unattributes) {
  return {op:RETAIN, n:n, attributes:attributes, unattributes:unattributes};
}

function _i(vs, type, attributes) {
  return {op:INSERT,
    value:vs,
    type:type,
    n:(type === CHAR ? vs.length : 1),
    attributes:attributes
  };
}

function _d(vs, type, attributes) {
  return {op:DELETE,
    value:vs,
    type:type,
    n:(type === CHAR ? vs.length : 1),
    unattributes:attributes //we should make this attributes or 
                            //unattributes depending on what makes 
                            //the code simplest
  };
}

var equal = require('./lib/is').equal;

//we might have the pops the wrong way up... (at the moment we don't check kind)

//RULES
// [r(a),r(b)] -> [r(a+b)] iff attributes match
// [i(a),i(b)] -> [i(a.concat(b))] iff char and attributes match
// [start,end] -> []
// [end,start] -> []

function _push(ops, op) {
  if (ops.length === 0)
    return ops.push(op);

  var t = ops[ops.length-1];
  switch (op.op) {
    case RETAIN:
      if (t.op === RETAIN && equal(op.attributes, t.attributes) && equal(op.unattributes, t.unattributes)) {
        ops.pop();
        return _push(ops, r(t.n + op.n));
      }
      break;
    case INSERT:
      if (t.op === INSERT &&
        op.type === CHAR &&
        t.type === CHAR &&
        equal(op.attributes, t.attributes)) {
        ops.pop();
        return _push(ops, i(t.value.concat(op.values)), CHAR, t.attributes);
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
  }
  return ops.push(op);
}

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
      case INSERT: return _d(op.value, op.type, op.attributes);
      case DELETE: return _i(op.value, op.type, op.unattributes);
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
  if (op.type === CHAR)
    if (op.op === DELETE)
      return _d(op.value.slice(s,e), CHAR, op.unattributes);
    else //insert
      return _i(op.value.slice(s,e), op.type, op.attributes); //TODO... slice attributes...
  if (op.op === RETAIN)
    return r((e === undefined ? op.n : e) - s, op.attributes, op.unattributes);
  return op;
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

  var append = makeAppend(result);
  var _funs  = makeTake(opA);
  var take   = _funs.take;
  var peek   = _funs.peek;

  var chunk;
  var length = 0;
  var op;

  function retain(length) {
    while (length > 0) {
      chunk = take(length, DELETE);
      if (chunk === null) throw "Retain failed for this compose"
      switch (chunk.op) {
        case INSERT:
          append(chunk); //TODO remove op.unattributes from chunk.attributes
                         //     add op.attributes to chunk.attributes
          length -= chunk.n;
          break;
        case RETAIN:
          append(chunk); //TODO remove op.unattributes from chunk.attributes or add to chunk.unattributes
                         //     add op.attributes to chunk.attributes
          length -= chunk.n;
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
      case INSERT:
        append(op);
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
              length -= chunk.n;
              s += chunk.n;
              break;
            case RETAIN:
              append(_slice(op,s,s+chunk.n));
              length -= chunk.n;
              s += chunk.n;
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

  var append = makeAppend(result);
  var _funs  = makeTake(opA);
  var take   = _funs.take;
  var peek   = _funs.peek;

  var chunk;
  var op;

  //gobble opA while input
  function gobble() {
    while((chunk=peek()) && chunk.op === INSERT)
      append(take(-1));
  }

  function del(op) {
    var length = op.n;
    while (length > 0) {
      chunk = take(length, INSERT);
      switch (chunk.op) {
        case INSERT:
          append(chunk);
          break;
        case DELETE:
        case RETAIN:
          length -= chunk.n;
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
    while (length > 0) {
      chunk = take(length, INSERT);
      append(chunk);
      switch (chunk.op) {
        case INSERT:
          break;
        case RETAIN:
        case DELETE:
          length -= chunk.n;
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
  
  for (var i = 0; i < opB.length; i++) {
    op = opB[i];
    switch (op.op) {
      case INSERT:
        if (left) gobble();
        append(r(op.n)) //skip over inserted
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

function transformPoint(point, ops) {
  var pos = 0
  var cursor = point;

  for (var i=0; i < ops.length; i++) {
    var c = ops[i];
    var op_type = c.op;

    if (cursor <= pos) break;

    switch (op_type) {
      case INSERT:
        cursor += c.n;
      case RETAIN:
        pos += c.n;
        break;
      case DELETE:
        cursor[depth] -= Math.min(c.n, cursor - pos);
        break;
    };
  }
  return cursor;
}

function transformRegion(region, op) {
  var nfocus = transformPoint(region.focus, op);
  if (region.empty()) {
    return (nfocus === region.focus ? region : new Region(nfocus));
  }
  var nanchor = transformPoint(region.anchor, op);
  if (nfocus !== region.focus || nanchor !== region.anchor)
    return new Region(nfocus, nanchor);
  return region;
}

//TODO: add some form of put cursor here for ownOp
function transformCursor(cursor, op, isOwnOp) {
  //For now assume that the editor moved the cursor for us
  // when it is our op.
  if (isOwnOp)
    return cursor;
  var nrs = [];
  var changed = false;
  for (var i = cursor.regions.length - 1; i >= 0; i--) {
    var region = transformRegion(cursor.regions[i], op);
    if (region !== cursor.regions[i]) changed = true;
    nrs.push(region);
  };
  return (changed ? new Selection(nrs) : cursor);
}


function __old_model_apply(doc, op1) {
  var ops = (op1 instanceof Operations) ? op1 : Operations.fromOp(op1);
  var seed = (doc !== null) ? doc.maxId() : 0;
  var stack = [];
  var stacks = [];
  var _level = 1000000;
  var op;
  var offset = 0;
  var lin;

  if (ops.inputLen !== doc.length)
    throw "Operations input length does not match document length(" + ops.inputLen + ' vs ' +  doc.length + ')';

  function unwind(toLevel) {
    var t;
    while (_level <= toLevel && (t = stacks.pop())) {
      _level = t.level;
      var c = stack;
      stack = t.stack;
      stack.push(new t.klass(t.id, c, t.attributes));
    }
  }

  function process(obj) {
    var lvl;
    if (obj instanceof TypeSpec) {
      var c = [];
      var klass = KLASS[obj._type] || Node;
      var lvl = klass.prototype.level;
      if (lvl >= _level) unwind(lvl);
      stacks.push({stack: stack, klass: klass, level: _level, id: obj.id, attributes: obj.attributes});
      stack = [];
      _level = lvl;
      
    } else if (typeof obj === 'string' && 
      typeof stack[stack.length - 1] === 'string') {
      stack[stack.length - 1] = stack[stack.length - 1] + obj;
    } else {
      lvl = level(obj);
      if (lvl >= _level) unwind(lvl);
      stack.push(obj);
    }
  }

  function fromObj(obj) {
    if (typeof obj === 'string') return obj;
    if (obj._type)  return new TypeSpec(obj._type, obj.id || ++seed, obj.attributes);
    if (obj.tag)    return new Tag(obj.tag, obj.value);
    if (obj.endTag) return new EndTag(obj.endTag);
    //if (obj.attrib) return new Attrib(obj.attrib, obj.value);
    return obj;
  }

  for (var i = 0; i < ops.ops.length; i++) {
    var op = ops.ops[i];
    if (ops.isRetain(op)) {
      lin = doc.prefix(offset, offset + op.n, false, _level);
      lin.forEach(process);
    } else if (ops.isInsert(op)) {
      process(fromObj(op.str));
    } else { //remove
      //TODO: check that remove actually matches
    }
    offset += op.inputLen;
  };
  unwind(1000000);
  return stack.pop();
}

function apply(d,ops) {
  //stack and t(op) for traversing output document
  var stack = []
  var t = [];
  var op;
  var offset = 0;

  //stack for traversing the document
  var docStack = [];
  var dp = d;
  var index = 0; //offset in element

  function append(vals) {
    if (typeof t === 'string') {
      t += vals
    } else {
      var id = t.id;
      t = t.concat(vals);
      t.id = id;
    }
  }

  function retain(n, attributes, unattribute) {

  }

  for (var i = 0; i < ops.length; i++) {
    op = ops[i];
    switch (op.op) {
      case INSERT:
        process(op);
        break;
      case RETAIN:
        lin = prefix(doc, offset, offset + op.n);
        //TODO: unattribute
        //TODO: attribute
        lin.forEach(process);
        offset += op.n;
        break;
      case DELETE:
        offset += op.n;
        break;
      default:
        //do nothing for Start and End.
        break;
    }
  };

  if (offset < d.size) {
      lin = prefix(doc, offset, d.size);
      lin.forEach(process);
  }

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
  Region: Region,
  Selection: Selection,
  diff: diff,
  optypes: {
    retain  : r,
    insert  : _i,
    "delete": _d,
    pop     : pop,
    pushA   : pushA,
    pushS   : pushS,
    start   : start,
    end     : end,
  },
};