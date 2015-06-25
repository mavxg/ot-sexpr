var chai = require('chai');
var expect = chai.expect;
var assert = chai.assert;

var ot = require('../');

var compose = ot.compose;
var transform = ot.transform;
var invert = ot.invert;
var apply = ot.apply;
var opt = ot.optypes;

var Point = ot.Point;
var Region = ot.Region;
var Selection = ot.Selection;

var r = opt.retain;
var i = opt.insert;
var d = opt['delete'];
var upA = opt.upA;
var upS = opt.upS;
var down = opt.down;
var pushS = opt.pushS;
var pushA = opt.pushA;
var unpushS = opt.unpushS;
var unpushA = opt.unpushA;
var pop = opt.pop;
var unpop = opt.unpop;

var doc     = "doc";
var p       = "p";
var bold    = "bold";

var doca  = [doc,["title", "Tests"],[p,[],"Hello, World!"]];
var docb  = [doc,["title", "Tests"],[p,[],'Hello, ',[bold,[],'World!']]];
var docd  = [doc,["title", "Tests"],[p,[],"Hello"]];
var docdi = [doc,["title", "Tests"],[p,[],"Hello, Barnabus"]];
var docadi = [doc,["title", "Tests"],[p,[],"Hello, Cruel Barnabus"]];

//insert text
var opa = [upA,r(2),upA,r(2),upS,r(7),i("Cruel "),r(6),down,down,down];
//bold text
var opb = [upA,r(2),upA,r(2),upS,r(7),
  pop,pushA,i([bold,[]]),pushS,r(6),pop,down,down,down];
//Note: the list inserted after bold is atomic.

//should not modify a or b under transform
var opc = [upA,r(1),upA,i(["href","qubic.io"]),down,r(1),down];

//Unpush test
var opu = [upA,r(2),unpushA,r(3),unpop,down];

//non overlapping unpush test
var opuu = [upA,r(1),unpushA,r(2),unpop,r(1),down];

//half overlapping unpush push
var opup = [upA,r(2),unpushA,r(1),pushA,r(2),down,down];

//delete insert
var opdi = [upA,r(2),upA,r(2),upS,r(7),d("World!"),i("Barnabus"),down,down,down];
//delete
var opd = [upA,r(2),upA,r(2),upS,r(5),d(", World!"),down,down,down];

//invert targets
var opbi = [upA,r(2),upA,r(2),upS,r(7),
  unpop,unpushA,d([bold,[]]),unpushS,r(6),unpop,down,down,down];

//[upA,r(2),upA,r(3),upA,r(2),upS,i("Cruel "),down,r(6),down,down,down]
//[upA,r(2),upA,r(3),upA,r(2),upS,i("Cruel "),r(6),down,down,down,down]

//target = compose(opa,opbp) = compose(opb,opap)
var opab = [upA,r(2),upA,r(2),upS,r(7),
  pop,pushA,i([bold,[]]),pushS,i("Cruel "),r(6),pop,down,down,down]

//[upA,r(2),upA,r(2),upS,r(7),                              pop,pushA,i([bold,[]]),pushS,i("Cruel ")                                      ,r(6),pop,down,down,down]
//[upA,r(2),upA,r(2),upS,r(1),upA,r(2),upS,i("Cruel "),r(4),pop,pushA,i([bold,[]]),down,down,down,down,pushS,r(6),pop,down,down,down]

//target transformed
var opbp = [upA,r(2),upA,r(2),upS,r(7),
  pop,pushA,i([bold,[]]),pushS,r(12),pop,down,down,down];
var opap = [upA,r(2),upA,r(3),
  upA,r(2),upS,i("Cruel "),r(6),down,down,down,down];

//target transformed by opu
//var opbpu = [upA,r(2),upA,r(2),upS,r(7),
//  pop,pushA,i([bold,[]]),pushS,r(12),pop,down,down,down];
var opapu  = [upA,r(4),upS,r(7),i("Cruel "),r(6),down,down];
var opapuu = [upA,r(3),upA,r(2),upS,r(7),i("Cruel "),r(6),down,down,down];
var opapup = [upA,r(3),upA,r(1),upS,r(7),i("Cruel "),r(6),down,down,down];

//console.log(apply(apply(doca,opa),opbp))
//console.log(apply(apply(doca,opb),opap))

