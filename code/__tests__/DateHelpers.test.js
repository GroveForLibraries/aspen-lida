import {
     createTimeOnDate,
     formatDateFull,
     formatDateShort,
     formatFacetDateTime,
     formatTime,
     formatUnixDate,
     getEventDateDisplayData,
     getTodaysHoursStatus,
     parseEventDateTime,
     parseLocalDateString,
     subtractYears,
} from '../src/helpers/helpers';

describe('native date helper replacements', () => {
     it('formats short and full dates with the existing English output shapes', () => {
          const date = new Date(2026, 6, 27, 14, 30, 0);

          expect(formatDateShort(date)).toBe('Jul 27, 2026');
          expect(formatDateFull(date)).toBe('Monday, July 27, 2026');
     });

     it('formats times in h:mm A format', () => {
          expect(formatTime(new Date(2026, 0, 1, 0, 0, 0))).toBe('12:00 AM');
          expect(formatTime(new Date(2026, 0, 1, 14, 5, 0))).toBe('2:05 PM');
     });

     it('formats unix timestamps and rejects invalid values', () => {
          expect(formatUnixDate(1785196800)).toBe('Jul 27, 2026');
          expect(formatUnixDate(0)).toBe('');
          expect(formatUnixDate('nope')).toBe('');
     });

     it('parses local date-only strings without shifting the day', () => {
          const parsed = parseLocalDateString('2026-07-28');

          expect(parsed).not.toBeNull();
          expect(parsed.getFullYear()).toBe(2026);
          expect(parsed.getMonth()).toBe(6);
          expect(parsed.getDate()).toBe(28);
     });

     it('parses event date-time strings as local dates and builds shared display data', () => {
          const parsed = parseEventDateTime('2026-07-28 14:30:00');
          const display = getEventDateDisplayData('2026-07-28 14:30:00', '2026-07-28 16:00:00');

          expect(parsed).not.toBeNull();
          expect(parsed.getFullYear()).toBe(2026);
          expect(parsed.getMonth()).toBe(6);
          expect(parsed.getDate()).toBe(28);
          expect(parsed.getHours()).toBe(14);
          expect(parsed.getMinutes()).toBe(30);
          expect(display).toEqual({
               startDate: expect.any(Date),
               endDate: expect.any(Date),
               displayDay: 'Tuesday, July 28, 2026',
               displayStartTime: '2:30 PM',
               displayEndTime: '4:00 PM',
          });
     });

     it('serializes facet datetimes with zero-padded local components', () => {
          const date = new Date(2026, 0, 5, 9, 7, 3);

          expect(formatFacetDateTime(date)).toBe('2026-01-05T09:07:03');
     });

     it('creates times on a provided base date and subtracts years safely', () => {
          const baseDate = parseLocalDateString('2026-07-28');
          const timeOnDate = createTimeOnDate(14, 45, baseDate, 30);
          const shifted = subtractYears(baseDate, 5);

          expect(timeOnDate).not.toBeNull();
          expect(timeOnDate.getFullYear()).toBe(2026);
          expect(timeOnDate.getMonth()).toBe(6);
          expect(timeOnDate.getDate()).toBe(28);
          expect(timeOnDate.getHours()).toBe(14);
          expect(timeOnDate.getMinutes()).toBe(45);
          expect(timeOnDate.getSeconds()).toBe(30);

          expect(shifted).not.toBeNull();
          expect(shifted.getFullYear()).toBe(2021);
          expect(shifted.getMonth()).toBe(6);
          expect(shifted.getDate()).toBe(28);
     });

     it('computes today hours status transitions', () => {
          const hours = [
               { day: 2, open: '09:00', close: '17:00', isClosed: false },
          ];

          const beforeOpen = getTodaysHoursStatus(hours, new Date(2026, 6, 28, 8, 30, 0));
          const duringOpen = getTodaysHoursStatus(hours, new Date(2026, 6, 28, 12, 0, 0));
          const afterClose = getTodaysHoursStatus(hours, new Date(2026, 6, 28, 17, 30, 0));

          expect(beforeOpen.status).toBe('closed_until');
          expect(beforeOpen.isClosedToday).toBe(true);
          expect(formatTime(beforeOpen.openingTime)).toBe('9:00 AM');

          expect(duringOpen.status).toBe('open_until');
          expect(duringOpen.isClosedToday).toBe(false);
          expect(formatTime(duringOpen.closingTime)).toBe('5:00 PM');

          expect(afterClose.status).toBe('closed');
          expect(afterClose.isClosedToday).toBe(true);
     });
});

