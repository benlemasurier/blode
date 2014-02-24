package main

import (
	"flag"
	"fmt"
	"log"
	"net"
	"os"
	"runtime"
)

const (
	BLODE_VERSION    = "0.0.1"
	TCP_ADDR         = ":8001"
	UDP_ADDR         = ":8002"
	UDP_BUF_SIZE     = 4096
	DEFAULT_SEVERITY = "debug"
)

func tcp_server(s *Stream) {
	tcp_server, err := net.Listen("tcp", TCP_ADDR)
	if err != nil {
		log.Fatal(err)
	}

	log.Println("tcp server started,", TCP_ADDR)

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
	udp_addr, err := net.ResolveUDPAddr("udp", UDP_ADDR)
	if err != nil {
		log.Fatal(err)
	}

	udp_server, err := net.ListenUDP("udp", udp_addr)
	if err != nil {
		log.Fatal(err)
	}

	log.Println("udp server started,", UDP_ADDR)

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

func Usage() {
	fmt.Fprintf(os.Stderr, "Usage: %s [OPTIONS]\n", os.Args[0])
}

func main() {
	flag.Usage = Usage
	flag.Parse()

	log.SetPrefix("BLODE ")
	log.SetFlags(log.Ldate | log.Lmicroseconds)

	log.Println("blode version ", BLODE_VERSION)
	runtime.GOMAXPROCS(runtime.NumCPU())
	stream := NewStream()

	go udp_server(stream)
	tcp_server(stream)
}
