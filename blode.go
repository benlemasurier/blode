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
	TCP_ADDR         = ":8001"
	UDP_ADDR         = ":8002"
	UDP_BUF_SIZE     = 4096
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

// Send event data to all connected clients
func (s *Stream) Broadcast(event *Event) {
	// increment the total number of events broadcasted
	s.stats.AddEvent()

	for _, c := range s.clients {
		c.outgoing <- event.String()
	}
}

// Process an incoming client connection
func (s *Stream) Connect(conn net.Conn) {
	// increment the number connected clients
	s.stats.AddPeer()

	c := NewClient(conn, s)
	s.clients[conn] = c

	go func() {
		for {
			s.incoming <- <-c.incoming
		}
	}()

	go func() {
		for {
			s.disconnect <- <-c.disconnect
		}
	}()
}

func (s *Stream) Disconnect(conn net.Conn) {
	// decrease the number connected clients
	s.stats.RemovePeer()

	delete(s.clients, conn)
}

func (s *Stream) Listen() {
	for {
		select {
		case data := <-s.incoming:
			s.Broadcast(data)
		case conn := <-s.connect:
			s.Connect(conn)
		case disconnect := <-s.disconnect:
			s.Disconnect(disconnect)
		}
	}
}

// Send the client stream stats
func (s *Stream) Stats(c *Client) {
	s.stats.mutex.Lock()
	stats, err := json.MarshalIndent(s.stats, "", "\t")
	s.stats.mutex.Unlock()

	if err != nil {
		c.errors <- err.Error() + "\n"
		return
	}

	c.errors <- string(stats) + "\n"
}

func NewStream() *Stream {
	s := &Stream{
		clients:    make(map[net.Conn]*Client),
		connect:    make(chan net.Conn),
		incoming:   make(chan *Event),
		outgoing:   make(chan string),
		disconnect: make(chan net.Conn),
	}

	go s.Listen()

	return s
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

func (c *Client) Subscribe(filter string) {
	r, err := regexp.Compile(filter)
	if err != nil {
		c.errors <- err.Error() + "\n"
		return
	}

	// TODO: send a success message to the client?
	c.subscription = r
}

func (c *Client) Read() {
	for {
		data, err := c.reader.ReadString('\n')
		if err != nil {
			if err == io.EOF {
				log.Printf("client disconnected: %s", c.conn.RemoteAddr().String())
				c.disconnect <- c.conn
				c.conn.Close()
				return
			}

			log.Printf("client read error: %s\n", err)
		}

		c.stream.stats.AddBytesIn(len([]byte(data)))

		if data == "\n" {
			continue
		}

		// this serves mulitple purposes:
		//  - validates json
		//	- determines the type of request (subscription, stats, event)
		var f interface{}
		err = json.Unmarshal([]byte(data), &f)
		if err != nil {
			c.errors <- err.Error() + "\n"
			continue
		}

		filter := f.(map[string]interface{})
		if filter["subscribe"] != nil {
			c.Subscribe(filter["subscribe"].(string))
			continue
		}

		if filter["stats"] != nil {
			c.stream.Stats(c)
			continue
		}

		event, err := NewEvent(data)
		if err != nil {
			log.Println(err)
			continue
		}

		if event.Message == "" {
			// TODO: proper type here
			c.errors <- "{\"error\": \"invalid message format\"}\n"
			continue
		}

		c.incoming <- event
	}
}

func (c *Client) Write() {
	for {
		select {
		case data := <-c.errors:
			c.writer.WriteString(data)
			c.writer.Flush()

			c.stream.stats.AddError(1)
		case data := <-c.outgoing:
			if c.subscription == nil {
				break
			}

			if c.subscription.MatchString(data) == true {
				c.writer.WriteString(data)
				c.writer.Flush()

				c.stream.stats.AddBytesOut(len([]byte(data)))
			}
		}
	}
}

func (c *Client) Listen() {
	go c.Read()
	go c.Write()
}

func NewClient(conn net.Conn, s *Stream) *Client {
	reader := bufio.NewReader(conn)
	writer := bufio.NewWriter(conn)

	c := &Client{
		incoming:   make(chan *Event),
		outgoing:   make(chan string),
		errors:     make(chan string),
		reader:     reader,
		writer:     writer,
		conn:       conn,
		disconnect: make(chan net.Conn),
	}

	c.stream = s

	c.Listen()

	return c
}

type Event struct {
	Id       string
	Severity string
	Message  string
}

func (e *Event) String() string {
	data, err := json.MarshalIndent(e, "", "\t")
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
	mutex    sync.Mutex
	Errors   uint64 // number of client errors
	Events   uint64 // number of events broadcasted
	Peers    uint64 // number of clients connected
	BytesIn  uint64 // number of incoming bytes
	BytesOut uint64 // number of outgoing bytes
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

func (s *Stats) AddBytesIn(b int) {
	s.mutex.Lock()
	s.BytesIn += uint64(b)
	s.mutex.Unlock()
}

func (s *Stats) AddBytesOut(b int) {
	s.mutex.Lock()
	s.BytesOut += uint64(b)
	s.mutex.Unlock()
}

func (s *Stats) AddError(n int) {
	s.mutex.Lock()
	s.Errors += uint64(n)
	s.mutex.Unlock()
}

func tcp_server(s *Stream) {
	tcp_server, err := net.Listen("tcp", TCP_ADDR)
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
		s.connect <- conn
	}

}

func udp_server(s *Stream) {
	udp_addr, err := net.ResolveUDPAddr("udp", ":8002")
	if err != nil {
		log.Fatal(err)
	}

	udp_server, err := net.ListenUDP("udp", udp_addr)
	if err != nil {
		log.Fatal(err)
	}

	var buf [UDP_BUF_SIZE]byte
	for {
		rlen, addr, err := udp_server.ReadFromUDP(buf[0:])
		if err != nil {
			log.Println(err)
			continue
		}

		event, err := NewEvent(string(buf[0:rlen]))
		if err != nil {
			log.Println(err)
			continue
		}

		if event.Message == "" {
			continue
		}

		s.incoming <- event

		log.Printf("%vb received <- udp[%v] \n", rlen, addr.IP)
	}
}

func main() {
	stream := NewStream()

	go udp_server(stream)
	tcp_server(stream)
}
