package main

import "testing"

func TestNewStream(t *testing.T) {
	s := NewStream()
	for c := range s.clients {
		t.Errorf("%v", c)
	}
}

func BenchmarkNewStream(b *testing.B) {
	for i := 0; i < b.N; i++ {
	  NewStream()
	}
}
