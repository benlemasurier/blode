var Point = Class.create({
  initialize: function(x, y) {
    this.x = x;
    this.y = y;
  },

  equals: function(point) {
    if(this.x === point.x && this.y === point.y)
      return(true);

    return(false);
  },

  toString: function() {
    return "(" + this.x + ", " + this.y + ")";
  }
});

// Blode message graphing
var BlodeMap = Class.create({
  initialize: function(container_id) {
    this._container = $(container_id);
    this._socket = new BlodeSocket().listen('10.10.10.2', '8008');
    this._geo_url = "http://ben-dev/geoip/lookup.php?jsonp=window.blode_map.log_visitor&ip=";
    this._map_image = "images/world_map.jpg";
    this._background = this.create_canvas(this._container, 0);
    this._foreground = this.create_canvas(this._container, 1);
    this.party_mode = false;

    this._point_size = 2;
    this._point_color = "rgba(255, 0, 0, 0.5)";
    this._point_buffer = [];
    this._point_buffer_size = 1000;

    // prime the point buffer
    this.initialize_point_buffer();

    this.render_background();

    this.listen();
  },

  initialize_point_buffer: function() {
    this._point_buffer = [];

    for(var i = 0; i < this._point_buffer_size; i++)
      this._point_buffer[i] = new Point(0, 0);
  },

  listen: function() {
    this._socket.observe('blode:message', function(data) {
      var message = data.memo.message();
      if(message.include('app.run')) {
        var ip = message.evalJSON().remote_addr;
        new Ajax.JSONRequest(this._geo_url + ip, {
        });
      }
    }.bind(this));
  },

  create_canvas: function(container, layer) {
    var canvas = new Element('canvas'),
        layer  = layer || 0;

    // each canvas (layer) is the exact same size as its parent container
    canvas.style.position = "absolute";  
    canvas.clonePosition(container);
    canvas.width = container.getWidth();
    canvas.height = container.getWidth() / 2;
    canvas.style.zIndex = layer;

    container.insert(canvas);

    return canvas;
  },

  render_background: function() {
    // The background layer consists of each bar's background color
    var context = this._background.getContext('2d');

    // clear layer
    context.clearRect(0, 0, this._background.width, this._background.height);

    var context = this._background.getContext('2d');
    var img = new Image();
    img.src = this._map_image;
    img.onload = function() {
      context.drawImage(img, 0, 0, img.width, img.height, 0, 0, context.canvas.width, context.canvas.height);
    }.bind(this);
  },

  render_foreground: function() {
    var context = this._foreground.getContext('2d');

    // clear layer
    context.clearRect(0, 0, this._foreground.width, this._foreground.height);

    for(i = 0, j = this._point_buffer_size; i < j; i++) {
      if(this._point_buffer[i].x != 0 && this._point_buffer[i].y != 0) {
        // set layer color
        if(this.party_mode)
          context.fillStyle = this.random_color();
        else
          context.fillStyle = this._point_color;

        var point_size = (i == 0) ? this._point_size * 2 : this._point_size;
        context.beginPath();
        context.arc(this._point_buffer[i].x - (point_size / 2),
                    this._point_buffer[i].y - (point_size / 2),
                    point_size,
                    0, Math.PI * 2, true);
        context.closePath();
        context.fill();
      }
    }
  },

  log_visitor: function(geo_data) {
    var context = this._foreground.getContext('2d');
    var minX = -180,
        minY = -90,
        maxX = 180,
        maxY = 90;

    var lon = geo_data.longitude,
        lat = geo_data.latitude;

    if(lon == 0 || lat == 0)
      return;

    var x = (this._foreground.width * (lon - minX)) / (maxX - minX),
        y = this._foreground.height - ((this._foreground.height * (lat - minY)) / (maxY - minY));

    var point = new Point(x, y);

    // Only log unique entries
    if(this.point_exists(point)) {
      return(false);
    }

    // insert the new piont into the buffer
    this._point_buffer.unshift(point);

    // remove the last item from the buffer
    this._point_buffer = this._point_buffer.slice(0, -1);  

    this.render_foreground();
  },

  point_exists: function(point) {
    var exists = false;

    this._point_buffer.each(function(item) {
      if(item.equals(point)) {
        exists = true;
        return(true);
      }
    });

    return(exists);
  },

  random_color: function(index) {
    return("rgba(" + Math.floor(Math.random() * 255) + ", " + Math.floor(Math.random() * 255) + ", " + Math.floor(Math.random() * 255) + ", 0.5)");
  }
});
