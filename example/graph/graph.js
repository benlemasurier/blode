;(function($) {

  var _graph = {
    log_buffer:   [],
    legend:       '',
    background:   '',
    foreground:   '',
    element:      null,
    tick:         100, // ms
    bar_width:    3,
    bar_padding:  1,
    bg_color:     'rgba(25,  91,  121, 1)', // blue
    fg_color:     'rgba(100, 170, 208, 1)', // light blue
    legend_color: 'rgba(255, 255, 255, 1)', // white
    show_legend:  false
  };

  var methods = {
    init: function(options) {
      return this.each(function() {
        _graph = $.extend({}, _graph, options);
        _graph.element = $(this);

        _graph.background = methods.create_layer.call(this, 0);
        _graph.foreground = methods.create_layer.call(this, 1);
        _graph.legend     = methods.create_layer.call(this, 2);
        methods.init_buffer.call(this);

        methods.render_background.call(this);

        var socket = io.connect('http://tuberculosis:8008');
        socket.on('message', function() {
          _graph.log_buffer[0]++;
        });

        // every 'tick' rotate the log buffer and render the foreground
        window.setInterval(function() {
          if(!_graph.pause)
            methods.render_foreground.call(this);

          if(_graph.show_legend)
            methods.render_legend.call(this, methods.log_max.call(this, _graph.log_buffer));

          // insert a new (blank) item into the current 'tick'
          _graph.log_buffer.unshift(new Array());

          // remove the last item from the buffer
          _graph.log_buffer = _graph.log_buffer.slice(0, -1);
        }, _graph.tick);

        window.onresize = function() {
          $(_graph.background).attr('width',  _graph.element.width());
          $(_graph.background).attr('height', _graph.element.height());
          $(_graph.foreground).attr('width',  _graph.element.width());
          $(_graph.foreground).attr('height', _graph.element.height());
          $(_graph.legend).attr('width',  _graph.element.width());
          $(_graph.legend).attr('height', _graph.element.height());

          methods.init_buffer.call(this);

          methods.render_foreground.call(this);
          methods.render_background.call(this);
        };

      });
    },

    toggle_legend: function() {
      if(_graph.show_legend) {
        _graph.show_legend = false;
        methods.clear_legend.call(this);

        return
      }

      _graph.show_legend = true;
    },

    scale_buffer: function(buffer) {
      var max = _graph.foreground.height - 1,
          buffer_max = methods.log_max.call(this, buffer),
          scale_factor = 1;

      // calculate scale
      scale_factor = max / buffer_max;

      // scale the buffer
      for(var i = 0; i < buffer.length; i++)
        buffer[i] = Math.floor(buffer[i] * scale_factor);

      return buffer;
    },

    create_layer: function(index) {
      index = index || 0;
      var p = _graph.element.position(),
          layer = jQuery("<canvas/>").css(
          {
            'z-index': index,
            position: 'absolute',
            top: p.top,
            left: p.left
          }
      );

      layer.attr('width',  _graph.element.width());
      layer.attr('height', _graph.element.height());

      _graph.element.append(layer);

      return layer[0];
    },

    render_background: function() {
      // the background consists of each bars bg color
      var context = _graph.background.getContext('2d'),
          x = context.canvas.width,
          y = 0,
          height = context.canvas.height;

      // clear layer
      context.clearRect(0, 0, _graph.background.width, height);

      // set layer color
      context.fillStyle = _graph.bg_color;

      // draw the bar backgrounds
      for(i = 0, j = _graph.log_buffer.length; i < j; i++) {
        x -= _graph.bar_width;
        context.fillRect(x, y, _graph.bar_width, height);
        x -= _graph.bar_padding;
      }
    },

    render_foreground: function() {
      // render from right to left (most recent tick, descending)
      var context = _graph.foreground.getContext('2d'),
          x = context.canvas.width,
          y = 0,
          height = context.canvas.height,
          scaled = [];

      // clear layer and set styles
      context.clearRect(0, 0, _graph.foreground.width, height);
      context.fillStyle = _graph.fg_color;

      // scale and draw the bars
      scaled = methods.scale_buffer.call(this, _graph.log_buffer.slice());

      // draw
      for(var i = 0, j = scaled.length; i < j; i++) {
        x -= _graph.bar_width;
        y = (context.canvas.height - scaled[i]) || height;

        context.fillRect(x, y, _graph.bar_width, height);

        x -= _graph.bar_padding;
      }
    },

    clear_legend: function() {
      _graph.legend.getContext('2d').clearRect(0, 0, _graph.legend.width, _graph.legend.height);
    },

    render_legend: function(max) {
      if(!_graph.show_legend)
        return;

      var context = _graph.legend.getContext('2d'),
          height  = context.canvas.height,
          half_pi = Math.PI / 180;

      // clear layer and set styles
      methods.clear_legend.call(this);
      context.fillStyle = "rgba(0, 0, 0, 0.7)";
      context.fillRect(0, 0, 30, height);
      context.fillStyle = _graph.legend_color;
      context.font = "bold 10px Helvetica, Arial";
      context.textBaseline = "top";
      context.textAlign = "end";

      // hits legend
      context.translate(10, height / 2);
      context.rotate(-90 * half_pi);
      context.fillText("HITS", 0, 0);
      context.rotate(90 * half_pi);
      context.translate(-10, -(height / 2));
      context.fillText(max, 25, 10);
      context.fillText(0, 25, height - 20);

      // time legend
      context.fillStyle = "rgba(0, 0, 0, 0.7)";
      context.fillRect(30, height - 30, context.canvas.width, 30);
      context.textAlign = "center";
      context.fillStyle = _graph.legend_color;
      context.fillText("TIME (" + _graph.tick + "ms)", context.canvas.width / 2, height - 20);
    },

    log_max: function(buffer) {
      var max = 0;
      for(var i = 0, j = buffer.length; i < j; i++) {
        if(isNaN(buffer[i]))
          buffer[i] = 0;
        if(buffer[i] > max)
          max = buffer[i];
      }

      return max;
    },

    log_buffer_size: function() {
      // the size is determined by the maximum number of graph "bars"
      // capable of being displayed on the screen at any given time.
      // i.e. the wider the screen, the more bars.
      //      the more bars, the more ticks.
      return Math.floor(_graph.foreground.width / 
          (_graph.bar_width + _graph.bar_padding));
    },

    init_buffer: function() {
      _graph.log_buffer = [];
      for(var i = 0, j = methods.log_buffer_size.call(this); i < j; i++)
        _graph.log_buffer[i] = 0;
    },

  };

  $.fn.graph = function(method) {
    if(methods[method]) {
      return methods[ method ].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if(typeof method === 'object' || !method) {
      return methods.init.apply(this, arguments);
    } else {
      $.error('Method ' +  method + ' does not exist on jQuery.graph' );
    }
  };

})(jQuery);
