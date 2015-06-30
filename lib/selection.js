var Region = require('./region');

//set of non overlapping regions
function Selection(regions) {
  this.regions = regions || [];
}
Selection.prototype.clear = function() {
  return new Selection();
};
Selection.prototype.add = function(region) {
  var beg = region.begin();
  var end = region.end();
  var regions = this.regions;
  var l = regions.length;
  var i = 0;
  var r;
  var c = region;
  var ret = [];
  //befores
  while (i < l) {
    r = regions[i];
    if (r.end() >= beg) break;
    ret.push(r);
    i++;
  };
  //intersectors
  while (i < l) {
    r = regions[i];
    if (r.begin() > end) break;
    c = r.cover(c); 
    i++;
  };
  ret.push(c);
  //afters
  while (i < l) {
    ret.push(regions[i]);
    i++;
  };
  return new Selection(ret);
};
Selection.prototype.add_all = function(regions) {
  regions.forEach(this.add, this);
};
Selection.prototype.subtract = function(region) {
  var beg = region.begin();
  var end = region.end();
  var regions = this.regions;
  var l = regions.length;
  var i = 0;
  var r;
  var ret = [];
  //befores
  while (i < l) {
    r = regions[i];
    if (r.end() > beg) break;
    ret.push(r);
    i++;
  };
  //intersectors
  while (i < l) {
    r = regions[i];
    var b = r.begin();
    if (b > end) break;
    // [---(....)....] or [----(....]....)
    // first region
    if (b < beg) {
      if (r.focus < r.anchor)
        ret.push(new Region(b, beg));
      else
        ret.push(new Region(beg, b));
    }
    // [...(...)---] or (...[...)---]
    // second region
    var e = r.end();
    if (e.hash > end) {
      if (r.focus < r.anchor)
        ret.push(new Region(end, e));
      else
        ret.push(new Region(e, end));
    }
    i++;
  };
  //afters
  while (i < l) {
    ret.push(regions[i]);
    i++;
  };
  return new Selection(ret);
};
Selection.prototype.contains = function(region) {
  for (var i = this.regions.length - 1; i >= 0; i--) {
    if (this.regions[i].contains(region)) return true;
  };
  return false;
};

module.exports = Selection;