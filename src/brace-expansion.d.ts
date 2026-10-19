// brace-expansion 3.x ships no types, and @types/brace-expansion describes the 1.x CommonJS API.
declare module 'brace-expansion' {
  export default function expand(str: string): string[]
}
