import api from "../api";

export const supportsPush = () => window.isSecureContext
  && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` }, timeout: 10000 });
let deviceOperation = Promise.resolve();
const serialize = (operation) => {
  const result = deviceOperation.then(operation);
  deviceOperation = result.catch(() => {});
  return result;
};

const publicKeyBytes = (value) => {
  const base64 = (value + "=".repeat((4 - value.length % 4) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
};

// Only restore an existing opt-in; never request permission on login.
export const syncExistingSubscription = (token) => serialize(async () => {
  if (!supportsPush() || Notification.permission !== "granted") return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription && localStorage.getItem("token") === token) {
    await api.post("/notifications/subscriptions", subscription.toJSON(), auth(token));
  }
});

export const enablePush = async (publicKey, token) => {
  // Must run directly from a tap, before any network or service worker awaits (iOS).
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Permesso negato. Puoi modificarlo nelle impostazioni del browser.");
  return serialize(async () => {
    await navigator.serviceWorker.register("/service-worker.js");
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    const applicationServerKey = publicKeyBytes(publicKey);
    if (subscription?.options.applicationServerKey
      && String(new Uint8Array(subscription.options.applicationServerKey)) !== String(applicationServerKey)) {
      await api.delete("/notifications/subscriptions", { ...auth(token), data: { endpoint: subscription.endpoint } });
      await subscription.unsubscribe();
      subscription = null;
    }
    const created = !subscription;
    subscription = subscription || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
    try {
      await api.post("/notifications/subscriptions", subscription.toJSON(), auth(token));
      return subscription;
    } catch (error) {
      if (created) await subscription.unsubscribe();
      throw error;
    }
  });
};

export const disablePush = (token) => serialize(async () => {
  if (!supportsPush()) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  try {
    await api.delete("/notifications/subscriptions", { ...auth(token), data: { endpoint: subscription.endpoint } });
  } finally {
    await subscription.unsubscribe();
  }
});
