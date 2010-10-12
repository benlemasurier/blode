/*
 * blode support library
 */
Array.prototype.remove = function(e) {
  for(var i = 0, j = this.length; i < j; i++) {
    if(e == this[i])
      return(this.splice(i, 1)); 
  }
};

exports.websocket_server = {
  sys:  require('sys'),
  net:  require('net'),
  http: require('http'),

  createServer: function() {
    return this.http.createServer(function(server) {
      server.addListener('connection', function() {
        console.log('got connect');
      });

      server.addListener('request', function(request, response) {
        response.writeHead(200, { "Content-Type": "text/plain" });
        response.write("OKAY");
        response.end();
      });

      server.addListener('upgrade', function(request, socket, header) {
        console.log("upgrade request");

        socket.write("HTTP/1.1 101 Web Socket Protocol Handshake\r\n" +
                     "Upgrade: WebSocket\r\n" +
                     "Connection: Upgrade\r\n" +
                     "Sec-WebSocket-Origin: http://localhost\r\n" +
                     "Sec-WebSocket-Location: ws://localhost:8008/\r\n" +
                     "Server: Blode\r\n" +
                     "" + new Date() + "\r\n" +
                     "Access-Control-Allow-Origin: http://localhost\r\n" +
                     "Access-Control-Allow-Credentials: true\r\n\r\n");

        socket.ondata = function(data, start, end) {
          var original_data = d.toString('utf8', start, end);
          var data = original_data.split('\ufffd')[0].slice(1);

          if(data == "kill"){
            socket.end();
          } else {
            sys.puts(data);
            socket.write("\u0000", "binary");
            socket.write(data, "utf8");
            socket.write("\uffff", "binary");
          }
        };
      });
    });
  }
};
