var request = require('request')
  , events = require('events')
  , util = require('util')
  , r = request.defaults({json:true})
  // , m = request.defaults({headers:{'accept':'multipart/related'}})
  ;
  
function requests () {
  var args = Array.prototype.slice.call(arguments)
    , cb = args.pop()
    , results = []
    , errors = []
    ;
    
  for (var i=0;i<args.length;i++) {
    (function (i) {
      r(args[i], function (e, resp, body) {
        if (e) errors[i] = e
        if (resp.statusCode !== 200) errors[i] = new Error("status is not 200.")
        results.push([i, body])
        if (results.length === args.length) {
          var fullresults = [errors.length ? errors : null]
          results.forEach(function (res) {
            fullresults[res[0] + 1] = res[1]
          })
          cb.apply(this, fullresults)
        }
      })
    })(i)
  }  
  
}

function Replicator (options) {
  for (i in options) this[i] = options[i]
  // events.EventEmitter.prototype.call(this)
}
util.inherits(Replicator, events.EventEmitter)
Replicator.prototype.push = function (cb) {
  var options = this
  if (options.from[options.from.length - 1] !== '/') options.from += '/'
  if (options.to[options.to.length - 1] !== '/') options.to += '/'
  requests(options.from, options.to, function (err, fromInfo, toInfo) {
    if (err) throw err
    options.fromInfo = fromInfo
    options.toInfo = toInfo
    
    r(options.from + '_changes', function (e, resp, body) {
      if (e) throw e
      if (resp.statusCode !== 200) throw new Error("status is not 200.")
      var byid = {}
      body.results.forEach(function (change) {
        byid[change.id] = change.changes.map(function (r) {return r.rev})
      })
      
      r.post({url:options.to + '_missing_revs', json:byid}, function (e, resp, body) {
        var results = {}
          , counter = 0
          ;
        body = body.missing_revs
        for (var id in body) {
          (function (id) {
            body[id].forEach(function (rev) {
              counter++
              request
              .get(options.from + id + '?attachments=true&revs=true&rev=' + rev)
              .pipe(request.put(options.to + id + '?new_edits=false&rev=' + rev, function (e, resp, b) {
                if (e) {
                  options.emit("failed", e)
                  results[id] = {error:e}
                } else if (resp.statusCode === 201) {
                  options.emit("pushed", resp, b)
                  results[id] = {rev:rev, success:true}
                } else {
                  options.emit("failed", resp, b)
                  results[id] = {error:"status code is not 201.", resp:resp, body:b}
                }
                if (counter-- === 0) cb(null, results)
              }))
              
            })
          })(id)
        }
        if (Object.keys(body).length === 0) cb(null, {})
      })
    })
  })
}
  

function replicate (from, to) {
  if (typeof from === 'object') var options = from
  else {
    var options = {from:from, to:to}
  }
  var rep = new Replicator(options)
  rep.push()
  return rep
}

replicate("http://mikeal.iriscouch.com/hoodies", "http://mikeal.iriscouch.com/blank")