/* Frozen clock for the DOM suites: the fixtures are the base of Thursday 2026-10-29, so the page must believe it is
 * that day (15h EDT) whatever day the suites run. Pass the result as JSDOM's `beforeParse` option. */
'use strict';
const FROZEN_UTC = process.env.PLQ_TEST_NOW || '2026-10-29T19:00:00Z';
module.exports = function frozenClock(iso) {
  return (win) => {
    const RD = win.Date; const T = new RD(iso || FROZEN_UTC).getTime();
    class FD extends RD { constructor(...a) { if (a.length) super(...a); else super(T); } static now() { return T; } }
    win.Date = FD;
  };
};
