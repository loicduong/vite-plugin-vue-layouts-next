# exclude

- **Type:** `string[]`
- **Default:** `[]`

List of path globs to exclude when resolving layouts.

```js
Layouts({
  exclude: ['**/components/**'],
})
```

Files named `__*__.vue` are always excluded, regardless of this option.
