import { CopticCalendar } from '@internationalized/date';
import { registerCalendar } from '../core/locale.js';

registerCalendar('coptic', () => new CopticCalendar());
