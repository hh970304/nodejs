Index.js


'use strict'

var net = require('net')//引用net模块来实现TCP服务器与TCP客户端之间通信
  , tls = require('tls') //引用tls模块被用作https模块的基础模块
                           允许http服务端和客户端通过TLS/SSL通信
  , http = require('http') //引用http模块，被用于web浏览器和网站服务器之间的传递信息
  , https = require('https')//HTTPS模块在http模块上加上了ssl协议，默认端口443
  , events = require('events')//引用事件模块
  , assert = require('assert')//引用assert模块主要用于断言，表达式不符合预期，
                                就抛出一个异常
  , util = require('util') //引用util模块，提供常用函数的集合
  , Buffer = require('safe-buffer').Buffer//引用buffer模块，用于存储二进制数据
  ;

exports.httpOverHttp = httpOverHttp//暴露自定义模块接口
exports.httpsOverHttp = httpsOverHttp
exports.httpOverHttps = httpOverHttps
exports.httpsOverHttps = httpsOverHttps

//定义函数功能 定义一个新的隧道代理响应http的请求
function httpOverHttp(options) {   
  var agent = new TunnelingAgent(options)
  agent.request = http.request
  return agent
}

function httpsOverHttp(options) {
  var agent = new TunnelingAgent(options)
  agent.request = http.request
  agent.createSocket = createSecureSocket //创建安全套接字
  agent.defaultPort = 443       //HTTPS模块的默认端口443
  return agent
}

function httpOverHttps(options) {
  var agent = new TunnelingAgent(options)
  agent.request = https.request
  return agent
}

function httpsOverHttps(options) {
  var agent = new TunnelingAgent(options)
  agent.request = https.request
  agent.createSocket = createSecureSocket
  agent.defaultPort = 443
  return agent
}

//通过HTTP协议与代理服务器建立连接，协议信令中包含要连接到的远程主机的IP和端口号，如果有需要身份验证的话还需要加上授权信息，服务器收到信令后首先进行身份验证，通过后便与远程主机建立连接，连接成功之后会返回给客户端200，表示验证通过，就这么简单，下面是具体的信令格式：
CONNECT 124.xxx.xxx.xx:443 HTTP/1.1 //建立http隧道要443端口
Proxy-Connection: Keep-Alive   //客户端到服务器端的连接持续有效
Content-Length: 0
Host: 124.xxx.xxx.xx   //主机地址
Proxy-Authorization:Basic YTph //身份验证信息
User-Agent: OpenFetion //可以标识请求者的信息,如什么浏览器类型和版本、操作系统、使用语言等信息
其中Proxy-Authorization是身份验证信息，Basic后面的字符串是用户名和密码组合后进行base64编码的结果，也就是对username:password进行base64编码。

HTTP隧道技术就是把所有要传送的数据全部封装到HTTP协议里进行传送，HTTP隧道技术几乎支持了所有的上网方式.



//http代理：其功能就是代理网络用户去取得网络信息。形象的说：它是网络信息的中转站。

代理服务器是介于浏览器和Web服务器之间的一台服务器，有了它之后，浏览器不是直接到Web服务器去取回网页而是向代理服务器发出请求，
Request信号会先送到代理服务器，由代理服务器来取回浏览器所需要的信息并传送给你的浏览器。而且，大部分代理服务器都具有缓冲的功能，
就好象一个大的Cache，它有很大的存储空间，它不断将新取得数据储存到它本机的存储器上，如果浏览器所请求的数据在它本机的存储器上已经存在而且是最新的，
那么它就不重新从Web服务器取数据，而直接将存储器上的数据传送给用户的浏览器，这样就能显著提高浏览速度和效率。更重要的是：Proxy



function TunnelingAgent(options) {
  var self = this
  self.options = options || {}  //默认值
  self.proxyOptions = self.options.proxy || {}
  self.maxSockets = self.options.maxSockets || http.Agent.defaultMaxSockets
  self.requests = []
  self.sockets = []

  self.on('free', function onFree(socket, host, port) {
    for (var i = 0, len = self.requests.length; i < len; ++i) {
      var pending = self.requests[i]
      if (pending.host === host && pending.port === port) {
        // Detect the request to connect same origin server,
        // reuse the connection.
        self.requests.splice(i, 1)
        pending.request.onSocket(socket)
        return
      }
    }
    socket.destroy()
    self.removeSocket(socket)
  })
}
util.inherits(TunnelingAgent, events.EventEmitter)


//在原型上创建函数添加请求 函数功能：在一般情况下，我们使用网络浏览器直接去连接其他Internet
                         站点取得网络信息时，须送出Request信号来得到回答，然后对方再把信息以bit方式传送回来。
TunnelingAgent.prototype.addRequest = function addRequest(req, options) {
  var self = this

   // Legacy API: addRequest(req, host, port, path)
  if (typeof options === 'string') {
    options = {
      host: options,
      port: arguments[2],
      path: arguments[3]
    };
  }

  if (self.sockets.length >= this.maxSockets) {
    // We are over limit so we'll add it to the queue.
    self.requests.push({host: options.host, port: options.port, request: req})
    return
  }

  // If we are under maxSockets create a new one.
  self.createConnection({host: options.host, port: options.port, request: req})
}



