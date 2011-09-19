/**
 * This is an example socket client
 * that limits the broadcast
 * events to a randomly selected
 * setting.
 */
var net = require('net');
var socket = new net.Socket();
var socket_buffer = '';
var config = require('../config').config;
var valid_events = [
  'debug',
  'info',
  'notice',
  'warning',
  'err',
  'crit',
  'alert',
  'emerge',
  'none'
];

socket.connect(config.broadcast_socket_port, 'localhost', function() {
  
  socket.setEncoding('utf8');

  var random = Math.floor(Math.random() * valid_events.length + 1) - 1;
  var test_event = new Array(valid_events[random]);
  console.log('Test Level: ' + test_event);
  socket.write(JSON.stringify(test_event) + "\r\n");

  socket.on('data', function(data) {
    socket_buffer += data;
    var message = socket_buffer.indexOf("\r");
    if (message !== -1) {     
      var json = socket_buffer.slice(0, message);
      console.log(json);
      socket_buffer = socket_buffer.slice(message + 1);
    }
  });
  
});
