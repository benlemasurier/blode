#!/usr/bin/perl
use strict;
use LWP::Simple;
use String::Random;
use Time::HiRes qw(usleep);

my $random_string = new String::Random;
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
    my $message = $random_string->randpattern("ccccccccccccccccccccccccccccc");
    print get("http://localhost:8000?severity=$level&message=test: $message");
    usleep(200);
}