//创建链接  新建到http服务器的链接
TunnelingAgent.prototype.createConnection = function createConnection(pending) {
  var self = this

  self.createSocket(pending, function(socket) {
    socket.on('free', onFree)
    socket.on('close', onCloseOrRemove)
    socket.on('agentRemove', onCloseOrRemove)
    pending.request.onSocket(socket)

    function onFree() {
      self.emit('free', socket, pending.host, pending.port)
    }

    function onCloseOrRemove(err) {
      self.removeSocket(socket)
      socket.removeListener('free', onFree)
      socket.removeListener('close', onCloseOrRemove)
      socket.removeListener('agentRemove', onCloseOrRemove)
    }
  })
}


//创建套接字，套接字，是支持TCP/IP的网络通信的基本操作单元，
    可以看做是不同主机之间的进程进行双向通信的端点，简单的说就是通信的两方的一种约定，用套接字中的相关函数来完成通信过程。
TunnelingAgent.prototype.createSocket = function createSocket(options, cb) {
  var self = this
  var placeholder = {}
  self.sockets.push(placeholder)

  var connectOptions = mergeOptions({}, self.proxyOptions,
    { method: 'CONNECT'
    , path: options.host + ':' + options.port
    , agent: false
    }
  )
  if (connectOptions.proxyAuth) {
    connectOptions.headers = connectOptions.headers || {}
    connectOptions.headers['Proxy-Authorization'] = 'Basic ' +
        Buffer.from(connectOptions.proxyAuth).toString('base64')
  }

  debug('making CONNECT request')
  var connectReq = self.request(connectOptions)
  connectReq.useChunkedEncodingByDefault = false // for v0.6
  connectReq.once('response', onResponse) // for v0.6
  connectReq.once('upgrade', onUpgrade)   // for v0.6
  connectReq.once('connect', onConnect)   // for v0.7 or later
  connectReq.once('error', onError)
  connectReq.end()

  function onResponse(res) {                              //回应
    // Very hacky. This is necessary to avoid http-parser leaks.
    res.upgrade = true
  }

  function onUpgrade(res, socket, head) {                    //上级
    // Hacky.
    process.nextTick(function() {
      onConnect(res, socket, head)
    })
  }

  function onConnect(res, socket, head) {                           //连接
    connectReq.removeAllListeners()
    socket.removeAllListeners()

    if (res.statusCode === 200) {
      assert.equal(head.length, 0)
      debug('tunneling connection has established')
      self.sockets[self.sockets.indexOf(placeholder)] = socket
      cb(socket)
    } else {
      debug('tunneling socket could not be established, statusCode=%d', res.statusCode)
      var error = new Error('tunneling socket could not be established, ' + 'statusCode=' + res.statusCode)
      error.code = 'ECONNRESET'
      options.request.emit('error', error)
      self.removeSocket(placeholder)
    }
  }

  function onError(cause) {
    connectReq.removeAllListeners()

    debug('tunneling socket could not be established, cause=%s\n', cause.message, cause.stack)
    var error = new Error('tunneling socket could not be established, ' + 'cause=' + cause.message)
    error.code = 'ECONNRESET'
    options.request.emit('error', error)
    self.removeSocket(placeholder)
  }
}


//移除套接字
TunnelingAgent.prototype.removeSocket = function removeSocket(socket) {
  var pos = this.sockets.indexOf(socket)
  if (pos === -1) return

  this.sockets.splice(pos, 1)

  var pending = this.requests.shift()
  if (pending) {
    // If we have pending requests and a socket gets closed a new one
    // needs to be created to take over in the pool for the one that closed.
    this.createConnection(pending)
  }
}


//创建安全套接字，套接字相当于打电话 建立连接 双方一致才能正常通信，保证私密性的安全协议
function createSecureSocket(options, cb) {
  var self = this
  TunnelingAgent.prototype.createSocket.call(self, options, function(socket) {
    // 0 is dummy port for v0.6
    var secureSocket = tls.connect(0, mergeOptions({}, self.options,
      { servername: options.host
      , socket: socket
      }
    ))
    self.sockets[self.sockets.indexOf(socket)] = secureSocket
    cb(secureSocket)
  })
}

//合并选项
function mergeOptions(target) {
  for (var i = 1, len = arguments.length; i < len; ++i) {
    var overrides = arguments[i]
    if (typeof overrides === 'object') {
      var keys = Object.keys(overrides)
      for (var j = 0, keyLen = keys.length; j < keyLen; ++j) {
        var k = keys[j]
        if (overrides[k] !== undefined) {
          target[k] = overrides[k]
        }
      }
    }
  }
  return target
}

//错误处理

var debug
if (process.env.NODE_DEBUG && /\btunnel\b/.test(process.env.NODE_DEBUG)) {
  debug = function() {
    var args = Array.prototype.slice.call(arguments)
    if (typeof args[0] === 'string') {
      args[0] = 'TUNNEL: ' + args[0]
    } else {
      args.unshift('TUNNEL:')
    }
    console.error.apply(console, args)
  }
} else {
  debug = function() {}
}
exports.debug = debug // for test
