import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../App";
import api from "../api";
import { Button } from "./ui/button";
import { disablePush, enablePush, supportsPush } from "../lib/pushNotifications";

export default function NotificationSettings() {
  const { token } = useAuth();
  const [config, setConfig] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);
  const supported = supportsPush();

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data } = await api.get("/notifications/config");
        const registration = supported ? await navigator.serviceWorker.getRegistration() : null;
        const subscription = await registration?.pushManager.getSubscription();
        if (active) { setConfig(data); setEnabled(Boolean(subscription) && Notification.permission === "granted"); }
      } catch {
        if (active) setFailed(true);
      } finally {
        if (active) setBusy(false);
      }
    };
    load();
    return () => { active = false; };
  }, [supported, token]);

  const toggle = async () => {
    setBusy(true);
    try {
      if (enabled) await disablePush(token);
      else await enablePush(config.public_key, token);
      setEnabled(!enabled);
      toast.success(enabled ? "Notifiche disattivate su questo dispositivo" : "Notifiche attivate su questo dispositivo");
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || "Impossibile aggiornare le notifiche");
    } finally { setBusy(false); }
  };

  return <section className="bg-white gold-border rounded-lg p-4 sm:p-8 shadow-md">
    <h2 className="font-cinzel text-xl text-[#2C3E50] flex items-center gap-2 mb-3"><Bell className="shrink-0 text-[#D4AF37]" /> Notifiche news</h2>
    <p className="font-lato text-gray-600 mb-4">Ricevi le nuove news nella barra delle notifiche, anche quando l'app è chiusa. Attiva questa opzione su ogni dispositivo su cui vuoi riceverle.</p>
    {!supported && <p className="text-sm text-gray-500 mb-4">Su iPhone aggiungi l'app alla schermata Home e aprila da lì (iOS 16.4 o successivo). Negli altri casi usa un browser compatibile e un collegamento HTTPS.</p>}
    {failed && <p role="status" className="text-sm text-red-600 mb-4">Impossibile verificare le notifiche. Ricarica la pagina per riprovare.</p>}
    {config && !config.enabled && <p className="text-sm text-gray-500 mb-4">Le notifiche non sono ancora disponibili. L'amministratore deve completare l'attivazione del servizio.</p>}
    {supported && Notification.permission === "denied" && <p className="text-sm text-gray-500 mb-4">Le notifiche sono bloccate nelle impostazioni del browser. Consenti le notifiche per questa app e ricarica la pagina.</p>}
    <Button type="button" onClick={toggle} disabled={busy || !supported || (!enabled && (!config?.enabled || Notification.permission === "denied"))} className="btn-academy w-full sm:w-auto">
      {busy ? "Caricamento..." : enabled ? "Disattiva su questo dispositivo" : "Attiva su questo dispositivo"}
    </Button>
  </section>;
}
