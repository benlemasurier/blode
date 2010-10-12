/*
 * blode support library
 */
var sys = require("sys");
var net = require("net");
var http = require("http");

Array.prototype.remove = function(e) {
  for(var i = 0, j = this.length; i < j; i++) {
    if(e == this[i])
      return(this.splice(i, 1)); 
  }
};

function createWsServer() {
  return(new wsServer);
};

function wsServer() {
  http.Server.call(this, function(){});

  this.addListener('connection', function() {
    console.log('got connect');
  });

  this.addListener('request', function(request, response) {
    response.writeHead(200, { "Content-Type": "text/plain" });
    response.write("okay");
    response.end();
  });

  this.addListener('upgrade', function(request, socket, header) {
    console.log("upgrade request");

    socket.write("HTTP/1.1 101 Web Socket Protocol Handshake\r\n" +
                 "Upgrade: WebSocket\r\n" +
                 "Connection: Upgrade\r\n" +
                 "Sec-WebSocket-Origin: http://localhost:8008\r\n" +
                 "Sec-WebSocket-Location: ws://localhost:8008/\r\n" +
                 // "Sec-WebSocket-Protocol: sample\r\n" +
                 "\r\n");

    socket.write("alskdfjlasjdkflaskjfajf");
    socket.ondata = function(data, start, end) {
      var original_data = d.toString('utf8', start, end);
      var data = original_data.split('\ufffd')[0].slice(1);
      socket.write("\u0000", "binary");
      socket.write(data, "utf8");

      console.log(data);
    };
  });
};

sys.inherits(wsServer, http.Server);
var ws = createWsServer();
ws.listen(8008);
