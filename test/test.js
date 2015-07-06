var chai = require('chai');
var expect = chai.expect;
var assert = chai.assert;

var ot = require('../');
var parse = ot.parse;

var compose = ot.compose;
var transform = ot.transform;
var invert = ot.invert;
var apply = ot.apply;
var opt = ot.operations;
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

var longdoc = parse('(doc (section ' +
  '(h1 "Welcome to SlateJS") ' +
  '(p "Welcome to your editor.") ' + 
  '(p [[76,{}],[2,{"sub":true}],[24,{}],[2,{"sup":true}],[76,{}],[16,{"href":"http://google.co.uk"}],[177,{}]]"Lorem ipsum dolor sit amet, consectetur adipisicing elit. Corrupti, aliquid ex necessitatibus repellatTM a illo fuga dolore aperiam totam tempore nisi neque delectus labore, nihil quae dignissimos dolores mollitia? Vel sunt neque voluptatibus excepturi laboriosam possimus adipisci quidem dolores, omnis nemo dolore eligendi blanditiis, voluptatem in doloribus hic aperiam.") ' +
  '))')[0];

var docs  = parse('(doc (p "Hello, World!"))')[0];
var docsb = parse('(doc (p [[7,{}],[6,{"bold":true}]]"Hello, World!"))')[0];

var doca = parse('{"title":"Tests"}(doc (p "Hello, World!"))')[0];
var docb = parse('{"title":"Tests"}(doc (p [[7,{}],[6,{"bold":true}]]"Hello, World!"))')[0];

//insert text
var opa = [r(12),i("Cruel ","char")];

//bold text
var opb = [r(12),r(6,{bold:true})];

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
var opdi = [r(12),d("World!","char"),i("Barnabus","char")];
//delete
var opd = [r(10),d(", World!","char")];

//invert targets
var opbi = [r(12),r(6,UNDEFINED,{bold:true})];

//[upA,r(2),upA,r(3),upA,r(2),upS,i("Cruel "),down,r(6),down,down,down]
//[upA,r(2),upA,r(3),upA,r(2),upS,i("Cruel "),r(6),down,down,down,down]

//target = compose(opa,opbp) = compose(opb,opap)
var opab = [r(12),i("Cruel ","char"),r(6,{bold:true})];

//[upA,r(2),upA,r(2),upS,r(7),                              pop,pushA,i([bold,[]]),pushS,i("Cruel ")                                      ,r(6),pop,down,down,down]
//[upA,r(2),upA,r(2),upS,r(1),upA,r(2),upS,i("Cruel "),r(4),pop,pushA,i([bold,[]]),down,down,down,down,pushS,r(6),pop,down,down,down]

//target transformed
var opbp = [r(12+6),r(6,{bold:true})];
var opap = [r(12),i("Cruel ","char")];

//target transformed by opu
//var opbpu = [upA,r(2),upA,r(2),upS,r(7),
//  pop,pushA,i([bold,[]]),pushS,r(12),pop,down,down,down];
var opapu  = [r(11),i("Cruel ","char")];
var opapuu = [r(11),i("Cruel ","char")];
var opapup = [r(12),i("Cruel ","char")];

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

