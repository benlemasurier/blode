/*
 * (syslog like) message severity
 *
 * 0: emerge
 * 1: alert
 * 2: crit
 * 3: err
 * 4: warning
 * 5: notice
 * 6: info
 * 7: debug
 * 8: none
 *
 */

require("./config.js");
require("./lib.js");

var config = {
  bind_ip: "127.0.0.1",
  log_port: 8000,
  broadcast_socket_port: 8001,
  broadcast_http_port: 8002,
  debug: true
};

var log_buffer = {
  id: 0,
  severity: 'none',
  message:  '--MARK--'
};

var net     = require("net"),
    sys     = require("sys"),
    http    = require("http"),
    url     = require("url"),
    event   = require("events"),
    emitter = new event.EventEmitter;

function Client(stream) {
    this.stream = stream;
}

// Socket event broadcast
var clients = [];
var server  = net.createServer(function(stream) {
    stream.setEncoding('utf8');
    stream.on("connect", function() {
        var client = new Client(stream);
        clients.push(client);

        stream.on('end', function() {
            clients.remove(client);
            client.stream.end();
        });
    });

    emitter.on("log", function(severity, message) {
        clients.forEach(function(client) {
            client.stream.write(JSON.stringify(log_buffer) + "\r\n");
        });
    });
});
server.listen(config.broadcast_socket_port, config.bind_ip);

// HTTP event broadcast
var http_broadcast = http.createServer(function(request, response) {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(log_buffer));
}).listen(config.broadcast_http_port, config.bind_ip);

// Listen to log events
http.createServer(function(request, response) {
    var parameters = url.parse(request.url, true).query;

    try {
      log_buffer.id++;
      log_buffer.severity = parameters.severity;
      log_buffer.message = parameters.message;

      // emit message event
      emitter.emit("log", log_buffer.id, log_buffer.severity, log_buffer.message);

      response.writeHead(200);

      if(config.debug)
        console.log((new Date().getTime()) + " received request: " + JSON.stringify(log_buffer));
    } catch(error) {
      console.log(error);
      // Bad request
      response.writeHead(400);

      if(config.debug)
        console.log((new Date().getTime()) + " malformed request: " + JSON.stringify(log_buffer));
    }

    response.end();
}).listen(config.log_port, config.bind_ip);

sys.puts("Server started at http://" + config.bind_ip + ":" + config.log_port);
