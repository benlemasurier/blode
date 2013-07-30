package main

import (
	"bufio"
	"encoding/json"
	"github.com/nu7hatch/gouuid"
	"io"
	"log"
	"net"
	"regexp"
)

const (
	DEFAULT_SEVERITY = "debug"
)

type Client struct {
	incoming     chan *Event
	outgoing     chan string
	errors       chan string
	disconnect   chan net.Conn
	conn         net.Conn
	reader       *bufio.Reader
	writer       *bufio.Writer
	subscription *regexp.Regexp
}

func (client *Client) Subscribe(filter string) {
	r, err := regexp.Compile(filter)
	if err != nil {
		client.errors <- err.Error() + "\n"
		return
	}

	// TODO: send a success message to the client?
	client.subscription = r
}

func (client *Client) Read() {
	for {
		data, err := client.reader.ReadString('\n')
		if err != nil {
			if err == io.EOF {
				log.Printf("client disconnected: %s", client.conn.RemoteAddr().String())
				client.disconnect <- client.conn
				client.conn.Close()
				return
			}

			log.Printf("client read error: %s\n", err)
		}

		if data == "\n" {
			continue
		}

		// this serves two purposes:
		//  - validates json
		//	- determine whether this is a subscription request
		var f interface{}
		err = json.Unmarshal([]byte(data), &f)
		if err != nil {
			client.errors <- err.Error() + "\n"
			continue
		}

		filter := f.(map[string]interface{})
		if filter["subscribe"] != nil {
			client.Subscribe(filter["subscribe"].(string))
			continue
		}

		event, err := NewEvent(data)
		if err != nil {
			log.Println(err)
			continue
		}

		client.incoming <- event
	}
}

func (client *Client) Write() {
	for data := range client.outgoing {
		if client.subscription == nil {
			continue
		}

		if client.subscription.MatchString(data) == true {
			client.writer.WriteString(data)
			client.writer.Flush()
		}
	}
}

func (client *Client) WriteError() {
	for data := range client.errors {
		client.writer.WriteString(data)
		client.writer.Flush()
	}
}

func (client *Client) Listen() {
	go client.Read()
	go client.Write()
	go client.WriteError()
}

func NewClient(conn net.Conn) *Client {
	reader := bufio.NewReader(conn)
	writer := bufio.NewWriter(conn)

	client := &Client{
		incoming:   make(chan *Event),
		outgoing:   make(chan string),
		errors:     make(chan string),
		reader:     reader,
		writer:     writer,
		conn:       conn,
		disconnect: make(chan net.Conn),
	}

	client.Listen()

	return client
}

type Stream struct {
	clients    map[net.Conn]*Client
	connect    chan net.Conn
	disconnect chan net.Conn
	incoming   chan *Event
	outgoing   chan string
}

func (stream *Stream) Broadcast(event *Event) {
	for _, client := range stream.clients {
		client.outgoing <- event.String()
	}
}

func (stream *Stream) Connect(conn net.Conn) {
	client := NewClient(conn)
	stream.clients[conn] = client

	go func() {
		for {
			stream.incoming <- <-client.incoming
		}
	}()

	go func() {
		for {
			stream.disconnect <- <-client.disconnect
		}
	}()
}

func (stream *Stream) Listen() {
	go func() {
		for {
			select {
			case data := <-stream.incoming:
				stream.Broadcast(data)
			case conn := <-stream.connect:
				stream.Connect(conn)
			case disconnect := <-stream.disconnect:
				delete(stream.clients, disconnect)
			}
		}
	}()
}

func NewStream() *Stream {
	stream := &Stream{
		clients:    make(map[net.Conn]*Client),
		connect:    make(chan net.Conn),
		incoming:   make(chan *Event),
		outgoing:   make(chan string),
		disconnect: make(chan net.Conn),
	}

	stream.Listen()

	return stream
}

type Event struct {
	Id       string
	Severity string
	Message  string
}

func (event *Event) String() string {
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

	// assign a message severity if none was provided
	if e.Severity == "" {
		e.Severity = DEFAULT_SEVERITY
	}

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
		stream.connect <- conn
	}
}