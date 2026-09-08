import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Coins, Medal, Save, User } from "lucide-react";
import { toast } from "sonner";
import api from "../api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

const emptyProfile = { username: "", age: "", savings: "", profile_image: null, mind: "", body: "", space: "", luck: "", medals: [] };
const fields = [
  ["mind", "MENTE", "bg-blue-600", "bg-blue-50 focus:bg-blue-100"],
  ["body", "CORPO", "bg-red-600", "bg-red-50 focus:bg-red-100"],
  ["space", "SPAZIO", "bg-yellow-400", "bg-yellow-50 focus:bg-yellow-100"],
  ["luck", "FORTUNA", "bg-green-600", "bg-green-50 focus:bg-green-100"],
];

const formatSavings = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? digits.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "";
};

export default function ProfilePage() {
  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/profile").then(({ data }) => setProfile({ ...data, savings: formatSavings(data.savings) })).catch(() => toast.error("Impossibile caricare il profilo")).finally(() => setLoading(false));
  }, []);

  const chooseImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      toast.error("Scegli un'immagine di massimo 2 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProfile((current) => ({ ...current, profile_image: reader.result }));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/profile", {
        age: profile.age === "" ? null : Number(profile.age), savings: profile.savings,
        profile_image: profile.profile_image,
        mind: profile.mind, body: profile.body, space: profile.space, luck: profile.luck,
      });
      toast.success("Profilo salvato");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore durante il salvataggio");
    } finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]"><div className="pokeball animate-pulse" /></div>;

  return <div className="min-h-screen bg-[#FDFBF7]">
    <header className="bg-[#2C3E50] shadow-lg"><div className="max-w-6xl mx-auto px-4 py-4">
      <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-white hover:text-[#D4AF37]"><ArrowLeft className="w-5 h-5" /> Torna alla Bacheca</button>
    </div></header>
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <section className="bg-white gold-border rounded-lg p-6 sm:p-8 shadow-md">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="shrink-0 text-center">
            <button type="button" onClick={() => fileInput.current?.click()} className="w-36 h-36 rounded-full overflow-hidden border-4 border-[#D4AF37] bg-gray-100 flex items-center justify-center group">
              {profile.profile_image ? <img src={profile.profile_image} alt="Foto profilo" className="w-full h-full rounded-full object-cover object-center" /> : <User className="w-16 h-16 text-gray-300" />}
            </button>
            <button type="button" onClick={() => fileInput.current?.click()} className="mt-2 inline-flex items-center justify-center gap-2 text-sm text-[#2C3E50] hover:text-[#D4AF37] font-lato">
              <Camera className="w-4 h-4" /> {profile.profile_image ? "Cambia foto" : "Carica foto"}
            </button>
          </div>
          <input ref={fileInput} type="file" accept="image/*" onChange={chooseImage} className="hidden" />
          <div className="flex-1 w-full"><p className="font-lato text-sm uppercase tracking-widest text-[#D4AF37]">Profilo allenatore</p><h1 className="font-cinzel text-3xl text-[#2C3E50] mt-1">{profile.username}</h1></div>
          <div className="w-full sm:w-72 sm:self-start rounded-lg border border-[#D4AF37]/60 bg-gradient-to-br from-[#FFF9E6] to-white p-4 shadow-sm">
            <label className="block">
              <span className="flex items-center gap-2 font-cinzel text-lg text-[#2C3E50]"><span className="w-9 h-9 rounded-full bg-[#D4AF37] flex items-center justify-center"><Coins className="w-5 h-5 text-white" /></span> Risparmi</span>
              <div className="relative mt-3">
                <Input inputMode="numeric" value={profile.savings ?? ""} onChange={(e) => setProfile({ ...profile, savings: formatSavings(e.target.value) })} maxLength={25} className="pr-10 bg-white border-[#D4AF37]/50 font-lato text-lg" placeholder="Inserisci i risparmi" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D4AF37] font-bold">₽</span>
              </div>
            </label>
          </div>
        </div>
      </section>

      <section className="bg-white gold-border rounded-lg shadow-md overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {fields.map(([key, title, headerColor, bodyColor]) => <div key={key} className="border-r border-b md:border-b-0 last:border-r-0 border-white/70">
            <h2 className={`font-cinzel text-center text-white py-3 ${headerColor}`}>{title}</h2>
            <textarea value={profile[key]} onChange={(e) => setProfile({ ...profile, [key]: e.target.value })} maxLength={500} placeholder="Scrivi qui..." className={`w-full h-40 p-4 resize-none outline-none font-lato text-4xl leading-relaxed text-center ${bodyColor}`} />
          </div>)}
        </div>
      </section>

      <section className="bg-white gold-border rounded-lg p-6 sm:p-8 shadow-md">
        <h2 className="font-cinzel text-2xl text-[#2C3E50] flex items-center gap-2 mb-6"><Medal className="text-[#D4AF37]" /> Medagliere</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-4">
          {Array.from({ length: 8 }, (_, index) => { const medal = profile.medals[index]; return <div key={medal?.id || index} className="min-w-0 text-center" title={medal?.name || "Slot vuoto"}>
            <div className="aspect-square rounded-full overflow-hidden border-2 border-dashed border-[#D4AF37]/60 bg-[#FDFBF7] flex items-center justify-center">
              {medal ? <img src={medal.image} alt={medal.name} className="w-full h-full object-cover rounded-full" /> : <Medal className="w-9 h-9 text-gray-200" />}
            </div>
            <p className="h-8 mt-2 px-1 text-[11px] leading-tight text-center font-lato text-[#2C3E50] line-clamp-2">{medal?.name || ""}</p>
          </div>; })}
        </div>
      </section>
      <div className="flex justify-end"><Button onClick={save} disabled={saving} className="btn-academy"><Save className="w-4 h-4 mr-2" />{saving ? "Salvataggio..." : "Salva profilo"}</Button></div>
    </main>
  </div>;
}
