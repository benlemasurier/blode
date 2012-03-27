(function() {

  module.exports.listen = function(host, port, emitter) {
    var event = emitter;
    var util = require("util");
    var url  = require("url");
    var http = require("http");

    http.createServer(function(request, response) {
      request.extract_message = function() {
        return(url.parse(this.url, true).query);
      };

      request.is_valid = function() {
        try {
          var query = this.extract_message();
          if(typeof query.severity !== 'undefined' &&
             typeof query.message !== 'undefined')
            return(true);
          else
            return(false);
        } catch(error) { return(false) }
      };

      if(!request.is_valid()) {
        response.writeHead(400); // HTTP 400
        response.end();
        return;
      }

      response.writeHead(200); // HTTP 200 OK
      response.end();

      // emit message event
      var message = request.extract_message();
      event.emit("log", message);

    }).listen(port, host);
    util.puts("http capture listening on http://" + host + ":" + port);
  }

})();
