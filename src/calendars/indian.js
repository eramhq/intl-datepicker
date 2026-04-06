import { IndianCalendar } from '@internationalized/date';
import { registerCalendar } from '../core/locale.js';

registerCalendar('indian', () => new IndianCalendar());
