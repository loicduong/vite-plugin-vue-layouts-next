<template>
  <div>
    Sub folder page with layout set to second
    <p>
      <router-link to="/inherit/deep/2">
        Go to deep/2
      </router-link>
    </p>
  </div>
</template>

<route>
    {
        meta: {
            layout: "second"
        }
    }
</route>
