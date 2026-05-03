export function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("Service Worker registered:", registration)
      })
      .catch((error: unknown) => {
        console.error("Service Worker registration failed:", error)
      })
  })
}
