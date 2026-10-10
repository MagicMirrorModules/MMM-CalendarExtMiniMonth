'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

function createFakeElement() {
  return {
    _id: '',
    className: '',
    style: {},
    innerHTML: '',
    children: [],
    classList: {
      add() {},
      contains() {
        return false
      },
    },
    appendChild(child) {
      this.children.push(child)
      return child
    },
    get id() {
      return this._id
    },
    set id(value) {
      this._id = value
      elementsById.set(value, this)
    },
  }
}

const elementsById = new Map()

function serialize(el) {
  let out = el.innerHTML || ''
  for (const child of el.children) {
    out += serialize(child)
  }
  return out
}

function loadModule() {
  let captured = null
  global.Module = {
    register(name, definition) {
      captured = definition
    },
  }
  global.config = {}
  global.document = {
    createElement: createFakeElement,
    getElementById(id) {
      return elementsById.get(id) || null
    },
    body: createFakeElement(),
  }

  delete require.cache[path.join(__dirname, '..', 'MMM-CalendarExtMiniMonth.js')]
  require('../MMM-CalendarExtMiniMonth.js')

  const instance = Object.assign(Object.create(captured), captured)
  instance.config = Object.assign({}, captured.defaults, { dynamicEventColor: null })
  instance.start()
  instance.updateDom = function () {}
  instance.refreshScreen = function () {
    this.updateDom()
  }
  return instance
}

function makeEvent(title) {
  return {
    calendarName: 'Test Calendar',
    title: title,
    startDate: Date.now(),
    endDate: Date.now() + 60 * 60 * 1000,
  }
}

test('normal event title is stored and rendered without error', () => {
  const instance = loadModule()
  instance.updateContentFromCalendarEvents([makeEvent('Team Meeting')])

  assert.equal(instance.events.length, 1)
  assert.equal(instance.events[0].title, 'Team Meeting')

  const dom = instance.getDom()
  assert.ok(dom.children.length > 0, 'expected rendered DOM to contain header/slot nodes')
})

test('<script> event title is stored verbatim but never reaches the rendered DOM', () => {
  const instance = loadModule()
  const payload = '<script>alert(1)</script>'
  instance.updateContentFromCalendarEvents([makeEvent(payload)])

  assert.equal(instance.events[0].title, payload, 'title must be stored raw, not escaped/mangled')

  const dom = instance.getDom()
  const rendered = serialize(dom)
  assert.ok(!rendered.includes('<script'), 'event title must never be inserted into the DOM')
})

test('onerror img event title is stored verbatim but never reaches the rendered DOM', () => {
  const instance = loadModule()
  const payload = '<img src=x onerror=alert(1)>'
  instance.updateContentFromCalendarEvents([makeEvent(payload)])

  assert.equal(instance.events[0].title, payload)

  const dom = instance.getDom()
  const rendered = serialize(dom)
  assert.ok(!rendered.includes('onerror'), 'event title must never be inserted into the DOM')
})

test('ampersand in title is preserved exactly, not HTML-entity-encoded', () => {
  const instance = loadModule()
  instance.updateContentFromCalendarEvents([makeEvent('Research & Development')])

  assert.equal(instance.events[0].title, 'Research & Development')
})

test('quotes and apostrophes in title are preserved exactly', () => {
  const instance = loadModule()
  instance.updateContentFromCalendarEvents([makeEvent('Tom\'s "Meeting"')])

  assert.equal(instance.events[0].title, 'Tom\'s "Meeting"')
})

test('missing or empty title drops the event without throwing', () => {
  const instance = loadModule()
  assert.doesNotThrow(() => {
    instance.updateContentFromCalendarEvents([makeEvent(''), makeEvent(undefined)])
  })
  assert.equal(instance.events.length, 0)

  assert.doesNotThrow(() => {
    instance.getDom()
  })
})
