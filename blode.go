package main

import (
	"flag"
	"fmt"
	"github.com/benlemasurier/blode/config"
	"log"
	"net"
	"runtime"
)

const UDP_BUF_SIZE = 4096

func tcp_server(s *Stream) {
	tcp_server, err := net.Listen("tcp", *config.TcpAddr)
	if err != nil {
		log.Fatal(err)
	}

	if *config.Debug {
		log.Println("tcp server started,", *config.TcpAddr)
	}

	for {
		conn, err := tcp_server.Accept()
		if err != nil {
			log.Println(err)
			continue
		}

		if *config.Debug {
			log.Printf("%v <-> %v\n", conn.LocalAddr(), conn.RemoteAddr())
		}

		s.connect <- conn
	}
}

func udp_server(s *Stream) {
	udp_addr, err := net.ResolveUDPAddr("udp", *config.UdpAddr)
	if err != nil {
		log.Fatal(err)
	}

	udp_server, err := net.ListenUDP("udp", udp_addr)
	if err != nil {
		log.Fatal(err)
	}

	if *config.Debug {
		log.Println("udp server started,", *config.UdpAddr)
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

		if *config.Debug {
			log.Printf("%vb received <- udp[%v] \n", rlen, addr.IP)
		}
	}
}

func Usage() {
	fmt.Println("blode version ", config.Version)

	flag.PrintDefaults()
}

func main() {
	flag.Usage = Usage
	flag.Parse()

	log.SetPrefix("BLODE ")
	log.SetFlags(log.Ldate | log.Lmicroseconds)

	runtime.GOMAXPROCS(runtime.NumCPU())
	stream := NewStream()

	go udp_server(stream)
	tcp_server(stream)
}
