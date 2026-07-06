function getLocale(explicitLocale) {
  return explicitLocale || config?.locale || config?.language || 'en-US'
}

function getFirstDayOfWeek(locale) {
  try {
    return new Intl.Locale(locale).weekInfo?.firstDay % 7 || 0
  }
  catch {
    return 0
  }
}

function getCalendarRange(baseDate, locale) {
  const firstDayOfWeek = getFirstDayOfWeek(locale)
  const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
  const monthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59, 999)
  const daysFromWeekStart = (monthStart.getDay() - firstDayOfWeek + 7) % 7
  const daysToWeekEnd = (firstDayOfWeek + 6 - monthEnd.getDay() + 7) % 7
  return {
    viewStart: new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate() - daysFromWeekStart, 0, 0, 0, 0),
    viewEnd: new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate() + daysToWeekEnd, 23, 59, 59, 999),
  }
}

function getOrdinal(day) {
  if (day < 11 || day > 13) {
    return day + ({ 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] || 'th')
  }
  return day + 'th'
}

function formatPattern(date, pattern, locale) {
  switch (pattern) {
    case 'MMMM':
      return new Intl.DateTimeFormat(locale, { month: 'long' }).format(date)
    case 'MMM':
      return new Intl.DateTimeFormat(locale, { month: 'short' }).format(date)
    case 'dddd':
      return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date)
    case 'ddd':
      return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date)
    case 'dd':
      return new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(date)
    case 'Do':
      return getOrdinal(date.getDate())
    case 'DD':
      return String(date.getDate()).padStart(2, '0')
    case 'D':
    default:
      return String(date.getDate())
  }
}

function toTimestampMs(value) {
  if (value instanceof Date) {
    return value.getTime()
  }
  if (typeof value === 'number') {
    return value < 1000000000000 ? value * 1000 : value
  }
  if (typeof value === 'string') {
    if (/^\d+$/.test(value)) {
      const numeric = Number(value)
      return numeric < 1000000000000 ? numeric * 1000 : numeric
    }
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : NaN
  }
  return NaN
}

