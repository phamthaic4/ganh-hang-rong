// break_infinity.js 2.2.0 có dist/index.d.ts nhưng package.json không khai "types".
declare module 'break_infinity.js' {
  export { default } from 'break_infinity.js/dist/index.js'
  export type { DecimalSource } from 'break_infinity.js/dist/index.js'
}
