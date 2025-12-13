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
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported in this browser.");
  }

  // Register the service worker
  const registration = await navigator.serviceWorker
    .register(swPath)
    .catch((err) => {
      console.error("❌ Service worker registration failed:", err);
      throw err;
    });

  // Wait until the service worker is active and ready
  // navigator.serviceWorker.ready resolves when a service worker is active and controlling the page.
  const readyReg = await navigator.serviceWorker.ready;

  // Extra defensive check: ensure the registration we returned became active
  if (!readyReg || !readyReg.active) {
    // Wait for activation state change (max timeout)
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timed out waiting for service worker activation."));
      }, 5000);

      // if active already, done
      if (
        readyReg &&
        readyReg.active &&
        readyReg.active.state === "activated"
      ) {
        clearTimeout(timeout);
        return resolve();
      }

      // Otherwise listen for state changes on installing/waiting/active workers
      const checkAndResolve = () => {
        const r = navigator.serviceWorker.controller || readyReg;
        if (r && r.active && r.active.state === "activated") {
          clearTimeout(timeout);
          return resolve();
        }
      };

      // Attempt to catch the registration's installing/waiting worker changes
      if (readyReg && readyReg.installing) {
        readyReg.installing.addEventListener("statechange", () => {
          if (readyReg.installing.state === "activated") {
            clearTimeout(timeout);
            resolve();
          }
        });
      }
      if (readyReg && readyReg.waiting) {
        readyReg.waiting.addEventListener("statechange", () => {
          if (readyReg.waiting.state === "activated") {
            clearTimeout(timeout);
            resolve();
          }
        });
      }

      // Also check controllerchange (page may get controlled later)
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        // small delay then resolve
        setTimeout(() => {
          if (navigator.serviceWorker.controller) {
            clearTimeout(timeout);
            resolve();
          }
        }, 50);
      });

      // final attempt to resolve immediately if already ok
      checkAndResolve();
    });
  }

  console.log("Service worker ready and active:", readyReg);
  return readyReg;
}
