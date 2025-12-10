self.addEventListener("push", function (event) {
  console.log("ℹ️  [Service Worker] Push Received.");

  let data = {
    title: "Green Day update",
    body: "New event announced!",
    url: "/",
  };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: "Green Day update", body: event.data.text(), url: "/" };
    }
  }

  const title = data.title || "Green Day update";
  const options = {
    body: data.body || "A new Green Day event is announced!",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  console.log("ℹ️  [Service Worker] Notification click Received.");
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // If there's already a window/tab open with the target URL, focus it.
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise, open a new tab to the target URL
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
