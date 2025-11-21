<template>
  <div id="app" class="app">
    <van-config-provider theme="light">
      <router-view />
    </van-config-provider>
  </div>
</template>

<script setup lang="ts">
import { ConfigProvider as VanConfigProvider } from 'vant'
</script>

<style lang="scss">
#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  min-height: 100vh;
  background-color: var(--bg-color);
}
</style>