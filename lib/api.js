//TODO: should we change the api to 
// match those in ottypes?
/*

//If we do this then the api ends up on the
// context. Is that where we want it?
// This will make us a little more dependent
// on the ShareJS library.

module.exports = api;
function api(getSnapshot, submitOp) {
	return {
		insert: function(point, values) {
		},

		replace: function(...) {
		},

		//etc
	}
}

*/


/*
 * given a point and a head split the document
 * at that point down to the given head.
 *
 * optionally takes a new_head and new_attributes
 *   otherwise uses the existing head an attributes
 *   in the new instance.
 */
function split(doc, point, head, new_head, new_attributes) {
	//TODO
}


/*
 * insert
 *
 * given a point and an insert operation
 * transform the insert operation to that point
 * 
 * returns [operation]
 */
function insert(point, operation) {
	//TODO
}

/*
 * replace
 *
 * given a document, region and operations
 * replace the specified region with the
 * result of the operations.
 *
 */
function replace(doc, region, operations) {
	//TODO
}


/*
 * wrap
 *
 * wraps all sub expressions in specified head.
 * 
 * splits and replaces any regions at start or
 * end of the selection.
 */
function wrap(doc, region, rules, head, attributes) {
	//TODO
}

/*
 * unwrap
 *
 * removes or splits all s-expressions with
 * matching heads.
 *
 * Note: may not need rules.
 */
function unwrap(doc, region, rules, head) {
	//TODO
}


module.exports = {
	split: split,
	insert: insert,
	replace: replace,
	wrap: wrap,
	unwrap: unwrap,
};