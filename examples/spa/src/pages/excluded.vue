<template>
  <div>
    <p>excluded layout</p>
    <p>
      This page asks for <code>drafts-wip</code>, but <code>src/layouts/drafts/</code> is
      dropped by <code>exclude: ['**/drafts/**']</code>, so it falls back to the default layout.
    </p>
  </div>
</template>

<route>
{meta: {
  layout: "drafts-wip"
}
}
</route>