describe('Apply', function() {
  it ('Can apply unpush/push', function() {
    var d = apply(doca, opup);
    assert.equal(d.toSexpr(),'{"title":"Tests"}(doc p ("Hello, World!"))')
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
    assert.equal(d.toSexpr(),'{"title":"Tests"}(doc (p "Hello"))');
  });

  it ('Can replace characters', function() {
    var d = apply(doca, opdi);
    assert.equal(d.toSexpr(),'{"title":"Tests"}(doc (p "Hello, Barnabus"))');
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
    assert.equal(d.toSexpr(),'{"title":"Tests"}(doc (p "Hello, Cruel Barnabus"))');
  });

  it ('Can transform delete by insert', function() {
    var p = transform(opdi,opa,'left');
    var d = apply(apply(doca,opa),p);
    assert.equal(d.toSexpr(),'{"title":"Tests"}(doc (p "Hello, Cruel Barnabus"))');
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

  it ('Can slice region', function() {
    var s = new Selection();
    var r1 = new Region(29, 25);
    var r2 = new Region(13, 23);
    s = s.add(r1);
    s = s.add(r2);
    var ss = s.slice(22,26);
    var r1a = new Region(29-22, 25-22);
    var r2a = new Region(13-22, 23-22);
    var target = new Selection([r2a, r1a]);
    assert.equal(JSON.stringify(ss),JSON.stringify(target));
  })
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
});

describe('Insert', function() {
  it ('Can insert text', function() {
    var op = docs.insertText(12,"Cruel ");
    var d = apply(docs, op);
    assert.equal(d.toSexpr(), '(doc (p "Hello, Cruel World!"))');
  });

  it ('Can insert text and attributes', function() {
    var op = docs.insertText(12,"Cruel ",{bold:true});
    var d = apply(docs, op);
    assert.equal(d.toSexpr(), '(doc (p [[7,{}],[6,{"bold":true}],[6,{}]]"Hello, Cruel World!"))');
  });

  it ('Can insert text before existing attributes', function() {
    var op = docsb.insertText(12,"Cruel ");
    var d = apply(docsb, op);
    assert.equal(d.toSexpr(), '(doc (p [[13,{}],[6,{"bold":true}]]"Hello, Cruel World!"))');
  });

  it ('Can insert text within existing attributes', function() {
    var op = docsb.insertText(17,"ly");
    var d = apply(docsb, op);
    assert.equal(d.toSexpr(), '(doc (p [[7,{}],[8,{"bold":true}]]"Hello, Worldly!"))');
  });

  it ('Can insert text after existing attributes', function() {
    var op = docsb.insertText(18," You bold thing.");
    var d = apply(docsb, op);
    assert.equal(d.toSexpr(), '(doc (p [[7,{}],[22,{"bold":true}]]"Hello, World! You bold thing."))');
  });
});

describe('Replace', function() {
  it ('Can replace text', function() {
    var r = new Region(12,17);
    var op = docs.replaceText(r, "Sexy");
    var d = apply(docs, op);
    assert.equal(d.toSexpr(), '(doc (p "Hello, Sexy!"))');
  });

  it ('Can replace text and attributes', function() {
    var r = new Region(12,18);
    var op = docs.replaceText(r, "Sexy!", {bold:true});
    var d = apply(docs, op);
    assert.equal(d.toSexpr(), '(doc (p [[7,{}],[5,{"bold":true}]]"Hello, Sexy!"))');
  });

  it ('Can replace text before existing attributes', function() {
    var r = new Region(12,12);
    var op = docsb.replaceText(r,"Cruel ");
    var d = apply(docsb, op);
    assert.equal(d.toSexpr(), '(doc (p [[13,{}],[6,{"bold":true}]]"Hello, Cruel World!"))');
  });

  it ('Can replace text within existing attributes', function() {
    var r = new Region(13,17);
    var op = docsb.replaceText(r,"aldo");
    var d = apply(docsb, op);
    assert.equal(d.toSexpr(), '(doc (p [[7,{}],[6,{"bold":true}]]"Hello, Waldo!"))');
  });

  it ('Can replace text after existing attributes', function() {
    var r = new Region(18,18);
    var op = docsb.replaceText(r," You bold thing.");
    var d = apply(docsb, op);
    assert.equal(d.toSexpr(), '(doc (p [[7,{}],[22,{"bold":true}]]"Hello, World! You bold thing."))');
  });
});

describe('Attribute', function() {
  it ('Can bold text', function() {
    var r = new Region(3,18);
    var op = docs.attribute(r, {bold:true}, 'text');
    var d = apply(docs, op);
    assert.equal(d.toSexpr(), '(doc (p [[13,{"bold":true}]]"Hello, World!"))');
  });

  it ('Can bold text with existing bold', function() {
    var r = new Region(3,14);
    var op = docsb.attribute(r, {bold:true}, 'text');
    var d = apply(docsb, op);
    assert.equal(d.toSexpr(), '(doc (p [[13,{"bold":true}]]"Hello, World!"))');
  });

  it ('Can bold/italic text with existing bold', function() {
    var r = new Region(3,14);
    var op = docsb.attribute(r, {bold:true,italic:true}, 'text');
    var d = apply(docsb, op);
    assert.equal(d.toSexpr(), '(doc (p [[9,{"bold":true,"italic":true}],[4,{"bold":true}]]"Hello, World!"))');
  });

  it ('Can add single attribute to paragraph', function() {
    var r = new Region(2,5);
    var op = docs.attribute(r, {img:"http://images/me.jpg"});
    var d = apply(docs, op);
    assert.equal(d.toSexpr(), '(doc {"img":"http://images/me.jpg"}(p "Hello, World!"))');
  });

  it ('Can add multiple attributes to paragraph', function() {
    var r = new Region(2,5);
    var op = docs.attribute(r, {img:"http://images/me.jpg",style:"grid"});
    var d = apply(docs, op);
    assert.equal(d.toSexpr(), '(doc {"img":"http://images/me.jpg","style":"grid"}(p "Hello, World!"))');
  });

  it ('Can attribute across paragraphs', function() {
    var r = new Region(66,40);
    var op = longdoc.attribute(r, {bold:true}, 'text');
    var d = apply(longdoc, op);
    assert.equal(d.toSexpr(), '(doc (section (h1 "Welcome to SlateJS") (p [[10,{}],[13,{"bold":true}]]"Welcome to your editor.") (p [[8,{"bold":true}],[68,{}],[2,{"sub":true}],[24,{}],[2,{"sup":true}],[76,{}],[16,{"href":"http://google.co.uk"}],[177,{}]]"Lorem ipsum dolor sit amet, consectetur adipisicing elit. Corrupti, aliquid ex necessitatibus repellatTM a illo fuga dolore aperiam totam tempore nisi neque delectus labore, nihil quae dignissimos dolores mollitia? Vel sunt neque voluptatibus excepturi laboriosam possimus adipisci quidem dolores, omnis nemo dolore eligendi blanditiis, voluptatem in doloribus hic aperiam.")))');
  });

});

describe('Unattribute', function() {
  it ('Can unbold text', function() {
    var r = new Region(3,18);
    var op = docsb.unattribute(r, {bold:true}, 'text');
    var d = apply(docsb, op);
    assert.equal(d.toSexpr(), '(doc (p "Hello, World!"))');
  });

  it ('Can bold/italic and then unitalic text', function() {
    var r = new Region(3,14);
    var op = docsb.attribute(r, {bold:true,italic:true}, 'text');
    var d = apply(docsb, op);
    var opu = d.unattribute(r, {italic:true}, 'text');
    var du = apply(d, opu)
    assert.equal(du.toSexpr(), '(doc (p [[13,{"bold":true}]]"Hello, World!"))');
  });

  it ('Can untitle document', function() {
    var r = new Region(0,14);
    var op = doca.unattribute(r, {"title":"Tests"});
    var d = apply(doca, op);
    assert.equal(d.toSexpr(), '(doc (p "Hello, World!"))');
  });

});

describe('isText', function() {
  it ('Before start of text', function() {
    var b = docs.isText(4);
    assert.equal(b, false);
  });

  it ('Start of text', function() {
    var b = docs.isText(5);
    assert.equal(b, true);
  });

  it ('Middle of text', function() {
    var b = docs.isText(8);
    assert.equal(b, true);
  });

  it ('End of text', function() {
    var b = docs.isText(18);
    assert.equal(b, true);
  });

  it ('Outside string', function() {
    var b = docs.isText(2);
    assert.equal(b, false);
  });
});

function MockStore(doc, ottype) {
  this.snapshot = doc;
  this.ottype = ottype;
  this.api = ottype.api(this.getSnaphot.bind(this), this.submitOp.bind(this));
};
MockStore.prototype.getSnaphot = function() {
  return this.snapshot;
};
MockStore.prototype.submitOp = function(op) {
  this.snapshot = this.ottype.apply(this.snapshot, op);
};

/* TODO: change the api tests to match the new exports format
describe('API', function() {
  var doca  = parse('(doc (p "Hello, World!") (p "It\'s me, Ben."))')[0];
  var docb  = parse('(doc (p [[13,{"bold":true}]]"Hello, World!") (p [[13,{"bold":true}]]"It\'s me, Ben."))')[0];


  it ('Can insertTexts', function() {
    var sel = new Selection([new Region(12), new Region(32)]);
    var store = new MockStore(doca, ot);
    store.api.replaceText(sel, "Cruel ");
    assert.equal(store.getSnaphot().toSexpr(),'(doc (p "Hello, Cruel World!") (p "It\'s me, Cruel Ben."))')
  });

  it ('Can insertTexts with attributes', function() {
    var sel = new Selection([new Region(12), new Region(32)]);
    var store = new MockStore(doca, ot);
    store.api.replaceText(sel, "Cruel ", {bold:true});
    assert.equal(store.getSnaphot().toSexpr(),
      '(doc (p [[7,{}],[6,{"bold":true}],[6,{}]]"Hello, Cruel World!") (p [[9,{}],[6,{"bold":true}],[4,{}]]"It\'s me, Cruel Ben."))')
  });

  it ('Can replaceTexts', function() {
    var sel = new Selection([new Region(13,17), new Region(33,35)]);
    var store = new MockStore(doca, ot);
    store.api.replaceText(sel, "ane");
    assert.equal(store.getSnaphot().toSexpr(),
      '(doc (p "Hello, Wane!") (p "It\'s me, Bane."))');
  });

  it ('Can replace atomic', function() {
    var sel = new Selection([new Region(21,22)]);
    var store = new MockStore(doca, ot);
    store.api.replace(sel, [i('li','sym')]);
    assert.equal(store.getSnaphot().toSexpr(),'(doc (p "Hello, World!") (li "It\'s me, Ben."))');
  });

  it ('Can bold text', function() {
    var sel = new Selection([new Region(12,18), new Region(32,36)]);
    var store = new MockStore(doca, ot);
    store.api.setAttributes(sel, {bold:true}, 'text');
    assert.equal(store.getSnaphot().toSexpr(),
      '(doc (p [[7,{}],[6,{"bold":true}]]"Hello, World!") (p [[9,{}],[4,{"bold":true}]]"It\'s me, Ben."))');
  });

  it ('Can unbold texts', function() {
    var sel = new Selection([new Region(12,18), new Region(32,36)]);
    var store = new MockStore(docb, ot);
    store.api.unsetAttributes(sel, {bold:true}, 'text');
    assert.equal(store.getSnaphot().toSexpr(),
      '(doc (p [[7,{"bold":true}],[6,{}]]"Hello, World!") (p [[9,{"bold":true}],[4,{}]]"It\'s me, Ben."))');
  });
});
*/