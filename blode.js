/*
 * (syslog like) message severity
 * 0: emerge,  1: alert
 * 2: crit,    3: err
 * 4: warning, 5: notice
 * 6: info,    7: debug,  8: none
 */

DEBUG = false;
HOST = "127.0.0.1";

require("./lib");

var net = require("net"),
    sys = require("sys"),
    url = require("url"),
    http = require("http"),
    event = require("events"),
    emitter = new event.EventEmitter,
    config = require('./config').config;

var log_buffer = { id: 0, severity: 'none', message:  '--MARK--' };

// Listen to log events
http.createServer(function(request, response) {
  var parameters = url.parse(request.url, true).query;

  try {
    log_buffer.id++;
    log_buffer.severity = parameters.severity;
    log_buffer.message = parameters.message;

    // HTTP 200 OK
    response.writeHead(200);

    // emit message event
    emitter.emit("log", log_buffer.severity, log_buffer.message);

    if(DEBUG)
      console.log((new Date().getTime()) + " received request: " + JSON.stringify(log_buffer));
  } catch(error) {
    // Bad request
    response.writeHead(400);

    if(DEBUG) {
      console.log(error);
      console.log((new Date().getTime()) + " malformed request: " + JSON.stringify(log_buffer));
    }
  }

  response.end();
}).listen(config.log_port, HOST);
sys.puts("Event capture daemon started at http://" + HOST + ":" + config.log_port);

// Socket event broadcast
function Client(stream) {
  this.stream = stream;
}
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
server.listen(config.broadcast_socket_port, HOST);
sys.puts("Event socket broadcast daemon started at " + HOST + ":" + config.broadcast_socket_port);

// HTTP event broadcast
var http_broadcast = http.createServer(function(request, response) {
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify(log_buffer));
}).listen(config.broadcast_http_port, HOST);
sys.puts("Event HTTP broadcast daemon started at " + config.bind_ip + ":" + config.broadcast_http_port);
