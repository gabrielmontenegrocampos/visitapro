'use client'

import { useEffect } from 'react'

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

async function syncSubscription() {
  try {
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })
    }
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub),
    })
  } catch {
    // Silently fail — push is optional
  }
}

export default function PushPermission() {
  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return

    if (Notification.permission === 'granted') {
      syncSubscription()
      return
    }

    if (Notification.permission === 'default') {
      // Ask after 4 seconds so the user has time to settle into the page
      const t = setTimeout(() => {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') syncSubscription()
        })
      }, 4000)
      return () => clearTimeout(t)
    }
  }, [])

  return null
}
