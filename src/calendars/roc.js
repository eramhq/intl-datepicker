import { TaiwanCalendar } from '@internationalized/date';
import { registerCalendar } from '../core/locale.js';

registerCalendar('roc', () => new TaiwanCalendar());
