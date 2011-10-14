/*
 * (syslog like) message severity
 * 0: emerge,  1: alert
 * 2: crit,    3: err
 * 4: warning, 5: notice
 * 6: info,    7: debug,  8: none
 */

DEBUG = false;
HOST = "127.0.0.1";

require("./lib/Math.uuid");

var lib =   require("./lib/libblode"),
    ws  =   require("websocket-server"),
    net =   require("net"),
    sys =   require("sys"),
    url =   require("url"),
    http =  require("http"),
    dgram = require("dgram"),
    event = require("events"),
    emitter = new event.EventEmitter,
    config = require('./config').config,
    log_buffer = { id: 0, severity: 'none', message:  '--MARK--' };

// Listen to log events
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
}).listen(config.http_log_port, HOST);
sys.puts("Event HTTP capture daemon started at http://" + HOST + ":" + config.http_log_port);

// UDP event listener
var udp_server = dgram.createSocket("udp4");
udp_server.on("message", function (message, rinfo) {
  if(DEBUG)
    console.log("UDP listener got: " + message + " from " + rinfo.address + ":" + rinfo.port);

  try {
    var log = JSON.parse(message);
    log_buffer.id = Math.uuid();
    log_buffer.source = rinfo.address;
    log_buffer.severity = log.severity;
    log_buffer.message  = log.message;

    // emit message event
    emitter.emit("log", log_buffer.severity, log_buffer.message);
  } catch(e) {}
});
udp_server.bind(config.dgram_log_port);
sys.puts("Event UDP capture daemon started at http://" + HOST + ":" + config.dgram_log_port);

// TCP socket event broadcast
function Client(stream) {
  this.stream = stream;
  this.broadcast_events = [
    'none',
    'debug',
    'info',
    'notice',
    'warning',
    'err',
    'crit',
    'alert',
    'emerge'
  ];
}

var socket_clients = [];
var socket_buffer = '';

var server  = net.createServer(function(stream) {
  stream.setEncoding('utf8');
  stream.on("connect", function() {
    var client = new Client(stream);
    socket_clients.push(client);

    stream.on('end', function() {
      socket_clients.remove(client);
      client.stream.end();
    });
    
    stream.on('data', function(data) {
      socket_buffer += data;
      var message = socket_buffer.indexOf("\r");
      if (message !== -1) {     
        var json = socket_buffer.slice(0, message);
        try {  

          var broadcast_events = JSON.parse(json);

          if(broadcast_events instanceof Array)
            client.broadcast_events = broadcast_events;

        } catch(e) { }

        socket_buffer = socket_buffer.slice(message + 1);
      }
    });

    stream.on('error', function() {
      socket_clients.remove(client);
      client.stream.end();
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

// Websocket event broadcast
var ws_clients = [];
var ws_server = ws.createServer();
ws_server.addListener("connection", function(connection) {
  var listener = null,
      client = new Client(connection);

  ws_clients.push(client);
  connection.addListener("end", function() {
    ws_clients.remove(client);
  });

  connection.addListener("error", function(error) {
    ws_clients.remove(client);
  });
});
ws_server.listen(8008);
sys.puts("Event web socket broadcast daemon started at " + HOST + ":" + config.websocket_port);

emitter.on("log", function(severity, message) {
  socket_clients.forEach(function(client) {
    try {
      if(client.broadcast_events.indexOf(severity) !== -1)
        client.stream.write(JSON.stringify(log_buffer) + "\r\n");
    } catch(e) {
      socket_clients.remove(client);
    }
  });

  ws_clients.forEach(function(client) {
    try {
      client.stream.write(JSON.stringify(log_buffer) + "\r\n");
    } catch(e) {
      ws_clients.remove(client);
    }
  });
});
