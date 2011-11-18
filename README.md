# Replicate — Simple, Fast and Reliable CouchDB Replication with Node.js

## Install

``` sh
[sudo] npm install -g replicate follow request formidable
```

## Usage

Replicate installs as a executable file in unix based systems. Simply:

``` sh
replicate http://admin:pass@somecouch/sourcedb http://admin:pass@somecouch/destinationdb
```

## Library

Replicate can also be used as a library. Check `bin.js` for a quick example.