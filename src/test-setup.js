import './calendars/all.js';
import './labels/all.js';

// jsdom's `ElementInternals` shim is partial — it has the constructor but
// lacks `setFormValue`, `setValidity`, etc. Patch them with no-ops so the
// custom element's form-association code can run unconditionally instead of
// having to defensively `typeof`-check every method in production.
if (typeof ElementInternals !== 'undefined') {
  const proto = ElementInternals.prototype;
  if (typeof proto.setFormValue !== 'function') proto.setFormValue = () => {};
  if (typeof proto.setValidity !== 'function') {
    proto.setValidity = () => {};
    Object.defineProperty(proto, 'validity', { value: { valid: true }, configurable: true });
    Object.defineProperty(proto, 'validationMessage', { value: '', configurable: true });
    Object.defineProperty(proto, 'willValidate', { value: true, configurable: true });
    proto.checkValidity = () => true;
    proto.reportValidity = () => true;
  }
}
