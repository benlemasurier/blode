// Blode message interface
var BlodeMessage = Class.create({
  initialize: function(message) {
    this._id = message.id;
    this._severity = message.severity;
    this._message = message.message;
    this._date = new Date();
  },

  id: function() {
    return this._id;
  },

  severity: function() {
    return this._severity;
  },

  message: function() {
    return this._message;
  },

  toString: function() {
    return "id: " + this._id + " " +
           "severity: " + this._severity + " " +
           "message: " + this._message;

  }
});

// Blode web socket interface
var BlodeSocket = Class.create({
  initialize: function() {
    if(!("WebSocket" in window))
      throw "this browser does not support web sockets.";
    
    // event broadcast element
    this._event = null;

    // web socket
    this._socket = null;
  },

  listen: function(host, port) {
    this._event = new Element('event');
    this._socket = new WebSocket('ws://' + host + ':' + port);
    this._socket.onmessage = function(message) {
      this._event.fire('blode:message', new BlodeMessage(message.data.evalJSON()));
    }.bind(this);

    return this._event;
  }
});
