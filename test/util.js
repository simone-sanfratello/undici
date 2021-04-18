'use strict'

const t = require('tap')
const { test } = t
const { Stream } = require('stream')
const { EventEmitter } = require('events')

const util = require('../lib/core/util')

test('isStream', (t) => {
  t.plan(3)

  const stream = new Stream()
  t.ok(util.isStream(stream))

  const buffer = Buffer.alloc(0)
  t.notOk(util.isStream(buffer))

  const ee = new EventEmitter()
  t.notOk(util.isStream(ee))
})

test('mismatchContentLength', (t) => {
  const cases = [
    { name: 'no body size no content-length', input: [0, 0], output: false },
    { name: 'body size but no content-length', input: [0, 0], output: false },
    { name: 'content-length but no body size', input: [0, 0], output: false },
    { name: 'body size equal to content-length (no zero)', input: [100, 100], output: false },
    { name: 'body size not equal to content-length', input: [100, 99], output: true }
  ]

  t.plan(cases.length)

  for (const case_ of cases) {
    t.test(case_.name, (t) => {
      t.plan(1)
      t.equal(util.mismatchContentLength(...case_.input), case_.output)
    })
  }
})

test('extractMeaningfulHeaders', (t) => {
  const cases = [
    {
      input: [
        Buffer.from('Date'),
        Buffer.from('Thu, 01 Jan 1970 00:00:01 GMT'),
        Buffer.from('Connection'),
        Buffer.from('keep-alive'),
        Buffer.from('Keep-Alive'),
        Buffer.from('timeout=5'),
        Buffer.from('Content-Length'),
        Buffer.from('2')
      ],
      output: {
        keepAlive: Buffer.from('timeout=5'),
        trailers: null,
        contentLength: 2
      }
    },
    {
      input: [
        Buffer.from('Trailer'),
        Buffer.from('content-length')
      ],
      output: {
        keepAlive: null,
        trailers: Buffer.from('content-length'),
        contentLength: 0
      }
    },
    {
      input: [
        Buffer.from('Trailer'),
        Buffer.from('content-length'),
        Buffer.from('Date'),
        Buffer.from('Sun, 18 Apr 2021 06:35:54 GMT'),
        Buffer.from('Connection'),
        Buffer.from('keep-alive'),
        Buffer.from('Keep-Alive'),
        Buffer.from('timeout=5'),
        Buffer.from('Transfer-Encoding'),
        Buffer.from('chunked')
      ],
      output: {
        keepAlive: Buffer.from('timeout=5'),
        trailers: Buffer.from('content-length'),
        contentLength: 0
      }
    }
  ]

  t.plan(cases.length)

  for (let i = 0; i < cases.length; i++) {
    const case_ = cases[i]
    t.test(`case #${i}`, (t) => {
      t.plan(1)
      t.same(util.extractMeaningfulHeaders(case_.input), case_.output)
    })
  }
})
