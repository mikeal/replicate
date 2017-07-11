# Replicate — Simple, Fast and Reliable CouchDB Replication with Node.js

[![Greenkeeper badge](https://badges.greenkeeper.io/mikeal/replicate.svg)](https://greenkeeper.io/)

## Install

``` sh
[sudo] npm install -g replicate
```

## Usage

Replicate installs as a executable file in unix based systems. Simply:

``` sh
replicate http://admin:pass@somecouch/sourcedb http://admin:pass@somecouch/destinationdb
```

## Library

Replicate can also be used as a library. Check `bin.js` for a quick example.