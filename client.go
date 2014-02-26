package main

import (
	"bufio"
	"encoding/json"
	"io"
	"log"
	"net"
	"regexp"
	"sync"
)

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
	mutex        sync.Mutex
}

func (c *Client) Subscribe(filter string) {
	r, err := regexp.Compile(filter)
	if err != nil {
		c.errors <- err.Error() + "\n"
		return
	}

	// TODO: send a success message to the client?
	c.mutex.Lock()
	c.subscription = r
	c.mutex.Unlock()
}

func (c *Client) Subscription() *regexp.Regexp {
	c.mutex.Lock()
	s := c.subscription
	c.mutex.Unlock()

	return s
}

func (c *Client) Read() {
	defer c.Close()

	for {
		data, err := c.reader.ReadString('\n')

		// did the client disconnect?
		if err == io.EOF {
			return
		}

		if err != nil {
			log.Printf("client read error: %s\n", err)
		}

		c.stream.stats.AddBytesIn(len([]byte(data)))

		if data == "\r\n" {
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
      c.errors <- err.Error() + "\n"
			continue
		}

    log.Println(data)

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
			if c.Subscription() == nil {
				break
			}

			if c.Subscription().MatchString(data) == true {
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

func (c *Client) Close() {
	c.conn.Close()
  c.conn = nil
	c.disconnect <- c.conn

	log.Printf("client disconnected: %s", c.conn.RemoteAddr().String())
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
