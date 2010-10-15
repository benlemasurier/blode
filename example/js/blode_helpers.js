// Blode helpers
var Color = Class.create({
  initialize: function(red, green, blue, alpha_percent) {
    this.red = red;
    this.green = green;
    this.blue = blue;
    this.alpha = alpha_percent / 100;
  },

  toString: function() {
    return this.red + ", " + this.green + ", " + this.blue + ", " + (this.alpha);
  }
});

var Bar = Class.create({
  initialize: function(width) {
    this._width = width;
    this._rendered = false;
  },

  render: function() {
    this._rendered = true;
  },

  rendered: function() {
    return this._rendered;
  }
});

var BackgroundBar = Class.create(Bar, {
  render: function($super, x, y, context) {
    $super();
    context.fillRect(x, y, this._width, context.canvas.height);
  }
});

var ForegroundBar = Class.create(Bar, {
  render: function($super, x, y, context) {
    $super();
    context.fillRect(x, y, this._width, context.canvas.height);
  }
});

Array.prototype.remove = function(e) {
  for(var i = 0, j = this.length; i < j; i++) {
    if(e == this[i])
      return(this.splice(i, 1)); 
  }
};

