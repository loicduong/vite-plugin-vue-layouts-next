# importMode

- **Type:** `(name: string) => 'sync' | 'async'`
- **Default:** ssg is `'sync'`, other is `'async'`

Mode for importing layouts.

```js
Layouts({
  importMode: name => (name === 'default' ? 'sync' : 'async'),
})
```
