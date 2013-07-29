package main

import (
  "github.com/nu7hatch/gouuid"
  "net"
  "bufio"
  "encoding/json"
  "log"
)

type Client struct {
  incoming chan string
  outgoing chan string
  reader *bufio.Reader
  writer *bufio.Writer
}

func (client *Client) Read() {
  for {
    line, _ := client.reader.ReadString('\n')
    client.incoming <- line
  }
}

func (client *Client) Write() {
  for data := range client.outgoing {
    client.writer.WriteString(data)
    client.writer.Flush()
  }
}

func (client *Client) Listen() {
  go client.Read()
  go client.Write()
}

func NewClient(conn net.Conn) *Client {
  reader := bufio.NewReader(conn)
  writer := bufio.NewWriter(conn)

  client := &Client{
    incoming: make(chan string),
    outgoing: make(chan string),
    reader: reader,
    writer: writer,
  }

  client.Listen()

  return client
}

type Stream struct {
  clients []*Client
  joins chan net.Conn
  incoming chan string
  outgoing chan string
}

func (stream *Stream) Broadcast(event *Event) {
  for _, client := range stream.clients {
    client.outgoing <- event.String()
  }
}

func (stream *Stream) Join(conn net.Conn) {
  client := NewClient(conn)
  stream.clients = append(stream.clients, client)

  go func() {
    for {
      stream.incoming <- <-client.incoming
    }
  }()
}

func (stream *Stream) Listen() {
  go func() {
    for {
      select {
      case data := <-stream.incoming:
        event, err := NewEvent(data)
        if err != nil {
          log.Println(err)
          continue
        }

        stream.Broadcast(event)
      case conn := <-stream.joins:
        stream.Join(conn)
      }
    }
  }()
}

func NewStream() *Stream {
  stream := &Stream{
    clients: make([]*Client, 0),
    joins: make(chan net.Conn),
    incoming: make(chan string),
    outgoing: make(chan string),
  }

  stream.Listen()

  return stream
}

type Event struct {
  Id string
  Severity string
  Message string
}

func (event *Event) String() (string) {
  data, err := json.Marshal(event)
  if err != nil {
    log.Println(err)
  }

  return string(data) + "\n"
}

func NewEvent(event string) (*Event, error) {
  id, err := uuid.NewV4()
  if err != nil {
    log.Println(err)
    return nil, err
  }

  e := new(Event)
  json.Unmarshal([]byte(event), &e)
  e.Id = id.String()

  return e, nil
}

func main() {
  stream := NewStream()

  tcp_server, err := net.Listen("tcp", ":8001")
  if err != nil {
    log.Fatal(err)
  }

  for {
    conn, err := tcp_server.Accept()
    if err != nil {
      log.Println(err)
      continue
    }

    log.Printf("%v <-> %v\n", conn.LocalAddr(), conn.RemoteAddr())
    stream.joins <- conn
  }
}
