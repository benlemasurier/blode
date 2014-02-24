# Blode [![Build Status](https://travis-ci.org/benlemasurier/blode.png)](https://travis-ci.org/benlemasurier/blode)


## a simple, powerful syslog-like event broadcast daemon
==============================================================

[example visualization](http://vimeo.com/20752495) (SparkFun MySQL queries/sec)

[example visualization](http://vimeo.com/30873952) (SparkFun nginx/memcached/mysql)

It works like this
------------------

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
