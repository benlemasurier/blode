package main

import "testing"

func TestAddEvent(t *testing.T) {
	stats := Stats{}
	stats.AddEvent()

	if stats.Events != 1 {
		t.Errorf("stats.Events should equal 1, got %d", stats.Events)
	}
}

func TestAddPeer(t *testing.T) {
	stats := Stats{}
	stats.AddPeer()

	if stats.Peers != 1 {
		t.Errorf("stats.Peers should equal 1, got %d", stats.Peers)
	}
}

func TestRemovePeer(t *testing.T) {
	stats := Stats{}
	stats.AddPeer()
	stats.RemovePeer()

	if stats.Peers != 0 {
		t.Errorf("stats.Peers should equal 0, got %d", stats.Peers)
	}
}

func TestAddBytesIn(t *testing.T) {
	stats := Stats{}
	stats.AddBytesIn(10)

	if stats.BytesIn != 10 {
		t.Errorf("stats.BytesIn should equal 10, got %d", stats.BytesIn)
	}
}

func TestAddBytesOut(t *testing.T) {
	stats := Stats{}
	stats.AddBytesOut(10)

	if stats.BytesOut != 10 {
		t.Errorf("stats.BytesOut should equal 10, got %d", stats.BytesOut)
	}
}

func TestAddError(t *testing.T) {
	stats := Stats{}
	stats.AddError(1)

	if stats.Errors != 1 {
		t.Errorf("stats.Errors should equal 1, got %d", stats.Errors)
	}
}
