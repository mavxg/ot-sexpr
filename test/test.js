var chai = require('chai');
var expect = chai.expect;
var assert = chai.assert;

var ot = require('../');
var parse = require('../lib/parser');

var compose = ot.compose;
var transform = ot.transform;
var invert = ot.invert;
var apply = ot.apply;
var opt = ot.optypes;
var transformCursor = ot.transformCursor

var Region = ot.Region;
var Selection = ot.Selection;

var r = opt.retain;
var i = opt.insert;
var d = opt['delete'];
var pushS = opt.pushS;
var pushA = opt.pushA;
var pop = opt.pop;
var unpushS = opt.unpushS;
var unpushA = opt.unpushA;
var unpop = opt.unpop;

var UNDEFINED;

var doca = parse('{"title":"Tests"}(doc (p "Hello, World!"))')[0];
var docb = parse('{"title":"Tests"}(doc [[7,{}],[6,{"bold":true}]](p "Hello, World!"))')[0];
var docd  = parse('{"title":"Tests"}(doc (p "Hello"))')[0];
var docdi = parse('{"title":"Tests"}(doc (p "Hello, Barnabus"))')[0];
var docadi = parse('{"title":"Tests"}(doc (p "Hello, Cruel Barnabus"))')[0];

//insert text
var opa = [r(11),i("Cruel ","char")];
//bold text
var opb = [r(11),r(6,{bold:true})];

var opbh = [r(2),pushA(),i("p","sym"),pushS(),i("A string here","char"),pop,pop];
//Note: the list inserted after bold is atomic.


//should not modify a or b under transform
var opc = [r(5),r(5,{href:"qubic.io"})];

//Unpush test
var opu = [r(2),unpushA(),r(16),unpop];

//non overlapping unpush test
var opuu = [r(2),unpushA(),r(16),unpop];

//half overlapping unpush push
var opup = [r(2),unpushA(),r(1),pushA()];

//delete insert
var opdi = [r(11),d("World!","char"),i("Barnabus","char")];
//delete
var opd = [r(9),d(", World!","char")];

//invert targets
var opbi = [r(11),r(6,UNDEFINED,{bold:true})];

//[upA,r(2),upA,r(3),upA,r(2),upS,i("Cruel "),down,r(6),down,down,down]
//[upA,r(2),upA,r(3),upA,r(2),upS,i("Cruel "),r(6),down,down,down,down]

//target = compose(opa,opbp) = compose(opb,opap)
var opab = [r(11),i("Cruel ","char"),r(6,{bold:true})];

//[upA,r(2),upA,r(2),upS,r(7),                              pop,pushA,i([bold,[]]),pushS,i("Cruel ")                                      ,r(6),pop,down,down,down]
//[upA,r(2),upA,r(2),upS,r(1),upA,r(2),upS,i("Cruel "),r(4),pop,pushA,i([bold,[]]),down,down,down,down,pushS,r(6),pop,down,down,down]

//target transformed
var opbp = [r(11+6),r(6,{bold:true})];
var opap = [r(11),i("Cruel ","char")];

//target transformed by opu
//var opbpu = [upA,r(2),upA,r(2),upS,r(7),
//  pop,pushA,i([bold,[]]),pushS,r(12),pop,down,down,down];
var opapu  = [r(4),i("Cruel ","char")];
var opapuu = [r(3),i("Cruel ","char")];
var opapup = [r(3),i("Cruel ","char")];

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

  it ('Self invert composes to identity op', function() {
    var comp = compose(opb,invert(opb));
    assert.equal(JSON.stringify(comp), "[]");
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
    var r1 = new Region(29, 25);
    var r2 = new Region(13, 23);
    s = s.add(r1);
    s = s.add(r2);
    var target = new Selection([r2,r1]);
    assert.equal(JSON.stringify(s),JSON.stringify(target));
  });

  it ('Can add intersecting regions', function() {
    var s = new Selection();
    var r1 = new Region(29, 25);
    var r2 = new Region(13, 23);
    var r3 = new Region(26, 22);
    s = s.add(r1);
    s = s.add(r2);
    s = s.add(r3);
    var target = new Selection([new Region(29, 13)]);
    assert.equal(JSON.stringify(s),JSON.stringify(target));
  });

  it ('Can subtract region', function() {
    var s = new Selection();
    var r1 = new Region(29, 25);
    var r2 = new Region(13, 23);
    var r3 = new Region(26, 22);
    s = s.add(r1);
    s = s.add(r2);
    s = s.subtract(r3);
    var r1a = new Region(29, 26);
    var r2a = new Region(13, 22);
    var target = new Selection([r2a, r1a]);
    assert.equal(JSON.stringify(s),JSON.stringify(target));
  });
});


describe('TransformCursor', function() {
  var s = new Selection([new Region(12)]);
  var sbf = new Selection([new Region(10)]);
  var sa = new Selection([new Region(12+6)]);
  var sh = new Selection([new Region(12 + 18)]);
  it ('Insert before moves cursor forward', function() {
    var ns = transformCursor(s, opa);
    assert.equal(JSON.stringify(ns),JSON.stringify(sa));
  });

  it ('Insert after has no effect', function() {
    var ns = transformCursor(sbf, sa);
    assert.equal(ns, sbf);
  });

  it ('Push pop before moves cursor forward', function() {
    var ns = transformCursor(s, opbh);
    assert.equal(JSON.stringify(ns),JSON.stringify(sh));
  });

  //it ('Push pop surrounding deepens cursor', function() {
    //TODO
  //});
});