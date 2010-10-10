#!/usr/bin/perl

use LWP::Simple;
print get("http://localhost:8000?severity=7&message=test");
