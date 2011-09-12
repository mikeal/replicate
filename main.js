var request = require('request')
  , events = require('events')
  , util = require('util')
  , follow = require('follow')
  , formidable = require('formidable')
  , r = request.defaults({json:true})
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
        else if (resp.statusCode !== 200) errors[i] = new Error("status is not 200.")
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
Replicator.prototype.pushDoc = function (id, rev, cb) {
  var options = this
    , headers = {'accept':"multipart/related,application/json"}
    ;
    
  if (!cb) cb = function () {}

  if (options.filter && options.filter(id, rev) === false) return cb({id:id, rev:rev, filter:false})

  if (!options.mutation) {
    request
    .get({url: options.from + encodeURIComponent(id) + '?attachments=true&revs=true&rev=' + rev, headers:headers})
    .pipe(request.put(options.to + encodeURIComponent(id) + '?new_edits=false&rev=' + rev, function (e, resp, b) {
      if (e) {
        cb({error:e, id:id, rev:rev, body:b}) 
      } else if (resp.statusCode > 199 && resp.statusCode < 300) {
        cb({id:id, rev:rev, success:true, resp:resp, body:b})
      } else {
        cb({error:"status code is not 201.", id:id, resp:resp, body:b})
      }
      
    }))
  } else {
    var form = new formidable.IncomingForm();
    request.get(
      { uri: options.from + encodeURIComponent(id) + '?attachments=true&revs=true&rev=' + rev
      , onResponse: function (e, resp) {
          // form.parse(resp)
        }
      }, function (e, resp, body) {
        console.log(resp.statusCode)
        console.log(resp.headers)
        // console.error(body)
      }
    )
    // form.parse(, 
    //   function(err, fields, files) {
    //     options.mutate(err, fields, files)
    //   }
    // )
  
    // 
    // .pipe(request.put(options.to + id + '?new_edits=false&rev=' + rev, function (e, resp, b) {
    //   if (e) {
    //     options.emit("failed", e)
    //     results[id] = {error:e}
    //   } else if (resp.statusCode === 201) {
    //     options.emit("pushed", resp, b)
    //     results[id] = {rev:rev, success:true}
    //   } else {
    //     options.emit("failed", resp, b)
    //     results[id] = {error:"status code is not 201.", resp:resp, body:b}
    //   }
    //   cb(e, resp b)
    // }))
  }
}

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
      options.since = body.results[body.results.length - 1].seq
      body.results.forEach(function (change) {
        byid[change.id] = change.changes.map(function (r) {return r.rev})
      })
      r.post({url:options.to + '_missing_revs', json:byid}, function (e, resp, body) {
        var results = []
          , counter = 0
          ;
        body = body.missing_revs
        for (var id in body) {
          (function (id) {
            if (!id) return;
            body[id].forEach(function (rev) {
              counter++
              options.pushDoc(id, rev, function (obj) {
                results.push(obj)
                if (obj.error) options.emit('failed', obj)
                else options.emit('pushed', obj)
                counter--
                if (counter === 0) cb(results)
              })
              
            })
          })(id)
        }
        if (Object.keys(body).length === 0) cb({})
      })
    })
  })
}
Replicator.prototype.continuous = function () {
  var options = this
  options.push(function () {
    follow({db:options.from, since:options.since}, function (e, change) {
      if (e) return
      change.changes.forEach(function (o) {
        options.pushDoc(change.id, o.rev, function (obj) {
          if (obj.error) options.emit('failed', obj)
          else options.emit('pushed', obj)
        })
      })
    })
  })
}
  

function replicate (from, to, cb) {
  if (typeof from === 'object') var options = from
  else {
    var options = {from:from, to:to}
  }
  var rep = new Replicator(options)
  rep.push(cb)
  return rep
}

module.exports = replicate
replicate.Replicator = Replicator