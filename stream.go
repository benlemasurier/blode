package main

import (
	"encoding/json"
  "net"
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
			select {
			case incoming := <-c.incoming:
				s.incoming <- incoming
			case disconnect := <-c.disconnect:
				s.disconnect <- disconnect
			}
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

	// FIXME: create another channel for stats?
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
