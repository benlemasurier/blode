/*
 * (syslog like) message severity
 * 0: emerge,  1: alert
 * 2: crit,    3: err
 * 4: warning, 5: notice
 * 6: info,    7: debug,  8: none
 */

DEBUG = false;
HOST = "127.0.0.1";

require("./lib/libblode");
require("./lib/Math.uuid");

var net = require("net"),
    sys = require("sys"),
    url = require("url"),
    http = require("http"),
    event = require("events"),
    emitter = new event.EventEmitter,
    config = require('./config').config,
    log_buffer = { 
      id: 0, 
      severity: 'none', 
      message:  '--MARK--' 
    };

// Listen to log events
http.createServer(function(request, response) {
  request.extract_message = function() {
    return(url.parse(this.url, true).query);
  };

  request.is_valid = function() {
    var query = this.extract_message();
    if(typeof query.severity !== 'undefined' &&
       typeof query.message !== 'undefined')
      return(true);
    else
      return(false);
  };

  if(!request.is_valid()) {
    response.writeHead(400); // HTTP 400
    response.end();

    if(DEBUG)
      console.log((new Date().getTime()) + " malformed request: " + request.url);

    return;
  }

  var log = request.extract_message();
  log_buffer.id = Math.uuid();
  log_buffer.severity = log.severity;
  log_buffer.message  = log.message;

  response.writeHead(200); // HTTP 200 OK
  response.end();

  // emit message event
  emitter.emit("log", log_buffer.severity, log_buffer.message);

  if(DEBUG)
    console.log((new Date().getTime()) + " received request: " + JSON.stringify(log_buffer));
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
sys.puts("Event HTTP broadcast daemon started at " + HOST + ":" + config.broadcast_http_port);
