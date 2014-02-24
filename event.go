package main

import (
	"encoding/json"
	"github.com/benlemasurier/blode/config"
	"github.com/nu7hatch/gouuid"
	"log"
)

type Event struct {
	Id       string
	Severity string
	Message  string
}

func (e *Event) String() string {
	data, err := json.MarshalIndent(e, "", "\t")
	if err != nil {
		log.Println(err)
	}

	return string(data) + "\n"
}

func NewEvent(event string) (*Event, error) {
	id, err := uuid.NewV4()
	if err != nil {
		log.Println(err)
		return nil, err
	}

	e := new(Event)
	json.Unmarshal([]byte(event), &e)
	e.Id = id.String()

	// assign a message severity if none was provided
	if e.Severity == "" {
		e.Severity = *config.DefaultSeverity
	}

	return e, nil
}
