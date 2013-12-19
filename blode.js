/*
 * Blode - a simple, powerful syslog-like event broadcast daemon
 * Copyright (C) 2010 Ben LeMasurier
 *
 * This program can be distributed under the terms of the GNU GPL.
 * See the file COPYING.
*/

/*
 * (syslog like) message severity
 * 0: emerge,  1: alert
 * 2: crit,    3: err
 * 4: warning, 5: notice
 * 6: info,    7: debug,  8: none
 */

HOST = "127.0.0.1";

var derp =   require("./lib/util"),
    io   =   require("socket.io"),
    net  =   require("net"),
    util =   require("util"),
    url  =   require("url"),
    http =   require("http"),
    dgram =  require("dgram"),
    event =  require("events"),
    uuid =   require('node-uuid'),
    emitter = new event.EventEmitter,
    log_buffer = { id: 0, severity: 'none', message:  '--MARK--' };

function Client(stream, type) {
  this.type   = type;
  this.stream = stream;
  this.subscription = [
    'emerge', 'alert', 'crit', 'err', 'warning',
    'notice', 'info', 'debug', 'none'
  ];
}

(function() {
  var blode = {};

  blode.config = require('./config');
  blode.http   = require('./http');
  blode.udp    = require('./udp');

  blode.clients = [];

  blode.udp.listen(HOST, blode.config.dgram.log_port, emitter);
  blode.http.listen(HOST, blode.config.http.log_port, emitter);

  blode.tcp = {};
  blode.tcp.broadcast = net.createServer(function(stream) {

    stream.setEncoding('utf8');

    var buffer = '',
        client = new Client(stream, 'tcp');

    blode.clients.push(client);

    stream.on('error', function() {
      blode.clients.remove(client);
      client.stream.end();
    });

    stream.on('end', function() {
      blode.clients.remove(client);
      client.stream.end();
    });

    stream.on('data', function(data) {
      try {
        var subscribe = JSON.parse(data);
        if(subscribe instanceof Array)
          client.subscription = subscribe;
      } catch(e) { console.log(e); }
    });

  }).listen(blode.config.socket.broadcast_port, HOST);


  util.puts("tcp broadcast started on " + HOST + ":" + blode.config.socket.broadcast_port);

  blode.io = io.listen(blode.config.io.port);
  blode.io.configure(function() {
    blode.io.enable('browser client minification');
    blode.io.enable('browser client etag');
    blode.io.enable('browser client gzip');
    blode.io.set('log level', 1);
  });
  blode.io.configure('development', function() { blode.io.set('log level', 3); });

  blode.io.on('connection', function(socket) {
    var client = new Client(socket, 'io');
    blode.clients.push(client);

    socket.on("disconnect", function() {
      blode.clients.remove(client);
    });
  });
  util.puts("socket.io broadcast started on " + HOST + ":" + blode.config.io.port);

  emitter.on("log", function(log) {

    log.id = uuid.v4();

    blode.clients.forEach(function(client) {

      try {

        if(client.subscription.indexOf(log.severity) != -1) {

          if(client.type === 'tcp')
            client.stream.write(JSON.stringify(log) + "\r\n");
          else if(client.type === 'io')
            client.stream.volatile.emit('message', JSON.stringify(log));

        }

      } catch(e) {

        console.log(e);
        socket_clients.remove(client);

      }

    });

  });
})();
