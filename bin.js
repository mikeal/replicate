#!/usr/bin/env node

var replicate = require("./main");

var args = process.argv.slice(0);

// shift off node and script name
args.shift(); args.shift();

if(args.length < 2) throw "syntax: replicate http://admin:pass@somecouch/sourcedb http://admin:pass@somecouch/destinationdb"

replicate(args[0], args[1], function(results) {console.log('replication complete')});