Module.register('MMM-CalendarExtMiniMonth', {
  defaults: {
    locale: null, // if null, locale of system default will be used.
    dynamicEventColor: ['#333', '#F3F'], // if null, only circle border will be shown when event exists.
    // You can use color name or rgb() CSS function.
    maxItems: 100,
    refreshInterval: 60 * 10 * 1000, // millisec.
    // titleFormat: "",
    titleFormat: 'MMMM',
    weekdayFormat: 'dd', // "dd", "ddd", "dddd", if null, it will show the first initial of day name.
    dateFormat: 'D', // D, Do, DD.
    calendars: [], // names of calendar in your default calendar/MMM-CalendarExt2
    source: 'CALENDAR', // or "CALEXT2"
  },

  start: function () {
    this.refreshTimer = null
    this.events = []
    this.calendarNames = Array.isArray(this.config.calendars) ? this.config.calendars.slice() : []
    this.slots = []
    this.maxEventCounts = 0
  },

  getStyles: function () {
    return ['MMM-CalendarExtMiniMonth.css']
  },

  getDom: function () {
    const dom = document.createElement('div')
    dom.id = 'CXMM'
    if (this.slots.length == 0) return dom
    const header = document.createElement('div')
    header.className = 'header'
    const locale = getLocale(this.config.locale)
    header.innerHTML = (this.config.titleFormat) ? formatPattern(new Date(), this.config.titleFormat, locale) : null
    dom.appendChild(header)
    dom.appendChild(this.drawSlot())
    return dom
  },

  refreshScreen: function () {
    clearTimeout(this.refreshTimer)
    this.refreshTimer = null
    this.updateDom()
    this.refreshTimer = setTimeout(() => {
      this.refreshScreen()
    }, this.config.refreshInterval)
  },

  notificationReceived: function (notification, payload) {
    if (notification === 'DOM_OBJECTS_CREATED') {
      if (this.config.dynamicEventColor) {
        const colors = document.createElement('div')
        colors.id = 'CXMM_COLOR_TRICK'
        colors.style.backgroundColor = this.config.dynamicEventColor[0]
        colors.style.borderColor = this.config.dynamicEventColor[1]
        colors.style.display = 'none'
        document.body.appendChild(colors)
      }
      if (this.config.source === 'CALEXT2') {
        this.updateRequest2()
      }
      this.refreshScreen()
    }
    if (notification === 'CALENDAR_EVENTS' && this.config.source === 'CALENDAR') {
      this.updateContentFromCalendarEvents(payload)
    }
    if (notification === 'CALEXT2_CALENDAR_MODIFIED' && this.config.source === 'CALEXT2') {
      setTimeout(() => {
        this.updateRequest2()
      }, 1000)
    }
  },

  updateContentFromCalext2: function (payload = null) {
    if (payload != null) {
      if (payload.message === 'SCHEDULE_FOUND') {
        this.events = payload.events
        this.events.sort(function (a, b) {
          if (a.startDate === b.startDate) {
            return a.endDate - b.endDate
          }
          else {
            return a.startDate - b.startDate
          }
        })
      }
      this.slots = this.makeSlot([].concat(this.events))
      this.refreshScreen()
    }
  },

  updateContentFromCalendarEvents: function (events) {
    if (!Array.isArray(events)) {
      return
    }

    const configuredNames = Array.isArray(this.config.calendars) ? this.config.calendars : []
    const discoveredNames = []
    this.events = events
      .map(function (event) {
        const calendarName = event.calendarName || event.name || 'calendar'
        const startDate = toTimestampMs(event.startDate)
        const endDate = toTimestampMs(event.endDate)
        if (discoveredNames.indexOf(calendarName) < 0) {
          discoveredNames.push(calendarName)
        }
        return {
          name: calendarName,
          title: event.title,
          startDate: startDate,
          endDate: endDate,
          fullDayEvent: !!event.fullDayEvent,
          styleName: event.styleName || '',
          color: event.color || '',
          bgColor: event.bgColor || '',
        }
      })
      .filter(function (event) {
        if (!(event.name && event.title && Number.isFinite(event.startDate) && Number.isFinite(event.endDate))) {
          return false
        }
        if (configuredNames.length > 0 && configuredNames.indexOf(event.name) < 0) {
          return false
        }
        return true
      })

    this.calendarNames = configuredNames.length > 0 ? configuredNames.slice() : (discoveredNames.length > 0 ? discoveredNames : ['calendar'])

    this.events.sort(function (a, b) {
      if (a.startDate === b.startDate) {
        return a.endDate - b.endDate
      }
      return a.startDate - b.startDate
    })

    this.slots = this.makeSlot([].concat(this.events))
    this.refreshScreen()
  },

  drawSlot: function () {
    const trick = document.getElementById('CXMM_COLOR_TRICK')
    const trickColor = {}
    if (trick) {
      const cx = window.getComputedStyle(trick)
      trickColor.from = cx.getPropertyValue('background-color').match(/\d+/g).map(Number)
      trickColor.to = cx.getPropertyValue('border-color').match(/\d+/g).map(Number)
    }

    const dom = document.createElement('div')
    dom.className = 'slots'
    if (this.slots.length == 0) return dom

    const locale = getLocale(this.config.locale)
    const now = new Date()
    const range = getCalendarRange(now, locale)

    let week = document.createElement('div')
    for (let i = 0; i < 7; i++) {
      const cell = document.createElement('div')
      cell.classList.add('cell')
      cell.classList.add('weekday_title')
      const d = new Date(range.viewStart.getFullYear(), range.viewStart.getMonth(), range.viewStart.getDate() + i)
      cell.classList.add('weekdays_' + (d.getDay() === 0 ? 7 : d.getDay()))
      cell.innerHTML = formatPattern(d, this.config.weekdayFormat, locale)
      week.appendChild(cell)
    }
    dom.appendChild(week)

    for (let i = 0; i < this.slots.length; i++) {
      if (0 == (i % 7)) {
        week = document.createElement('div')
      }
      const slot = this.slots[i]
      const date = new Date(Number(slot.key) * 1000)
      const isThisMonth = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
      const isToday = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
      const cell = document.createElement('div')
      cell.innerHTML = formatPattern(date, this.config.dateFormat, locale)
      cell.classList.add('cell')
      cell.classList.add('weekdays_' + (date.getDay() === 0 ? 7 : date.getDay()))
      if (isToday) cell.classList.add('today')
      if (isThisMonth) cell.classList.add('thismonth')
      if (slot.events.length > 0) {
        cell.classList.add('event_exist')
        cell.classList.add('event_count_' + slot.events.length)
      }

      if (trick && !(isToday) && slot.events.length > 0) {
        const maxCount = this.maxEventCounts || 1
        const rgb = []
        for (let j = 0; j < 3; j++) {
          const s = trickColor.from[j]
          const e = trickColor.to[j]
          rgb.push(Math.round(s + ((e - s) * (slot.events.length / maxCount))))
        }
        cell.style.backgroundColor = 'rgb(' + rgb.join() + ')'
      }
      week.appendChild(cell)
      if (6 == (i % 7)) {
        dom.appendChild(week)
      }
    }
    return dom
  },

  makeSlot: function (events) {
    const slots = []
    const locale = getLocale(this.config.locale)
    const now = new Date()
    const range = getCalendarRange(now, locale)
    let index = new Date(range.viewStart)
    while (index.getTime() < range.viewEnd.getTime()) {
      const key = String(Math.floor(index.getTime() / 1000))
      const slot = {
        key: key,
        events: [],
      }
      const dayStart = new Date(index.getFullYear(), index.getMonth(), index.getDate(), 0, 0, 0, 0)
      const dayEnd = new Date(index.getFullYear(), index.getMonth(), index.getDate(), 23, 59, 59, 999)
      for (let i = 0; i < events.length; i++) {
        const ev = events[i]
        const evS = new Date(Number(ev.startDate))
        const evE = new Date(Number(ev.endDate))
        if (evE.getTime() <= dayStart.getTime() || evS.getTime() > dayEnd.getTime()) {
          // not matched
        }
        else {
          slot.events.push(ev)
        }
      }
      slots.push(slot)
      index = new Date(index.getFullYear(), index.getMonth(), index.getDate() + 1)
    }
    this.maxEventCounts = Math.max.apply(
      Math, slots.map(function (o) { return o.events.length }),
    )
    return slots
  },

  updateRequest2: function () {
    const now = new Date()
    const locale = getLocale(this.config.locale)
    const range = getCalendarRange(now, locale)
    const from = Math.floor(range.viewStart.getTime() / 1000)
    const to = Math.floor(range.viewEnd.getTime() / 1000)
    const payload = {
      filter: (e) => {
        if (this.calendarNames.length > 0) {
          if (this.calendarNames.indexOf(e.calendarName) < 0) {
            return false
          }
        }
        if (e.startDate > to || e.endDate < from) {
          return false
        }
        return true
      },
      callback: (events) => {
        if (events.length > 0) {
          for (let i = 0; i < events.length; i++) {
            events[i].name = events[i].calendarName
            events[i].startDate = events[i].startDate * 1000
            events[i].endDate = events[i].endDate * 1000
            events[i].styleName = events[i].className
          }
          const payload = {
            message: 'SCHEDULE_FOUND',
            events: events,
          }
          this.updateContentFromCalext2(payload)
        }
      },
    }
    this.sendNotification('CALEXT2_EVENT_QUERY', payload)
  },
})
