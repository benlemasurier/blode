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

Array.prototype.remove = function(e) {
  for (var i = 0; i < this.length; i++) {
    if (e == this[i]) { return this.splice(i, 1); }
  }
};

function Config() {
    this.bind_ip = "127.0.0.1";
    this.log_port = 8000;
    this.broadcast_socket_port = 8001;
    this.broadcast_http_port = 8002;
    this.debug = true;
}

function Client(stream) {
    this.stream = stream;
}

var config = new Config,
    id      = 0;
    net     = require("net");
    sys     = require("sys"),
    http    = require("http"),
    url     = require("url");
    event   = require("events")
    emitter = new event.EventEmitter,
    id = 0,
    severity = 8,
    message = '--MARK--';

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
            client.stream.write("{ id: " + id + 
                                ", severity: " + severity +
                                ", message: " + message + " }\r\n");
        });
    });
});
server.listen(config.broadcast_socket_port, config.bind_ip);

// HTTP event broadcast
var http_broadcast = http.createServer(function(request, response) {
    response.writeHead(200, { 'Content-Type': 'text/plain' });
    // response.writeHead(200, { 'Content-Type': 'application/json' });
    response.write("\"{ id: " + id +
                   ", severity: " + severity +
                   ", message: " + message + " }\"\r\n");
    response.end();
}).listen(config.broadcast_http_port, config.bind_ip);

// Listen to log events
http.createServer(function(request, response) {
    var parameters = url.parse(request.url, true).query;
    id++;
    severity = parameters.severity;
    message = parameters.message;

    response.writeHead(200, { 
        "Content-Type": "text/html",
    });
    response.end();

    // emit message event
    emitter.emit("log", id, parameters.severity, parameters.message);

    if(config.debug) {
        console.log((new Date()) + 
            ": received request. " +
            " { id: " + id +
            ", severity: " + severity +
            ", message: " + message +" }");
    }
}).listen(config.log_port, config.bind_ip);

sys.puts("Server started at http://" + config.bind_ip + ":" + config.log_port);
