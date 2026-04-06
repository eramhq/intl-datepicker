import { JapaneseCalendar } from '@internationalized/date';
import { registerCalendar } from '../core/locale.js';

registerCalendar('japanese', () => new JapaneseCalendar());
