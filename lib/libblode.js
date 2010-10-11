/*
 * blode support library
 */

require('./Math.uuid.js');

Array.prototype.remove = function(e) {
  for(var i = 0, j = this.length; i < j; i++) {
    if(e == this[i])
      return(this.splice(i, 1)); 
  }
};
