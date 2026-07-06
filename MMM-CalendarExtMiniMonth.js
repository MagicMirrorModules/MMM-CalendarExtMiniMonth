/* Magic Mirror
* Module: MMM-CalendarExtMinimonth
*
* By eouia
*/

function getLocale(explicitLocale) {
  return explicitLocale || config?.locale || config?.language || "en-US"
}

function getFirstDayOfWeek(locale) {
  try {
    return new Intl.Locale(locale).weekInfo?.firstDay % 7 || 0
  } catch {
    return 0
  }
}

function getCalendarRange(baseDate, locale) {
  var firstDayOfWeek = getFirstDayOfWeek(locale)
  var monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
  var monthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59, 999)
  var daysFromWeekStart = (monthStart.getDay() - firstDayOfWeek + 7) % 7
  var daysToWeekEnd = (firstDayOfWeek + 6 - monthEnd.getDay() + 7) % 7
  return {
    viewStart: new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate() - daysFromWeekStart, 0, 0, 0, 0),
    viewEnd: new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate() + daysToWeekEnd, 23, 59, 59, 999),
  }
}

function getOrdinal(day) {
  if (day < 11 || day > 13) {
    return day + ({ 1: "st", 2: "nd", 3: "rd" }[day % 10] || "th")
  }
  return day + "th"
}

function formatPattern(date, pattern, locale) {
  switch (pattern) {
    case "MMMM":
      return new Intl.DateTimeFormat(locale, { month: "long" }).format(date)
    case "MMM":
      return new Intl.DateTimeFormat(locale, { month: "short" }).format(date)
    case "dddd":
      return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date)
    case "ddd":
      return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date)
    case "dd":
      return new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(date)
    case "Do":
      return getOrdinal(date.getDate())
    case "DD":
      return String(date.getDate()).padStart(2, "0")
    case "D":
    default:
      return String(date.getDate())
  }
}

