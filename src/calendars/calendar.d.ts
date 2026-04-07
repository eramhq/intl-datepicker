// Calendar entries are pure side-effect imports — they register a calendar
// factory with the runtime registry and export nothing. This stub exists so
// that subpath imports like `intl-datepicker/calendars/persian` resolve to a
// known module shape under TypeScript's `node16`/`bundler` resolution.
export {};
