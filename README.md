Blode is a simple yet powerful syslog-like event server written in node.js

Basically, it works like this:

      +--------+  +--------+  +--------+
      |  php   |  |  ruby  |  | syslog |    <-- event sources
      +--------+  +--------+  +--------+
           \           |          /
            \          |         /        
             \         |        /        
              \        |       /         
            +--------------------+          
            |    blode server    |          <-- event listener/broadcaster
            +--------------------+
                       |
                      / \
                     /   \
                    /     \
                   /       \
                  /         \
          +---------+     +----------+
          | browser |     | database |       <-- event stream clients
          +---------+     +----------+
       

Events are pushed from any source via tcp/udp/http to the blode listener. Any event
received by blode is then pushed out to any listening clients. Clients can obverve
the broadcast via a websocket, tcp, or udp connection.

Requirements
------------
node.js >= 0.4.12 
npm (npmjs.org :: `curl http://npmjs.org/install.sh | sudo sh`)

Installation
------------
```
git clone git://github.com/benlemasurier/blode.git
sudo npm install websocket-server
```

example visualization (sparkfun web servers):   http://vimeo.com/30873952
example visualization (sparkfun mysql queries): http://vimeo.com/20752495

```
# start log server
$ node blode.js

# start logging test events
$ cd test
$ ./ping &

# listen to events
$ ./example_netcat_client.sh &
```
