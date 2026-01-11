<script setup lang="ts"></script>

<template>
  <router-view />
</template>

<style scoped></style>

<style>
/* 全局样式重置 - 解决页面级纵向滚动条问题 */
body {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
}

html, body {
  height: 100%;
}

#app {
  height: 100%;
}
</style>
