package main

import (
	"sync"
)

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
