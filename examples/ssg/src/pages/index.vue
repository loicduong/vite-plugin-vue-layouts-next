<template>
  <div>
    <p>index.vue</p>
    <router-link to="/about">
      about
    </router-link>
    <p>
      <router-link to="/news">
        news
      </router-link> |
      <router-link :to="{ name: 'named-news-page' }">
        today's news
      </router-link>
    </p>
    <p>
      <router-link to="/sublayout">
        sub layout
      </router-link>
    </p>
  </div>
</template>

<route>
{
  name: "name-override",
  meta: {requiresAuth: false}
}
</route>
