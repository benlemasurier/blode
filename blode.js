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
    this.log_ip = "127.0.0.1";
    this.log_port = 8000;
    this.broadcast_ip = "127.0.0.1";
    this.broadcast_port = 8001;
    this.debug = true;
}

function Client(stream) {
    this.stream = stream;
}

var config = new Config,
    net     = require("net");
    sys     = require("sys"),
    http    = require("http"),
    url     = require("url");
    event   = require("events")
    emitter = new event.EventEmitter;

// Broadcast log events
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
            client.stream.write("{ severity: " + severity 
                              + ", message: " + message + " }\r\n");
        });
    });
});
server.listen(config.broadcast_port, config.broadcast_ip);

// Listen to log events
http.createServer(function(request, response) {
    var parameters = url.parse(request.url, true).query;

    response.writeHead(200, { 
        "Content-Type": "text/html",
    });

    // emit message event
    emitter.emit("log", parameters.severity, parameters.message);

    if(config.debug) {
        console.log((new Date()) + 
            ": received request. " +
            " { severity: " + parameters.severity + 
            ", message: " + parameters.message +" }");
    }

    response.end();
}).listen(config.log_port, config.log_ip);

sys.puts("Server started at http://" + config.log_ip + ":" + config.log_port);
