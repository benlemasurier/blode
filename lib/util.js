/*
 * Blode - a simple, powerful syslog-like event broadcast daemon
 * Copyright (C) 2010 Ben LeMasurier <ben.lemasurier@gmail.com>
 *
 * This program can be distributed under the terms of the GNU GPL.
 * See the file COPYING.
 */

Array.prototype.remove = function(e) {
  for(var i = 0, j = this.length; i < j; i++)
    if(e == this[i])
      return this.splice(i, 1);
};
