<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ linksOpened: number; position?: number }>()
const visibleCount = computed(() => Math.max(1, Math.min(props.linksOpened, 9)))
const hiddenCount = computed(() => Math.max(0, props.linksOpened - visibleCount.value))
const activeIndex = computed(() => Math.min(props.position ?? props.linksOpened, visibleCount.value) - 1)
</script>

<template>
  <div class="kindness-trail" role="img" :aria-label="`A private kindness trail with ${linksOpened} recipient ${linksOpened === 1 ? 'link' : 'links'} opened.`">
    <div class="trail-line" aria-hidden="true">
      <span
        v-for="index in visibleCount"
        :key="index"
        class="trail-node"
        :class="{ 'trail-node--active': index - 1 === activeIndex }"
      >{{ index - 1 === activeIndex ? '♥' : '' }}</span>
      <span v-if="hiddenCount" class="trail-more">+{{ hiddenCount }}</span>
    </div>
  </div>
</template>
