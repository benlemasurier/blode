// Blode message graphing
var BlodeGraph = Class.create({
  initialize: function(container_id) {
    this._container = $(container_id);
    this._bar_width = 3;
    this._bar_padding = 1;
    this._tick = 100; // 100ms
    this._log_buffer = [];
    this._socket = new BlodeSocket().listen('localhost', '8008');

    // color scheme
    this._bg_color = new Color('35', '91', '121', 100); // blue
    this._fg_color = new Color('100', '170', '208', 100); // lighter blue
    this._legend_color = new Color('255', '255', '255', 100); // white

    // insert the graph canvas elements
    this._background = this.create_canvas(this._container, 0);
    this._foreground = this.create_canvas(this._container, 1);
    this._legend     = this.create_canvas(this._container, 2);

    // prime the log buffer
    this.initialize_log_buffer();

    // render the background before we display any graph bars
    this.render_background();

    // every "tick" rotate the log buffer and render the foreground
    window.setInterval(function() {
      // render foreground every "tick"
      this.render_foreground();

      // insert a new (blank) buffer into the "current" tick
      this._log_buffer.unshift(new Array());

      // remove the last item from the buffer
      this._log_buffer = this._log_buffer.slice(0, -1);  
    }.bind(this), this._tick);

    // start listening to socket events
    this._socket.observe('blode:message', function(data) {
      this._log_buffer[0]++;
    }.bind(this));

    // handle window resizing
    window.onresize = function() {
      this._background.clonePosition(this._container);
      this._background.width = this._container.getWidth()

      this._foreground.clonePosition(this._container);
      this._foreground.width = this._container.getWidth()

      this.initialize_log_buffer();

      this.render_background();
      this.render_foreground();
    }.bind(this);
  },

  initialize_log_buffer: function() {
    this._log_buffer = [];

    for(i = 0; i < this.log_buffer_size(); i++)
      this._log_buffer[i] = 0;
  },

  create_canvas: function(container, layer) {
    var canvas = new Element('canvas'),
        layer  = layer || 0;

    // each canvas (layer) is the exact same size as its parent container
    canvas.style.position = "absolute";  
    canvas.clonePosition(container);
    canvas.width = container.getWidth();
    canvas.height = container.getHeight();
    canvas.style.zIndex = layer;

    container.insert(canvas);

    return canvas;
  },

  render_background: function() {
    // The background layer consists of each bar's background color
    var context = this._background.getContext('2d'),
        x = context.canvas.getWidth(),
        y = 0;

    // clear layer
    context.clearRect(0, 0, this._background.width, this._background.height);

    // set layer color
    context.fillStyle = "rgba(" + this._bg_color.toString() + ")";

    // draw bar backgrounds
    for(i = 0, j = this._log_buffer.length; i < j; i++) {
      x -= this._bar_width;
      new BackgroundBar(this._bar_width).render(x, y, context);
      x -= this._bar_padding;
    }
  },

  render_foreground: function() {
    // The foreground layer consists of each bars value
    // rendering from right to left (most recent tick, descending)
    var context = this._foreground.getContext('2d'),
        x = context.canvas.getWidth(),
        y = 0;

    // clear layer
    context.clearRect(0, 0, this._foreground.width, this._foreground.height);

    // set layer color
    context.fillStyle = "rgba(" + this._fg_color.toString() + ")";

    // draw scaled "bar" levels and render the scaled legend
    scaled = this.scale_log_buffer(this._log_buffer.slice());
    this.render_legend(this.max_value_in_log(this._log_buffer));
    for(i = 0, j = scaled.length; i < j; i++) {
      x -= this._bar_width;
      y = (context.canvas.height - scaled[i]) || context.canvas.height;

      new ForegroundBar(this._bar_width).render(x, y, context);
      x -= this._bar_padding;
    }
  },

  // testing. clean this up. a lot. (really, a ton.)
  render_legend: function(max) {
    var context = this._legend.getContext('2d');

    // clear layer
    context.clearRect(0, 0, this._legend.width, this._legend.height);

    // legend background
    context.fillStyle = "rgba(0, 0, 0, 0.7)";

    // left side of legend
    context.fillRect(0, 0, 30, context.canvas.getHeight());

    // set layer color
    context.fillStyle = "rgba(" + this._legend_color.toString() + ")";

    // set the font
    context.font = "bold 10px Helvetica, Arial";

    // make things easier to measure (for me, anyway).
    context.textBaseline = "top";
    context.textAlign = "end";

    // draw bar backgrounds
    context.fillText(max, 25, 10);
    context.fillText(0, 25, context.canvas.getHeight() - 20);

    // console.log(context.measureText(max).width);
  },

  scale_log_buffer: function(log_buffer) {
    var max = this._foreground.height - 1,
        log_max = 0,
        scale_factor = 1;

    // find largest value in log.
    log_max = this.max_value_in_log(log_buffer);

    // calculate scale
    scale_factor = max / log_max;

    // scale entire log buffer
    for(i = 0; i < log_buffer.length; i++)
      log_buffer[i] = Math.floor(log_buffer[i] * scale_factor);

    return(log_buffer);
  },

  max_value_in_log: function(log_buffer) {
    var log_max = 0;

    for(i = 0; i < log_buffer.length; i++) {
      // no undefined values.
      if(isNaN(log_buffer[i]))
        log_buffer[i] = 0;
        
      if(log_buffer[i] > log_max)
        log_max = log_buffer[i];
    }

    return log_max;
  },

  log_buffer_size: function() {
    // the size is determined by the maximum number of graph "bars"
    // capable of being displayed on the screen at any given time.
    // i.e. the wider the screen, the more bars.
    //      the more bars, the more ticks.
    return Math.floor(this._foreground.width /
                      (this._bar_width + this._bar_padding));
  }
});
