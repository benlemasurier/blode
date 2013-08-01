package main

import (
	"bufio"
	"encoding/json"
	"github.com/nu7hatch/gouuid"
	"io"
	"log"
	"net"
	"regexp"
	"sync"
)

const (
	DEFAULT_SEVERITY = "debug"
)

type Stream struct {
	clients    map[net.Conn]*Client
	connect    chan net.Conn
	disconnect chan net.Conn
	incoming   chan *Event
	outgoing   chan string
	stats      Stats
}

func (stream *Stream) Broadcast(event *Event) {
	// increment the total number of events broadcasted
	stream.stats.AddEvent()

	for _, client := range stream.clients {
		client.outgoing <- event.String()
	}
}

func (stream *Stream) Connect(conn net.Conn) {
	// increment the number connected clients
	stream.stats.AddPeer()

	client := NewClient(conn, stream)
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

func (stream *Stream) Disconnect(conn net.Conn) {
	// decrease the number connected clients
	stream.stats.RemovePeer()

	delete(stream.clients, conn)
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
				stream.Disconnect(disconnect)
			}
		}
	}()
}

// Send the client stream stats
func (s *Stream) Stats(c *Client) {
	s.stats.mutex.Lock()
	stats, err := json.Marshal(s.stats)
	s.stats.mutex.Unlock()

	if err != nil {
		c.errors <- err.Error() + "\n"
		return
	}

	c.errors <- string(stats) + "\n"
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

type Client struct {
	stream       *Stream
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

		// this serves mulitple purposes:
		//  - validates json
		//	- determines the type of request (subscription, stats, event)
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

		if filter["stats"] != nil {
			client.stream.Stats(client)
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

func NewClient(conn net.Conn, s *Stream) *Client {
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

	client.stream = s

	client.Listen()

	return client
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

type Stats struct {
	mutex  sync.Mutex
	Events uint64 // number of events broadcasted
	Peers  uint64 // number of clients connected
}

func (s *Stats) AddEvent() {
	s.mutex.Lock()
	s.Events++
	s.mutex.Unlock()
}

func (s *Stats) AddPeer() {
	s.mutex.Lock()
	s.Peers++
	s.mutex.Unlock()
}

func (s *Stats) RemovePeer() {
	s.mutex.Lock()
	s.Peers--
	s.mutex.Unlock()
}

func main() {
	stream := NewStream()

	tcp_server, err := net.Listen("tcp", ":8001")
	if err != nil {
		log.Fatal(err)
	}

	udp_addr, err := net.ResolveUDPAddr("udp", ":8002")
	if err != nil {
		log.Fatal(err)
	}

	udp_server, err := net.ListenUDP("udp", udp_addr)
	if err != nil {
		log.Fatal(err)
	}

	go func() {
		for {
			conn, err := tcp_server.Accept()
			if err != nil {
				log.Println(err)
				continue
			}

			log.Printf("%v <-> %v\n", conn.LocalAddr(), conn.RemoteAddr())
			stream.connect <- conn
		}
	}()

	var buf [1024]byte
	for {
		rlen, addr, err := udp_server.ReadFromUDP(buf[0:])
		if err != nil {
			log.Println(err)
			continue
		}

		log.Printf("%v <-> %v: %v[%v]\n", udp_addr.IP, addr.IP, buf, rlen)
	}
}
