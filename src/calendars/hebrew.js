import { HebrewCalendar } from '@internationalized/date';
import { registerCalendar } from '../core/locale.js';

registerCalendar('hebrew', () => new HebrewCalendar());
