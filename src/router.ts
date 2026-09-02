import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/create', name: 'create', component: () => import('./views/CreateView.vue') },
    { path: '/sent/:token', name: 'sent', component: () => import('./views/SentView.vue') },
    { path: '/history', name: 'history', component: () => import('./views/HistoryView.vue') },
    { path: '/trail/:token', name: 'trail', component: () => import('./views/TrailView.vue') },
    { path: '/s/:token', name: 'receive', component: () => import('./views/ReceiveView.vue') },
    { path: '/about', name: 'about', component: () => import('./views/AboutView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
