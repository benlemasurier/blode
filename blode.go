package main

import (
  "github.com/nu7hatch/gouuid"
  "net"
  "bufio"
  "encoding/json"
  "log"
)

// RFC 5424 syslog severity levels
// pretty sure this is the wrong way to do this
const (
  emerg  = iota // 0
  alert  = iota // 1
  crit   = iota // 2
  err    = iota // 4
  warn   = iota // 4
  notice = iota // 5
  info   = iota // 6
  debug  = iota // 7
)

type Message struct {
  Id string
  Severity uint8
  Message string
}

func main() {
  tcp_server, err := net.Listen("tcp", ":8001")
  if err != nil {
    log.Fatal(err)
  }

  tcp_conns := listen_conn_tcp(tcp_server)

  for {
    go handle_conn_tcp(<-tcp_conns)
  }
}

// Listen for TCP connections, once established push
// connection to returned channel
func listen_conn_tcp(listener net.Listener) chan net.Conn {
  ch := make(chan net.Conn)

  go func() {
    for {
      client, err := listener.Accept()
      if err != nil {
        log.Println(err)
        continue
      }

      log.Printf("%v <-> %v\n", client.LocalAddr(), client.RemoteAddr())
      ch <- client
    }
  }()

  return ch
}

func handle_conn_tcp(client net.Conn) {
  b := bufio.NewReader(client)

  for {
    line, err := b.ReadBytes('\n')
    if err != nil {
      log.Println(err)
      break; // FIXME: close connection?
    }

    var msg Message
    json.Unmarshal(line, &msg)

    // give the message a UUID
    u4, err := uuid.NewV4()
    if err != nil {
      log.Println(err)
      continue
    }

    msg.Id = u4.String()

    // testing - echo data back to the client
    client.Write(line)

    log.Println("Message Received: %v\n", msg)
  }
}
