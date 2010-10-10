#!/usr/bin/perl
use strict;
use LWP::Simple;

my @levels = ("emerge",
              "alert",
              "crit",
              "err",
              "warning",
              "notice",
              "info",
              "debug",
              "none");

for(;;) {
    my $level = $levels[rand(8)];
    print get("http://localhost:8000?severity=$level&message=test");
    sleep(1);
}