Module.register("MMM-CalendarExtMinimonth",{
  defaults: {
    locale: null, // if null, locale of system default will be used.
    dynamicEventColor: ["#333", "#F3F"], //if null, only circle border will be shown when event exists.
    // You can use color name or rgb() CSS function.
    maxItems: 100,
    refreshInterval: 60*10*1000, // millisec.
    //titleFormat: "",
    titleFormat: "MMMM",
    weekdayFormat: "dd", //"dd", "ddd", "dddd", if null, it will show the first initial of day name.
    dateFormat: "D", //D, Do, DD.
    calendars: [], // names of calendar in your MMM-CalendarExt/MMM-CalendarExt2
    source: "CALEXT2", // or "CALEXT"
  },

  start: function() {
    this.refreshTimer = null
    this.events = []
    this.names = this.config.calendars
    this.slots = []
    this.maxEventCounts = 0
  },

  getStyles: function() {
    return ["MMM-CalendarExtMinimonth.css"]
  },

  getDom: function() {
    var dom = document.createElement("div")
    dom.id = "CXMM"
    if (this.slots.length == 0) return dom
    var header = document.createElement("div")
    header.className = "header"
    var locale = getLocale(this.config.locale)
    header.innerHTML = (this.config.titleFormat) ? formatPattern(new Date(), this.config.titleFormat, locale) : null
    dom.appendChild(header)
    dom.appendChild(this.drawSlot())
    return dom
  },

  refreshScreen: function() {
    clearTimeout(this.refreshTimer)
    this.refreshTimer = null
    this.updateDom()
    this.refreshTimer = setTimeout(()=>{
      this.refreshScreen()
    }, this.config.refreshInterval)
  },

  notificationReceived: function(notification, payload, sender) {
    if (notification == "DOM_OBJECTS_CREATED") {
      if (this.config.dynamicEventColor) {
        var colors = document.createElement("div")
        colors.id = "CXMM_COLOR_TRICK"
        colors.style.backgroundColor = this.config.dynamicEventColor[0]
        colors.style.borderColor = this.config.dynamicEventColor[1]
        colors.style.display = "none"
        document.body.appendChild(colors)
      }
      this.refreshScreen()
    }
    if (notification == "CALEXT_SAYS_CALENDAR_MODIFIED") {
      setTimeout(() => {
        this.updateRequest()
      }, 1000)
    }
    if (notification == "CALEXT_SAYS_SCHEDULE") {
      this.updateContent(payload)
    }
    if (notification == "CALEXT2_CALENDAR_MODIFIED") {
      setTimeout(() => {
        this.updateRequest2()
      }, 1000)
    }
  },

  updateContent: function(payload=null) {
    if (payload != null) {
      if(payload.message == "SCHEDULE_FOUND") {
        this.events = payload.events
        this.events.sort(function(a, b) {
          if (a.startTime == b.startTime) {
            return a.endTime - b.endTime
          } else {
            return a.startTime - b.startTime
          }
        })
      }
      this.slots = this.makeSlot([].concat(this.events))
      this.refreshScreen()
    }
  },


  drawSlot: function() {
    console.log("draw")
    var trick = document.getElementById("CXMM_COLOR_TRICK")
    var trickColor = {}
    if (trick) {
      var cx = window.getComputedStyle(trick)
      trickColor.from = cx.getPropertyValue("background-color").match(/\d+/g).map(Number)
      trickColor.to = cx.getPropertyValue("border-color").match(/\d+/g).map(Number)
    }

    var dom = document.createElement("div")
    dom.className = "slots"
    console.log(this.slots)
    if (this.slots.length == 0) return dom

    var locale = getLocale(this.config.locale)
    var now = new Date()
    var range = getCalendarRange(now, locale)

    var week = null
    week = document.createElement("div")
    for (var i = 0; i < 7; i++) {
      var cell = document.createElement("div")
      cell.classList.add("cell")
      cell.classList.add("weekday_title")
      var d = new Date(range.viewStart.getFullYear(), range.viewStart.getMonth(), range.viewStart.getDate() + i)
      cell.classList.add("weekdays_" + (d.getDay() === 0 ? 7 : d.getDay()))
      cell.innerHTML = formatPattern(d, this.config.weekdayFormat, locale)
      week.appendChild(cell)
    }
    dom.appendChild(week)

    for (var i = 0; i < this.slots.length; i++) {
      if (0 == (i % 7)) {
        week = document.createElement("div")
      }
      var slot = this.slots[i]
      var date = new Date(Number(slot.key) * 1000)
      var isThisMonth = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
      var isToday = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
      var cell = document.createElement("div")
      cell.innerHTML = formatPattern(date, this.config.dateFormat, locale)
      cell.classList.add("cell")
      cell.classList.add("weekdays_" + (date.getDay() === 0 ? 7 : date.getDay()))
      if (isToday) cell.classList.add("today")
      if (isThisMonth) cell.classList.add("thismonth")
      if (slot.events.length > 0) {
        cell.classList.add("event_exist")
        cell.classList.add("event_count_" + slot.events.length)
      }


      if (trick && !(isToday) && slot.events.length > 0) {
        var rgb = []
        for (var j = 0; j < 3; j++) {
          var s = trickColor.from[j]
          var e = trickColor.to[j]
          rgb.push(Math.round(s + ((e - s) * (slot.events.length / this.maxEventCounts))))
        }
        cell.style.backgroundColor = "rgb(" + rgb.join() + ")"
      }
      week.appendChild(cell)
      if (6 == (i % 7)) {
        dom.appendChild(week)
      }
    }
    return dom
  },

  makeSlot: function(events) {
    var slots = []
    var locale = getLocale(this.config.locale)
    var now = new Date()
    var range = getCalendarRange(now, locale)
    var index = new Date(range.viewStart)
    while (index.getTime() < range.viewEnd.getTime()) {
      var key = String(Math.floor(index.getTime() / 1000))
      var slot = {
        "key": key,
        "events": []
      }
      var dayStart = new Date(index.getFullYear(), index.getMonth(), index.getDate(), 0, 0, 0, 0)
      var dayEnd = new Date(index.getFullYear(), index.getMonth(), index.getDate(), 23, 59, 59, 999)
      for(var i = 0; i < events.length; i++) {
        var ev = events[i]
        var evS = new Date(Number(ev.startDate))
        var evE = new Date(Number(ev.endDate))
        if (evE.getTime() <= dayStart.getTime() || evS.getTime() > dayEnd.getTime()) {
          // not matched
        } else {
          slot.events.push(ev)
        }
      }
      slots.push(slot)
      index = new Date(index.getFullYear(), index.getMonth(), index.getDate() + 1)
    }
    this.maxEventCounts = Math.max.apply(
      Math, slots.map(function(o){return o.events.length})
    )
    return slots
  },

  updateRequest: function() {
    var now = new Date()
    var locale = getLocale(this.config.locale)
    var range = getCalendarRange(now, locale)
    var filter = {
      names: this.names,
      from: String(range.viewStart.getTime()),
      to: String(range.viewEnd.getTime()),
      count: this.config.maxItems
    }
    var payload = {
      filter: filter,
      sessionId: String(Date.now())
    }
    this.sendNotification("CALEXT_TELL_SCHEDULE", payload)
  },

  updateRequest2: function() {
    var now = new Date()
    var locale = getLocale(this.config.locale)
    var range = getCalendarRange(now, locale)
    var from = Math.floor(range.viewStart.getTime() / 1000)
    var to = Math.floor(range.viewEnd.getTime() / 1000)
    var payload = {
      filter: (e) => {
        if (this.names.length > 0) {
          if (this.names.indexOf(e.calendarName) < 0) {
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
          for (i = 0; i < events.length; i++) {
            events[i].name = events[i].calendarName
            events[i].startDate = events[i].startDate * 1000
            events[i].endDate = events[i].endDate * 1000
            events[i].styleName = events[i].className
          }
          var payload = {
            message: "SCHEDULE_FOUND",
            events: events
          }
          this.updateContent(payload)
        }
      }
    }
    this.sendNotification("CALEXT2_EVENT_QUERY", payload)
  },
})
