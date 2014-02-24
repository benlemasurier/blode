package config

import "flag"

var (
	TcpAddr         = flag.String("t", ":8001", "TCP address to bind to.")
	UdpAddr         = flag.String("u", ":8002", "UDP address to bind to.")
	Debug           = flag.Bool("d", false, "Enable debug output?")
	DefaultSeverity = flag.String("s", "debug", "Default severity level.")
)