describe('Compose', function() {
  it ('Can compose insert and bold', function() {
    var comp = compose(opa,opbp);
    assert.equal(JSON.stringify(opab),JSON.stringify(comp));
  });

  it ('Can compose bold and insert', function() {
    var comp = compose(opb,opap);
    assert.equal(JSON.stringify(opab),JSON.stringify(comp));
  });

  it ('Self invert composes to retain 1', function() {
    var comp = compose(opb,invert(opb));
    assert.equal(JSON.stringify([r(1)]),JSON.stringify(comp));
  });
});

describe('Invert', function() {
  it ('Invert bold', function() {
    var inv = invert(opb);
    assert.equal(JSON.stringify(opbi),JSON.stringify(inv));
  });
});

describe('Delete', function() {
  it ('Can delete characters', function() {
    var d = apply(doca, opd);
    assert.equal(JSON.stringify(d),JSON.stringify(docd));
  });

  it ('Can replace characters', function() {
    var d = apply(doca, opdi);
    assert.equal(JSON.stringify(d),JSON.stringify(docdi));
  });
});


describe('Transform', function() {
  it ('Can transform insert by bold', function() {
    var p = transform(opa,opb);
    assert.equal(JSON.stringify(p),JSON.stringify(opap));
  });

  it ('Can transform bold by insert', function() {
    var p = transform(opb,opa,"left");
    assert.equal(JSON.stringify(p),JSON.stringify(opbp));
  });

  it ('Can transform with unpush/pop', function() {
    var p = transform(opa,opu);
    assert.equal(JSON.stringify(p),JSON.stringify(opapu));
  });

  it ('Can transform with non overlapping unpush/pop', function() {
    var p = transform(opa,opuu);
    assert.equal(JSON.stringify(p),JSON.stringify(opapuu));
  });

  it ('Can transform with half overlapping unpush/pop', function() {
    var p = transform(opa,opup);
    assert.equal(JSON.stringify(p),JSON.stringify(opapup));
  });

  it ('Subtree inserts cause identity transform', function() {
    var ac = transform(opa,opc);
    var bc = transform(opb,opc);
    assert.equal(JSON.stringify(ac),JSON.stringify(opa));
    assert.equal(JSON.stringify(bc),JSON.stringify(opb));
  });

  it ('Can transform insert by delete', function() {
    var p = transform(opa,opdi);
    var d = apply(apply(doca,opdi),p);
    assert.equal(JSON.stringify(docadi),JSON.stringify(d));
  });

  it ('Can transform delete by insert', function() {
    var p = transform(opdi,opa,'left');
    var d = apply(apply(doca,opa),p);
    assert.equal(JSON.stringify(docadi),JSON.stringify(d));
  });
});

describe('Section', function() {
  it ('Can add Regions', function() {
    var s = new Selection();
    var r1 = new Region(new Point([2,9]), new Point([2,5]));
    var r2 = new Region(new Point([1,3]), new Point([2,3]));
    s = s.add(r1);
    s = s.add(r2);
    var target = new Selection([r2,r1]);
    assert.equal(JSON.stringify(s),JSON.stringify(target));
  });

  it ('Can add intersecting regions', function() {
    var s = new Selection();
    var r1 = new Region(new Point([2,9]), new Point([2,5]));
    var r2 = new Region(new Point([1,3]), new Point([2,3]));
    var r3 = new Region(new Point([2,6]), new Point([2,2]));
    s = s.add(r1);
    s = s.add(r2);
    s = s.add(r3);
    var target = new Selection([new Region(new Point([2,9]), new Point([1,3]))]);
    assert.equal(JSON.stringify(s),JSON.stringify(target));
  });

  it ('Can subtract region', function() {
    var s = new Selection();
    var r1 = new Region(new Point([2,9]), new Point([2,5]));
    var r2 = new Region(new Point([1,3]), new Point([2,3]));
    var r3 = new Region(new Point([2,6]), new Point([2,2]));
    s = s.add(r1);
    s = s.add(r2);
    s = s.subtract(r3);
    var r1a = new Region(new Point([2,9]), new Point([2,6]));
    var r2a = new Region(new Point([1,3]), new Point([2,2]));
    var target = new Selection([r2a, r1a]);
    assert.equal(JSON.stringify(s),JSON.stringify(target));
  });
});


describe('TransformCursor', function() {
  //TODO
  //it ('Insert before moves cursor forward', function() {
    //TODO
  //});

  //it ('Insert after has no effect', function() {
    //TODO
  //});

  //it ('Push pop before moves cursor forward', function() {
    //TODO
  //});

  //it ('Push pop surrounding deepens cursor', function() {
    //TODO
  //});
});