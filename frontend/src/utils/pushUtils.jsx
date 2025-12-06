export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export async function registerServiceWorker(swPath = "/sw.js") {
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.register(swPath);
      console.log("ℹ️  Service worker registered.", reg);
      return reg;
    } catch (err) {
      console.error("❌ Service worker registration failed:", err);
      throw err;
    }
  } else {
    throw new Error("ServiceWorker not supported in this browser");
  }
}
