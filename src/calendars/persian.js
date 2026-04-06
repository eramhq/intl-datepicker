import { PersianCalendar } from '@internationalized/date';
import { registerCalendar } from '../core/locale.js';

registerCalendar('persian', () => new PersianCalendar());
