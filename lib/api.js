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


module.exports = {
	split: split,
	insert: insert,
	replace: replace,
	wrap: wrap,
	unwrap: unwrap,
};