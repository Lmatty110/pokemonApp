import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Medal, Save, User } from "lucide-react";
import { toast } from "sonner";
import api from "../api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

const emptyProfile = { username: "", age: "", profile_image: null, mind: "", body: "", space: "", luck: "", medals: [] };
const fields = [["mind", "MENTE"], ["body", "CORPO"], ["space", "SPAZIO"], ["luck", "FORTUNA"]];

export default function ProfilePage() {
  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/profile").then(({ data }) => setProfile(data)).catch(() => toast.error("Impossibile caricare il profilo")).finally(() => setLoading(false));
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
        age: profile.age === "" ? null : Number(profile.age), profile_image: profile.profile_image,
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
          <button type="button" onClick={() => fileInput.current?.click()} className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-[#D4AF37] bg-gray-100 group shrink-0">
            {profile.profile_image ? <img src={profile.profile_image} alt="Foto profilo" className="w-full h-full object-cover" /> : <User className="w-16 h-16 text-gray-300 mx-auto" />}
            <span className="absolute inset-x-0 bottom-0 py-2 bg-[#2C3E50]/85 text-white flex justify-center opacity-90 group-hover:opacity-100"><Camera className="w-5 h-5" /></span>
          </button>
          <input ref={fileInput} type="file" accept="image/*" onChange={chooseImage} className="hidden" />
          <div className="flex-1 w-full"><p className="font-lato text-sm uppercase tracking-widest text-[#D4AF37]">Profilo allenatore</p><h1 className="font-cinzel text-3xl text-[#2C3E50] mt-1">{profile.username}</h1>
            <label className="block mt-5 max-w-xs font-lato text-sm text-gray-600">Età
              <Input type="number" min="0" max="120" value={profile.age ?? ""} onChange={(e) => setProfile({ ...profile, age: e.target.value })} className="mt-1" placeholder="Inserisci la tua età" />
            </label>
          </div>
        </div>
      </section>

      <section className="bg-white gold-border rounded-lg shadow-md overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {fields.map(([key, title]) => <div key={key} className="border-r border-b md:border-b-0 last:border-r-0 border-[#D4AF37]/40">
            <h2 className="font-cinzel text-center text-white bg-[#2C3E50] py-3">{title}</h2>
            <textarea value={profile[key]} onChange={(e) => setProfile({ ...profile, [key]: e.target.value })} maxLength={500} placeholder="Scrivi qui..." className="w-full h-40 p-4 resize-none outline-none focus:bg-[#D4AF37]/5 font-lato" />
          </div>)}
        </div>
      </section>

      <section className="bg-white gold-border rounded-lg p-6 sm:p-8 shadow-md">
        <h2 className="font-cinzel text-2xl text-[#2C3E50] flex items-center gap-2 mb-6"><Medal className="text-[#D4AF37]" /> Medagliere</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-4">
          {Array.from({ length: 8 }, (_, index) => { const medal = profile.medals[index]; return <div key={medal?.id || index} className="aspect-square rounded-full border-2 border-dashed border-[#D4AF37]/60 bg-[#FDFBF7] flex flex-col items-center justify-center p-2" title={medal?.name || "Slot vuoto"}>
            {medal ? <><img src={medal.image} alt={medal.name} className="w-14 h-14 object-contain" /><span className="text-[10px] text-center font-lato mt-1 line-clamp-1">{medal.name}</span></> : <Medal className="w-9 h-9 text-gray-200" />}
          </div>; })}
        </div>
      </section>
      <div className="flex justify-end"><Button onClick={save} disabled={saving} className="btn-academy"><Save className="w-4 h-4 mr-2" />{saving ? "Salvataggio..." : "Salva profilo"}</Button></div>
    </main>
  </div>;
}
