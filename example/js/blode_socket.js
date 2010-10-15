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
