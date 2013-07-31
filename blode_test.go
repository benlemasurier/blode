package main

import "testing"

func TestNewEvent(t *testing.T) {
	json_s := "{'severity': '1', 'message': 'test'}"
	e, err := NewEvent(json_s)
	if err != nil {
		t.Errorf("NewEvent(%s): %v", json_s, err)
	}

	if e.Id == "" {
		t.Errorf("NewEvent(%v) returned without an ID")
	}
}
