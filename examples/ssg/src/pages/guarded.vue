<template>
  <div>
    <p>guarded</p>
    <p>
      No static layout here. A router guard in src/main.ts assigns "second", and vite-ssg pre-renders it that way.
      (setPageLayout is avoided during SSG because its override would leak into the next pre-rendered route.)
    </p>
  </div>
</template>
