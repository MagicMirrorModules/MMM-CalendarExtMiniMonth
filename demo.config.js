const config = {
  address: '0.0.0.0',
  ipWhitelist: [],
  logLevel: ['INFO', 'LOG', 'WARN', 'ERROR', 'DEBUG'],
  modules: [
    {
      module: 'clock',
      position: 'top_left',
    },
    {
      module: 'calendar',
      position: 'top_right',
      config: {
        calendars: [
          {
            name: 'mull',
            url: 'http://localhost:8080/modules/MMM-CalendarExtMiniMonth/demo.ics',
            color: '#4CAF50',
          },
          {
            name: 'test',
            url: 'http://localhost:8080/modules/MMM-CalendarExtMiniMonth/demo-test.ics',
            color: '#F0B400',
          },
        ],
        showSymbol: true,
        broadcastEvents: true,
        broadcastPastEvents: true,
        maximumNumberOfDays: 60,
        maximumEntries: 50,
        sliceMultiDayEvents: true,
        hideDuplicates: false,
      },
    },
    {
      module: 'MMM-CalendarExtMiniMonth',
      position: 'bottom_bar',
      config: {
        titleFormat: 'MMMM',
        weekdayFormat: 'dd',
        dateFormat: 'D',
        calendars: ['mull', 'test'],
        source: 'CALENDAR',
      },
    },
  ],
}

/** ************* DO NOT EDIT THE LINE BELOW ***************/
if (typeof module !== 'undefined') {
  module.exports = config
}
