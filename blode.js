function Config() {
    this.listen_ip = "127.0.0.1";
    this.listen_port = 8000;
    this.debug = true;
}

var config = new Config;
    sys  = require("sys"),
    http = require("http"),
    url  = require("url");

http.createServer(function(request, response) {
    var parameters = url.parse(request.url, true).query;

    response.writeHead(200, { 
        "Content-Type": "text/html",
    });

    if(config.debug) {
        console.log((new Date()) + 
            ": received request. " +
            " { message: " + parameters.message + 
            ", status: " + parameters.status +" }");
    }

    response.end();
}).listen(config.listen_port, config.listen_ip);

sys.puts("Server start at http://" + config.listen_ip + ":" + config.listen_port);
