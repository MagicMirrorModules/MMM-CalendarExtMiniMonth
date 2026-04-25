/* Magic Mirror
* Module: MMM-CalendarExtMinimonth
*
* By eouia
*/

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

  getScripts: function () {
  return ["moment.js"];
  },

  getDom: function() {
    var dom = document.createElement("div")
    dom.id = "CXMM"
    if (this.slots.length == 0) return dom
    var header = document.createElement("div")
    header.className = "header"
    header.innerHTML = (this.config.titleFormat) ? moment().format(this.config.titleFormat) : null
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

    var locale = (this.config.locale) ? this.config.locale : moment.locale()
    var startCalDate = moment().locale(locale).startOf('month').startOf('week')
    var endCalDate = moment().locale(locale).endOf('month').endOf('week')

    var startThisMonth = moment().locale(locale).startOf('month').format("X")
    var endThisMonth = moment().locale(locale).endOf('month').format("X")
    var startToday = moment().locale(locale).startOf('day').format("X")
    var endToday = moment().locale(locale).endOf('day').format("X")

    var week = null
    week = document.createElement("div")
    for (var i = 0; i < 7; i++) {
      var cell = document.createElement("div")
      cell.classList.add("cell")
      cell.classList.add("weekday_title")
      var d = moment().locale(locale).startOf("week").add(i, "d")
      cell.classList.add("weekdays_" + d.isoWeekday())
      cell.innerHTML = d.format(this.config.weekdayFormat)
      week.appendChild(cell)
    }
    dom.appendChild(week)

    for (var i = 0; i < this.slots.length; i++) {
      if (0 == (i % 7)) {
        week = document.createElement("div")
      }
      var slot = this.slots[i]
      var date = moment.unix(slot.key).locale(locale)
      var dateX = date.format("X")
      var isThisMonth = (dateX >= startThisMonth && dateX < endThisMonth)
      var isToday = (dateX >= startToday && dateX < endToday)
      var cell = document.createElement("div")
      cell.innerHTML = date.format("D")
      cell.classList.add("cell")
      cell.classList.add("weekdays_" + date.isoWeekday())
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
    var locale = (this.config.locale) ? this.config.locale : moment.locale()
    var startCalDate = moment().locale(locale).startOf('month').startOf('week')
    var endCalDate = moment().locale(locale).endOf('month').endOf('week')
    var index = moment(startCalDate).startOf("day")
    while (index.isBefore(moment(endCalDate))) {
      var key = index.format("X")
      var slot = {
        "key": key,
        "events": []
      }
      var dayStart = moment(index).locale(locale).startOf("day")
      var dayEnd = moment(index).locale(locale).endOf("day")
      for(var i = 0; i < events.length; i++) {
        var ev = events[i]
        var evS = moment(Number(ev.startDate))
        var evE = moment(Number(ev.endDate))
        if (evE.isSameOrBefore(dayStart) || evS.isAfter(dayEnd)) {
          // not matched
        } else {
          slot.events.push(ev)
        }
      }
      slots.push(slot)
      index.add(1, "d")
    }
    this.maxEventCounts = Math.max.apply(
      Math, slots.map(function(o){return o.events.length})
    )
    return slots
  },

  updateRequest: function() {
    var filter = {
      names: this.names,
      from: moment().startOf('month').startOf('week').format('x'),
      to: moment().endOf('month').endOf('week').format('x'),
      count: this.config.maxItems
    }
    var payload = {
      filter: filter,
      sessionId: moment().format('x')
    }
    this.sendNotification("CALEXT_TELL_SCHEDULE", payload)
  },

  updateRequest2: function() {
    var payload = {
      filter: (e) => {
        var from = moment().startOf("month").startOf('week').format("X")
        var to = moment().endOf("month").endOf('week').format("X")
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
