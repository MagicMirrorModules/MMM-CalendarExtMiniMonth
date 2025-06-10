# MMM-CalendarExtMinimonth

Mini month plugin for [MMM-CalendarExt2](https://github.com/MMM-CalendarExt2/MMM-CalendarExt2).

## Screenshot

![screenshot](sc1.png)

## Installation

This module is a plugin for [MMM-CalendarExt2](https://github.com/MMM-CalendarExt2/MMM-CalendarExt2). So it couldn't work standalone.

```sh
cd ~/MagicMirror/modules
git clone https://github.com/eouia/MMM-CalendarExtMinimonth
```

## Configuration

### Simple

```js
{
  module:"MMM-CalendarExtMinimonth",
  position:"top_left",
},
```

### Defaults & Details

These values are defined as default. You don't need to copy entire things. Just select what you need.

```js
defaults: {
  locale: null,
  // if null, locale of system default will be used.
  // e.g) "en-US", "de-DE", "ko-KR", ...

  dynamicEventColor: ["#333", "#F3F"],
  // if null, only circle border will be shown when event exists.
  // You can use color name or rgb(), rgba() CSS functions.
  // e.g) ["LightRed", "DarkBlue"]

  maxItems: 100,
  // if you need, give enough counts. This value would be related with performance.

  refreshInterval: 60*10*1000,
  // milliseconds. Do you really need

  titleFormat: "MMMM",
  // the formatter rule of `moment.js`
  // https://momentjs.com/docs/#/displaying/format/

  weekdayFormat: "dd",
  //"dd", "ddd", "dddd",

  dateFormat: "D",
  //D, Do, DD.

  // I believe it's better to leave `weekdayFormat` and `dateFormat` as current values.

  calendars: [], // names of calendar in your MMM-CalendarExt/MMM-CalendarExt2
  // Use when you need only specific calendars.

  source: "CALEXT2",
  // or "CALEXT"
},
```

## Styling

See MMM-CalendarExtMinimonth.css
