var BlodeSocket = Class.create({
  initialize: function() {
    // event broadcast element
    this._event = null;

    // my websocket
    this._socket = null;
  },

  listen: function(host, port) {
    this._event = new Element('event');
    this._socket = new WebSocket('ws://' + host + ':' + port);
    this._socket.onmessage = function(message) {
      this._event.fire('blode:message', message.data.evalJSON());
    }.bind(this);

    return this._event;
  }
});

var BlodeBird = Class.create({
  initialize: function(container_id) {
    this.log_buffer = [];
    for(i = 0; i < 60; i++) {
      this.log_buffer[i] = 0;
    }

    this._container = $(container_id);
    this._canvas = this.init_canvas(this._container);
    this._socket = new BlodeSocket().listen('localhost', '8008');
    this._last_second = 0;

    this.bar_width = 0;
    this.bar_padding = 0;

    // Calculate graph size
    this.resize();

    // start listening
    this.listen(this.log_message);

    // recalculate graph dimensions on window resize
    window.onresize = function() {
      this.resize();
    }.bind(this);

    // Start drawing
    window.setInterval(function() { 
      this.redraw(); 
    }.bind(this), 1);
  },

  init_canvas: function(container) {
    var canvas = new Element('canvas', { width:  this._container.getWidth(), 
                                         height: this._container.getHeight() });
    container.insert(canvas);

    return canvas;
  },

  resize: function() {
    this._canvas.width = this._container.getWidth();
    this._canvas.height = this._container.getHeight();
    this.bar_width = Math.floor(this._canvas.width / 60) / 2;
    this.bar_padding = this.bar_width;
  },

  listen: function(callback) {
    this._socket.observe("blode:message", function(data) {
      callback.call(this, data.memo);
    }.bind(this));
  },

  log_message: function(message) {
    var current_second = new Date().getSeconds();

    if(current_second !== this._last_second) {
      this.log_buffer[current_second] = 0;
      this._last_second = current_second;
    }

    this.log_buffer[current_second] += 1;
  },

  // reorder the log, starting from the current time (e.g. 36 (seconds))
  // and descend (in time) from there, rotating if required (e.g. [59, 0, 1, 2])
  sort_log: function(start_index, log_buffer) {
    return(log_buffer.slice(0, start_index + 1).reverse().concat(log_buffer.slice(start_index).reverse()));
  },

  redraw: function() {
    var context = this._canvas.getContext('2d');

    // clear canvas
    context.clearRect(0, 0, this._canvas.width, this._canvas.height);

    // draw a pretty.
    var now = new Date().getSeconds();
    var start_x = this._canvas.width, start_y;
    var sorted = this.sort_log(now, this.log_buffer);
    for(var i = 0; i < this.log_buffer.length; i++) {
      // draw graph
      start_x -= this.bar_width;
      start_y = this._canvas.height - sorted[i] || this._canvas.height;

      // background
      context.fillStyle = "rgba(0, 0, 0, 0.2)";
      context.fillRect(start_x, 0, this.bar_width, this._canvas.height);
       
      // foreground.
      context.fillStyle = "rgba(192, 0, 0, 1)";
      context.fillRect(start_x, start_y, this.bar_width, sorted[i] || this._canvas.height);
      
      // display count
      /*
      if(sorted[i] > 0)
        context.fillText(sorted[i], start_x, start_y - 10);
        */

      // apply padding
      start_x -= this.bar_padding;
    }
  }
});
