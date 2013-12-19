(function() {

  module.exports.listen = function(host, port, emitter) {
    var event = emitter;
    var util  = require("util");
    var udp   = require("dgram").createSocket("udp4");

    udp.on("message", function (message, rinfo) {
      try { event.emit("log", JSON.parse(message)); } catch(e) { console.log(e); }
    });

    udp.bind(port);
    util.puts("udp capture listening on " + host + ":" + port);
  }

})();
