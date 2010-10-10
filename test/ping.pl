#!/usr/bin/perl

use LWP::Simple;
while(true) {
    print get("http://localhost:8000?severity=7&message=test");
    sleep(1);
}
