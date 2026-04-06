import { BuddhistCalendar } from '@internationalized/date';
import { registerCalendar } from '../core/locale.js';

registerCalendar('buddhist', () => new BuddhistCalendar());
