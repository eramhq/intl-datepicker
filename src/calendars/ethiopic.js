import { EthiopicCalendar, EthiopicAmeteAlemCalendar } from '@internationalized/date';
import { registerCalendar } from '../core/locale.js';

registerCalendar('ethiopic', () => new EthiopicCalendar());
registerCalendar('ethioaa', () => new EthiopicAmeteAlemCalendar());
