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

var rdoc = parse('(doc (section (p "") {"headerRows":1}(table (row (cell "Cat[]=") (cell "Qube[]") (cell "Other[]") (cell "`Extra")) (row (cell "First") (cell "99") (cell "100") (cell)) (row (cell "Second") (cell "199") (cell "200") (cell)) (row (cell "Third") (cell "299") (cell "300") (cell))) (h1 "Welcome to SlateJS") (p "Welcome to your editor.") (p [[76,{}],[2,{"sub":true}],[24,{}],[2,{"sup":true}],[45,{}]]"Lorem ipsum dolor sit amet, consectetur adipisicing elit. Corrupti, aliquid ex necessitatibus repellatTM a illo fuga dolore aperiam totam tempore nis")) (encrypt (keys {"id":"fd9f5a23f6c7fe09","public":"-----BEGIN PGP PUBLIC KEY BLOCK-----\r\nVersion: OpenPGP.js VERSION\r\nComment: http://openpgpjs.org\r\n\r\nxsBNBFWvl5ABCAC/oD5kPdl8cclqOt08P4OG6A663uTi2U0txEF0swYCsJGV\nLdymx6M1uJLAf7+gJz8/jYRC66E3lhIWcWHl0KAUknFZ3gvaEz5XKm/RFsDs\nqMUMXu4TClw4o5P8JD7tScqhj/fHiwca4bflGjIZhcrXsxKmzQ4hILaZIPBB\nUTKdii0fxmB9n0V+HmakbVoHzQUGSyvsdqd3y+El9OhN+crnGrZ8PyP053BC\neaScNtq5pxVWhOro5+prgz1ijLP6/PkEP3Rby/11XVJPOb5OQenfl/HUQDwM\nuVSk4oxhxOjnhlqeeNhi8/PrYLJwL2fZTITVe6+1clS6VZ2NtZmmd6hpABEB\nAAHNP0JlbmphbWluIE5vcnJpbmd0b24gKFRlc3Qga2V5IGZvciBzbGF0ZWpz\nKSA8YmVuQG5vcnJpbmd0b24ubmV0PsLAeAQTAQIAIgUCVa+XkAIbAwYLCQgH\nAwIGFQgCCQoLBBYCAwECHgECF4AACgkQ/Z9aI/bH/gn38gf/QQmKXwcYzlnH\nNkOFyHaSfm/7jtneyAMPyB1xUdS5rJUbeCcoeRGSVVJP48pkKinPVwqjHiC9\nhJhazUOb/OUlEnF65srLU9Ta91yLPaelezZdywOGZXFvkv5f7cSKUzTDXFaw\nIL0OJZ/sk1pKSZyA4y/84yDW4oe6IzKKd5JBk7gJWsBJmeAPWm9FroZa+agP\nzv+l/dVu9d7143S+mrhM4x6eydoBoI5Dmx4VkSjl1fdmjY+d8VrP6strcdJh\nCs3ejcwPvJV0X47vQsrvyOJT6/2sk/a7J0q0MmW2nk85yXaE0ZULlmwFvUvb\ndYktob9Ox3h0SoifaiTvNuUSlc0xJs7ATQRVr5eQAQgAunFiJEyWjbN2i7i5\ndQScmcue3AqhuTk1SfjJ1G1OJYFK4w0tYmBWoQbRKvuPNv4L/pgy1Xv6PUJE\nqO9lFILQvA1o0enSB9serhumH3LV6eTin/gSlExpLxixdOjleUrYiUj6Ewxv\nTCdB0qAYK+5dGzVHK3D1Kmyux7w3QzRxcZB/N6bwsFKL/fm4h3cBsXTwRKSJ\nAY/ssTPjjDumew/8q2jpsZUOK28ldgMYzIdtP+T/ST/J3sjU2MSXqv4om8zU\n+2GezCVpPrMH2RB7E7W84B2oONslT2RIwa89E5XNqNptTXj7OQbQW68jEvTf\nTqISBMRyrDUjbcuz3Vlnt9nI0QARAQABwsBeBBgBAgAJBQJVr5eQAhsMAAoJ\nEP2fWiP2x/4J+0EH+Pp2tJcBNEdcCt8/pPCGfvntH9uEE5b6czTYSZ/FoK2w\nVdcMDysX0YpNCvtlI6HMhRVRuVVFw/C6WBNXgcxJwC4lJhRRsSRW/QcTwXgY\nlOTlhhUJVOeZlI6Tzh7dDPWhp0lsDqa24FGv49KGYm0uJnV0k6VdyKOZWlQD\n0HhuIeHMAZLb+FOpGCTJhGSpud1lcQYNS/UzzPRFOKxKpr+nk5hX4NPDjjUq\nELEAFqJ3PYpI1/8pihjTZ93TcOl5aFj10qfGHUW8x6LsguOZEgEEna147/IK\n/ubot/ZJ6uvsJJtxEtf7cbKHbUp5r6/THKd51GYHFbBgjN3+Vs7dbwIWng==\r\n=37zK\r\n-----END PGP PUBLIC KEY BLOCK-----\r\n\r\n","key":"-----BEGIN PGP MESSAGE-----\r\nVersion: OpenPGP.js VERSION\r\nComment: http://openpgpjs.org\r\n\r\nwcBMAwGEQSpi3+o9AQgAtoMRfOEtH6IO5wk+ufzbz8j4OV4Cjk5dd/0Mh+n5\np1/vwMxB6+igBg8sRtsB6dqTBU7UJn/jIAv/xgnlVQGm50NNiHBRPrv68OlW\ntRoi6yvhiw0KwQc9m1XYo0YZn6ABjDhEb/t4lIDlLmf1T8nOfJPvzlwVM7eE\nLDXBa9Mx59B8jrXw6mEsX1KHn6NNRj3+5FN7EN008pAY+DxF+RwG1K1L3WhI\nwsbroOnwszZrva7qMmutJyjNJaSQ0t0tnkO5aYDOpUA29Uz9TwSLEqGs7cdA\nYtfkGk6GQtphJIOfX6ix5axPAUf4U/ZA/NHchyAkPSMrGFkD9PCdbo3W8pxA\nYtJkAfYct5c7USz0BFh/rHZxTz3s9plZjmFpyKEqwZRgXq/frokLS/ZP5W8L\nFG7U9t+DGEqEBLHxFM1OPv0oaEldhnKcVkQkNzaMeS+x/4Pk9cRD7Rn0VpPS\ncZUMI3D5BuazlOxuvg==\r\n=Fn6o\r\n-----END PGP MESSAGE-----\r\n"}) (ops)) (section (p [[31,{}],[16,{"href":"http://google.co.uk"}],[177,{}]]"i neque delectus labore, nihil quae dignissimos dolores mollitia? Vel sunt neque voluptatibus excepturi laboriosam possimus adipisci quidem dolores, omnis nemo dolore eligendi blanditiis, voluptatem in doloribus hic aperiam.") {"alignments":["left","right"]}(table (row (cell "Some text to go in the cell") (cell "Header2")) (row (cell [[29,{}],[28,{"strong":true}],[17,{"strong":true,"em":true}],[20,{"em":true}]]"Text this is not bold before Some bold text to go in the bold italic cell. and not bold after.") {"rowSpan":2}(cell "99")) (row (cell [[29,{}],[28,{"strong":true}],[17,{"strong":true,"em":true}],[20,{"em":true}]]"Text this is not bold before Some bold text to go in the bold italic cell. and not bold after.")) (row {"colSpan":2}(cell [[29,{}],[28,{"strong":true}],[17,{"strong":true,"em":true}],[20,{"em":true}]]"Text this is not bold before Some bold text to go in the bold italic cell. and not bold after."))) (p "") {"alignments":["left","right"]}(table (row (cell "Some text to go in the cell") (cell "Header2")) (row (cell [[29,{}],[28,{"strong":true}],[17,{"strong":true,"em":true}],[20,{"em":true}]]"Text this is not bold before Some bold text to go in the bold italic cell. and not bold after.") {"rowSpan":2}(cell "99")) (row (cell [[29,{}],[28,{"strong":true}],[17,{"strong":true,"em":true}],[20,{"em":true}]]"Text this is not bold before Some bold text to go in the bold italic cell. and not bold after.")) (row {"colSpan":2}(cell [[29,{}],[28,{"strong":true}],[17,{"strong":true,"em":true}],[20,{"em":true}]]"Text this is not bold before Some bold text to go in the bold italic cell. and not bold after."))) (p "")) (section (h1 "Another Section") (p "Another paragraph in a another section") (code "Another = Qube * Other + 5") (code "Extra[Cat=First] = 77") (code "Extra = 88") (code "Test[Cat=First] = 123456") (code "Another[Cat=First]") (result (pre "9905")) (code "Qube[Cat=First]") (result (pre "99")) (ulli "First list item") {"indent":2}(ulli "First sub list item") {"indent":3}(ulli "First sub sub list item") (ulli "Second list item") {"indent":2}(ulli "First sub list item") {"indent":2}(ulli "Second sub list item") (olli "First list item") {"indent":2}(olli "First sub list item") {"indent":2}(olli "Second sub list item") (olli "Second list item") (blockquote "This is a really important quote.") (pullquote "This is another really important quote.") {"alignments":["left","right"],"headerRows":1}(table (row (cell "Some text to go in the cell") (cell "Header2")) (row (cell [[29,{}],[28,{"strong":true}],[17,{"strong":true,"em":true}],[20,{"em":true}]]"Text this is not bold before Some bold text to go in the bold italic cell. and not bold after.") {"rowSpan":2}(cell "99")) (row (cell [[29,{}],[28,{"strong":true}],[17,{"strong":true,"em":true}],[20,{"em":true}]]"Text this is not bold before Some bold text to go in the bold italic cell. and not bold after.")) (row {"colSpan":2}(cell [[29,{}],[28,{"strong":true}],[17,{"strong":true,"em":true}],[20,{"em":true}]]"Text this is not bold before Some bold text to go in the bold italic cell. and not bold after."))) (p "")))'.replace(/\n/g,'\\n').replace(/\r/g,'\\r'))[0];
var rdocp = '(doc (section (p "") {"headerRows":1}(table (row (cell "Cat[]=") (cell "Qube[]") (cell "Other[]") (cell "`Extra")) (row (cell "First") (cell "99") (cell "100") (cell)) (row (cell "Second") (cell "199") (cell "200") (cell)) (row (cell "Third") (cell "299") (cell "300") (cell))) (h1 "Welcome to SlateJS") (p "Welcome to your editor.") (p [[76,{}],[2,{"sub":true}],[24,{}],[2,{"sup":true}],[45,{}]]"Lorem ipsum dolor sit amet, consectetur adipisicing elit. Corrupti, aliquid ex necessitatibus repellatTM a illo fuga dolore aperiam totam tempore nis")) (encrypt (keys {"id":"fd9f5a23f6c7fe09","public":"-----BEGIN PGP PUBLIC KEY BLOCK-----\r\nVersion: OpenPGP.js VERSION\r\nComment: http://openpgpjs.org\r\n\r\nxsBNBFWvl5ABCAC/oD5kPdl8cclqOt08P4OG6A663uTi2U0txEF0swYCsJGV\nLdymx6M1uJLAf7+gJz8/jYRC66E3lhIWcWHl0KAUknFZ3gvaEz5XKm/RFsDs\nqMUMXu4TClw4o5P8JD7tScqhj/fHiwca4bflGjIZhcrXsxKmzQ4hILaZIPBB\nUTKdii0fxmB9n0V+HmakbVoHzQUGSyvsdqd3y+El9OhN+crnGrZ8PyP053BC\neaScNtq5pxVWhOro5+prgz1ijLP6/PkEP3Rby/11XVJPOb5OQenfl/HUQDwM\nuVSk4oxhxOjnhlqeeNhi8/PrYLJwL2fZTITVe6+1clS6VZ2NtZmmd6hpABEB\nAAHNP0JlbmphbWluIE5vcnJpbmd0b24gKFRlc3Qga2V5IGZvciBzbGF0ZWpz\nKSA8YmVuQG5vcnJpbmd0b24ubmV0PsLAeAQTAQIAIgUCVa+XkAIbAwYLCQgH\nAwIGFQgCCQoLBBYCAwECHgECF4AACgkQ/Z9aI/bH/gn38gf/QQmKXwcYzlnH\nNkOFyHaSfm/7jtneyAMPyB1xUdS5rJUbeCcoeRGSVVJP48pkKinPVwqjHiC9\nhJhazUOb/OUlEnF65srLU9Ta91yLPaelezZdywOGZXFvkv5f7cSKUzTDXFaw\nIL0OJZ/sk1pKSZyA4y/84yDW4oe6IzKKd5JBk7gJWsBJmeAPWm9FroZa+agP\nzv+l/dVu9d7143S+mrhM4x6eydoBoI5Dmx4VkSjl1fdmjY+d8VrP6strcdJh\nCs3ejcwPvJV0X47vQsrvyOJT6/2sk/a7J0q0MmW2nk85yXaE0ZULlmwFvUvb\ndYktob9Ox3h0SoifaiTvNuUSlc0xJs7ATQRVr5eQAQgAunFiJEyWjbN2i7i5\ndQScmcue3AqhuTk1SfjJ1G1OJYFK4w0tYmBWoQbRKvuPNv4L/pgy1Xv6PUJE\nqO9lFILQvA1o0enSB9serhumH3LV6eTin/gSlExpLxixdOjleUrYiUj6Ewxv\nTCdB0qAYK+5dGzVHK3D1Kmyux7w3QzRxcZB/N6bwsFKL/fm4h3cBsXTwRKSJ\nAY/ssTPjjDumew/8q2jpsZUOK28ldgMYzIdtP+T/ST/J3sjU2MSXqv4om8zU\n+2GezCVpPrMH2RB7E7W84B2oONslT2RIwa89E5XNqNptTXj7OQbQW68jEvTf\nTqISBMRyrDUjbcuz3Vlnt9nI0QARAQABwsBeBBgBAgAJBQJVr5eQAhsMAAoJ\nEP2fWiP2x/4J+0EH+Pp2tJcBNEdcCt8/pPCGfvntH9uEE5b6czTYSZ/FoK2w\nVdcMDysX0YpNCvtlI6HMhRVRuVVFw/C6WBNXgcxJwC4lJhRRsSRW/QcTwXgY\nlOTlhhUJVOeZlI6Tzh7dDPWhp0lsDqa24FGv49KGYm0uJnV0k6VdyKOZWlQD\n0HhuIeHMAZLb+FOpGCTJhGSpud1lcQYNS/UzzPRFOKxKpr+nk5hX4NPDjjUq\nELEAFqJ3PYpI1/8pihjTZ93TcOl5aFj10qfGHUW8x6LsguOZEgEEna147/IK\n/ubot/ZJ6uvsJJtxEtf7cbKHbUp5r6/THKd51GYHFbBgjN3+Vs7dbwIWng==\r\n=37zK\r\n-----END PGP PUBLIC KEY BLOCK-----\r\n\r\n","key":"-----BEGIN PGP MESSAGE-----\r\nVersion: OpenPGP.js VERSION\r\nComment: http://openpgpjs.org\r\n\r\nwcBMAwGEQSpi3+o9AQgAtoMRfOEtH6IO5wk+ufzbz8j4OV4Cjk5dd/0Mh+n5\np1/vwMxB6+igBg8sRtsB6dqTBU7UJn/jIAv/xgnlVQGm50NNiHBRPrv68OlW\ntRoi6yvhiw0KwQc9m1XYo0YZn6ABjDhEb/t4lIDlLmf1T8nOfJPvzlwVM7eE\nLDXBa9Mx59B8jrXw6mEsX1KHn6NNRj3+5FN7EN008pAY+DxF+RwG1K1L3WhI\nwsbroOnwszZrva7qMmutJyjNJaSQ0t0tnkO5aYDOpUA29Uz9TwSLEqGs7cdA\nYtfkGk6GQtphJIOfX6ix5axPAUf4U/ZA/NHchyAkPSMrGFkD9PCdbo3W8pxA\nYtJkAfYct5c7USz0BFh/rHZxTz3s9plZjmFpyKEqwZRgXq/frokLS/ZP5W8L\nFG7U9t+DGEqEBLHxFM1OPv0oaEldhnKcVkQkNzaMeS+x/4Pk9cRD7Rn0VpPS\ncZUMI3D5BuazlOxuvg==\r\n=Fn6o\r\n-----END PGP MESSAGE-----\r\n"}) (ops) (p "")) (section (p [[31,{}],[16,{"href":"http://google.co.uk"}],[177,{}]]"i neque delectus labore, nihil quae dignissimos dolores mollitia? Vel sunt neque voluptatibus excepturi laboriosam possimus adipisci quidem dolores, omnis nemo dolore eligendi blanditiis, voluptatem in doloribus hic aperiam.") {"alignments":["left","right"]}(table (row (cell "Some text to go in the cell") (cell "Header2")) (row (cell [[29,{}],[28,{"strong":true}],[17,{"strong":true,"em":true}],[20,{"em":true}]]"Text this is not bold before Some bold text to go in the bold italic cell. and not bold after.") {"rowSpan":2}(cell "99")) (row (cell [[29,{}],[28,{"strong":true}],[17,{"strong":true,"em":true}],[20,{"em":true}]]"Text this is not bold before Some bold text to go in the bold italic cell. and not bold after.")) (row {"colSpan":2}(cell [[29,{}],[28,{"strong":true}],[17,{"strong":true,"em":true}],[20,{"em":true}]]"Text this is not bold before Some bold text to go in the bold italic cell. and not bold after."))) (p "") {"alignments":["left","right"]}(table (row (cell "Some text to go in the cell") (cell "Header2")) (row (cell [[29,{}],[28,{"strong":true}],[17,{"strong":true,"em":true}],[20,{"em":true}]]"Text this is not bold before Some bold text to go in the bold italic cell. and not bold after.") {"rowSpan":2}(cell "99")) (row (cell [[29,{}],[28,{"strong":true}],[17,{"strong":true,"em":true}],[20,{"em":true}]]"Text this is not bold before Some bold text to go in the bold italic cell. and not bold after.")) (row {"colSpan":2}(cell [[29,{}],[28,{"strong":true}],[17,{"strong":true,"em":true}],[20,{"em":true}]]"Text this is not bold before Some bold text to go in the bold italic cell. and not bold after."))) (p "")) (section (h1 "Another Section") (p "Another paragraph in a another section") (code "Another = Qube * Other + 5") (code "Extra[Cat=First] = 77") (code "Extra = 88") (code "Test[Cat=First] = 123456") (code "Another[Cat=First]") (result (pre "9905")) (code "Qube[Cat=First]") (result (pre "99")) (ulli "First list item") {"indent":2}(ulli "First sub list item") {"indent":3}(ulli "First sub sub list item") (ulli "Second list item") {"indent":2}(ulli "First sub list item") {"indent":2}(ulli "Second sub list item") (olli "First list item") {"indent":2}(olli "First sub list item") {"indent":2}(olli "Second sub list item") (olli "Second list item") (blockquote "This is a really important quote.") (pullquote "This is another really important quote.") {"alignments":["left","right"],"headerRows":1}(table (row (cell "Some text to go in the cell") (cell "Header2")) (row (cell [[29,{}],[28,{"strong":true}],[17,{"strong":true,"em":true}],[20,{"em":true}]]"Text this is not bold before Some bold text to go in the bold italic cell. and not bold after.") {"rowSpan":2}(cell "99")) (row (cell [[29,{}],[28,{"strong":true}],[17,{"strong":true,"em":true}],[20,{"em":true}]]"Text this is not bold before Some bold text to go in the bold italic cell. and not bold after.")) (row {"colSpan":2}(cell [[29,{}],[28,{"strong":true}],[17,{"strong":true,"em":true}],[20,{"em":true}]]"Text this is not bold before Some bold text to go in the bold italic cell. and not bold after."))) (p "")))'.replace(/\n/g,'\\n').replace(/\r/g,'\\r');

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

  it ('Can apply retain(1)', function() {
    var op = [{"op":"retain","n":362},{"op":"start"},{"op":"retain","n":9},{"op":"insert","value":"list","type":"push","n":1},{"op":"insert","value":"p","type":"sym","n":1},{"op":"insert","value":"string","type":"push","n":1},{"op":"insert","value":"string","type":"pop","n":1},{"op":"insert","value":"list","type":"pop","n":1},{"op":"retain","n":1},{"op":"end"}];
    var d = apply(rdoc, op);
    assert.equal(d.toSexpr(), rdocp);
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
    var r1a = new Region(5, 25-22); //adjusted end to be +1 from the slice
    var r2a = new Region(-1, 23-22);
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

  
  it ('Can attribute across existing attribute', function() {
    var r = new Region(142,127);
    var op = longdoc.attribute(r, {bold:true}, 'text');
    var d = apply(longdoc, op);
    assert.equal(d.toSexpr(), '(doc (section (h1 "Welcome to SlateJS") (p "Welcome to your editor.") (p [[69,{}],[7,{"bold":true}],[2,{"sub":true,"bold":true}],[6,{"bold":true}],[18,{}],[2,{"sup":true}],[76,{}],[16,{"href":"http://google.co.uk"}],[177,{}]]"Lorem ipsum dolor sit amet, consectetur adipisicing elit. Corrupti, aliquid ex necessitatibus repellatTM a illo fuga dolore aperiam totam tempore nisi neque delectus labore, nihil quae dignissimos dolores mollitia? Vel sunt neque voluptatibus excepturi laboriosam possimus adipisci quidem dolores, omnis nemo dolore eligendi blanditiis, voluptatem in doloribus hic aperiam.")))');
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