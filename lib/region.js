var Point = require('./point');

//TODO: WHAT should the semantics be for the Region class? Closed, Open, Half Open (which end)?

//pair of points (xpos optional)
function Region(focus, anchor, xpos) {
  this.focus = focus;
  this.anchor = anchor || focus;
  this.xpos = xpos === undefined ? false : xpos;
}
Region.prototype.empty = function() {
  return this.focus === this.anchor || this.focus.equals(this.anchor);
};
Region.prototype.begin = function() {
  return (this.focus.hash < this.anchor.hash) ? this.focus : this.anchor;
};
Region.prototype.end = function() {
  return (this.focus.hash > this.anchor.hash) ? this.focus : this.anchor;
};
//Region.prototype.size = function() {} //what would this be in an sexpr
//return region covering both regions
Region.prototype.cover = function(region) {
  var beg = Point.min(region.begin(), this.begin());
  var end = Point.max(region.end(), this.end());
  if (region.focus.hash < region.anchor.hash)
    return new Region(beg, end);
  return new Region(end, beg);
};
Region.prototype.intersection = function(region) {
  var beg = Point.max(region.begin(), this.begin());
  var end = Point.min(region.end(), this.end());
  if (beg > end) return null;
  return new Region(end, beg);
};
//Region has no subtract because subtract might return two regions
Region.prototype.intersects = function(region) {
  return (this.end().hash >= region.begin().hash && this.begin().hash <= region.end().hash);
};
Region.prototype.contains = function(region) {
  if (region.path !== undefined) { //actually a point
    var point = region;
    return (this.begin().hash <= point.hash && this.end().hash >= point.hash)
  }
  return (this.begin().hash <= region.begin().hash && this.end().hash >= region.end().hash)
};

module.exports = Region;