'use strict'

const { test, only } = require('tap')
const { Client, errors } = require('..')
const { createServer } = require('http')
const { Readable } = require('stream')

test('request invalid content-length', (t) => {
  t.plan(8)

  const server = createServer((req, res) => {
    res.end()
  })
  t.teardown(server.close.bind(server))
  server.listen(0, () => {
    const client = new Client(`http://localhost:${server.address().port}`)
    t.teardown(client.destroy.bind(client))

    client.request({
      path: '/',
      method: 'PUT',
      headers: {
        'content-length': 10
      },
      body: 'asd'
    }, (err, data) => {
      t.ok(err instanceof errors.RequestContentLengthMismatchError)
    })

    client.request({
      path: '/',
      method: 'PUT',
      headers: {
        'content-length': 10
      },
      body: 'asdasdasdasdasdasda'
    }, (err, data) => {
      t.ok(err instanceof errors.RequestContentLengthMismatchError)
    })

    client.request({
      path: '/',
      method: 'PUT',
      headers: {
        'content-length': 10
      },
      body: Buffer.alloc(9)
    }, (err, data) => {
      t.ok(err instanceof errors.RequestContentLengthMismatchError)
    })

    client.request({
      path: '/',
      method: 'PUT',
      headers: {
        'content-length': 10
      },
      body: Buffer.alloc(11)
    }, (err, data) => {
      t.ok(err instanceof errors.RequestContentLengthMismatchError)
    })

    client.request({
      path: '/',
      method: 'HEAD',
      headers: {
        'content-length': 10
      }
    }, (err, data) => {
      t.ok(err instanceof errors.RequestContentLengthMismatchError)
    })

    client.request({
      path: '/',
      method: 'GET',
      headers: {
        'content-length': 0
      }
    }, (err, data) => {
      t.ok(err instanceof errors.RequestContentLengthMismatchError)
    })

    client.request({
      path: '/',
      method: 'GET',
      headers: {
        'content-length': 4
      },
      body: new Readable({
        read () {
          this.push('asd')
          this.push(null)
        }
      })
    }, (err, data) => {
      t.ok(err instanceof errors.RequestContentLengthMismatchError)
    })

    client.request({
      path: '/',
      method: 'GET',
      headers: {
        'content-length': 4
      },
      body: new Readable({
        read () {
          this.push('asasdasdasdd')
          this.push(null)
        }
      })
    }, (err, data) => {
      t.ok(err instanceof errors.RequestContentLengthMismatchError)
    })
  })
})

test('request streaming invalid content-length', (t) => {
  t.plan(4)

  const server = createServer((req, res) => {
    res.end()
  })
  t.teardown(server.close.bind(server))
  server.listen(0, () => {
    const client = new Client(`http://localhost:${server.address().port}`)
    t.teardown(client.destroy.bind(client))

    client.once('disconnect', () => {
      t.pass()
      client.once('disconnect', () => {
        t.pass()
      })
    })

    client.request({
      path: '/',
      method: 'PUT',
      headers: {
        'content-length': 10
      },
      body: new Readable({
        read () {
          setImmediate(() => {
            this.push('asdasdasdkajsdnasdkjasnd')
            this.push(null)
          })
        }
      })
    }, (err, data) => {
      t.ok(err instanceof errors.RequestContentLengthMismatchError)
    })

    client.request({
      path: '/',
      method: 'PUT',
      headers: {
        'content-length': 10
      },
      body: new Readable({
        read () {
          setImmediate(() => {
            this.push('asd')
            this.push(null)
          })
        }
      })
    }, (err, data) => {
      t.ok(err instanceof errors.RequestContentLengthMismatchError)
    })
  })
})

test('request streaming data when content-length=0', (t) => {
  t.plan(1)

  const server = createServer((req, res) => {
    res.end()
  })
  t.teardown(server.close.bind(server))
  server.listen(0, () => {
    const client = new Client(`http://localhost:${server.address().port}`)
    t.teardown(client.destroy.bind(client))

    client.request({
      path: '/',
      method: 'PUT',
      headers: {
        'content-length': 0
      },
      body: new Readable({
        read () {
          setImmediate(() => {
            this.push('asdasdasdkajsdnasdkjasnd')
            this.push(null)
          })
        }
      })
    }, (err, data) => {
      t.ok(err instanceof errors.RequestContentLengthMismatchError)
    })
  })
})

test('request streaming no body data when content-length=0', (t) => {
  t.plan(2)

  const server = createServer((req, res) => {
    req.pipe(res)
  })
  t.teardown(server.close.bind(server))
  server.listen(0, () => {
    const client = new Client(`http://localhost:${server.address().port}`)
    t.teardown(client.destroy.bind(client))

    client.request({
      path: '/',
      method: 'PUT',
      headers: {
        'content-length': 0
      }
    }, (err, data) => {
      t.error(err)
      data.body
        .on('data', () => {
          t.fail()
        })
        .on('end', () => {
          t.pass()
        })
    })
  })
})

only('response content length in header is greater than actual body received', (t) => {
  t.plan(3)

  const server = createServer((req, res) => {
    res.writeHead(200, {
      'content-length': 10
    })
    res.end('123')
  })
  t.teardown(server.close.bind(server))
  server.listen(0, () => {
    const client = new Client(`http://localhost:${server.address().port}`, {
      pipelining: 0
    })
    t.teardown(client.destroy.bind(client))

    client.on('disconnect', (origin, client, err) => {
      t.equal(err.code, 'UND_ERR_RESPONSE_CONTENT_LENGTH_MISMATCH')
    })

    client.request({
      path: '/',
      method: 'GET'
    }, (err, data) => {
      t.error(err)
      data.body
        .on('end', () => {
          t.fail()
        })
        .on('error', (err) => {
          t.equal(err.code, 'UND_ERR_RESPONSE_CONTENT_LENGTH_MISMATCH')
        })
        .resume()
    })
  })
})

/*
test('response content length in header is less than actual body received', (t) => {
  t.plan(3)

  const server = createServer((req, res) => {
    res.writeHead(200, {
      'content-length': 5
    })
    res.end('0123456789')
  })
  t.teardown(server.close.bind(server))
  server.listen(0, () => {
    const client = new Client(`http://localhost:${server.address().port}`, {
      pipelining: 0
    })
    t.teardown(client.destroy.bind(client))

    client.on('disconnect', (origin, client, err) => {
      t.equal(err.code, 'UND_ERR_RESPONSE_CONTENT_LENGTH_MISMATCH')
    })

    client.request({
      path: '/',
      method: 'GET'
    }, (err, data) => {
      t.error(err)
      data.body
        .on('end', () => {
          t.fail()
        })
        .on('error', (err) => {
          t.equal(err.code, 'UND_ERR_RESPONSE_CONTENT_LENGTH_MISMATCH')
        })
        .resume()
    })
  })
})
*/

// @todo mismatch content length by timeout, still get timeout error
