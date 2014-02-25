package main

import "testing"

const test_message = "{'severity': '1', 'message': 'test'}"

func TestNewEvent(t *testing.T) {
	e, err := NewEvent(test_message)
	if err != nil {
		t.Errorf("NewEvent(%s): %v", test_message, err)
	}

	if e.Id == "" {
		t.Errorf("NewEvent(%v) returned without an ID", test_message)
	}
}

func BenchmarkNewEvent(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_, err := NewEvent(test_message)
		if err != nil {
			b.Error(err)
		}
	}
}