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
