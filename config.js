var config = {};
config.io = {};
config.http = {};
config.dgram = {};
config.socket = {};

config.http.log_port         = 8000;
config.http.broadcast_port   = 8002;
config.dgram.log_port        = 8010;
config.socket.broadcast_port = 8001;
config.io.port               = 8008;

module.exports = config;
