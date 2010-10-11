/*
 * blode support library
 */
Array.prototype.remove = function(e) {
  for (var i = 0; i < this.length; i++) {
    if(e == this[i])
      return(this.splice(i, 1)); 
  }
};
