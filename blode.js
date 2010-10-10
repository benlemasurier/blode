var sys  = require("sys"),
    http = require("http"),
    url  = require("url");

// to be in some sort of config file
var listen_ip = "127.0.0.1";
var listen_port = 8000;
var debug = true;

http.createServer(function(request, response) {
    var parameters = url.parse(request.url, true).query;

    response.writeHead(200, { 
        "Content-Type": "text/html",
    });

    if(debug) {
        console.log((new Date()) + 
            ": received request. " +
            " { message: " + parameters.message + 
            ", status: " + parameters.status +" }");
    }

    response.end();
}).listen(listen_port);

sys.puts("Server start at http://" + listen_ip + ":" + listen_port);
