#!/usr/bin/perl

use LWP::Simple;
print get("http://localhost:8000?message=test&status=true");
