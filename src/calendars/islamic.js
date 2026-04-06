import { IslamicUmalquraCalendar, IslamicCivilCalendar, IslamicTabularCalendar } from '@internationalized/date';
import { registerCalendar } from '../core/locale.js';

registerCalendar('islamic', () => new IslamicUmalquraCalendar());
registerCalendar('islamic-umalqura', () => new IslamicUmalquraCalendar());
registerCalendar('islamic-civil', () => new IslamicCivilCalendar());
registerCalendar('islamic-tbla', () => new IslamicTabularCalendar());
