# Awaken Frontend — IDML Translator (MVP)

## 🎯 Cel
Interfejs użytkownika do aplikacji tłumaczącej dokumenty Adobe InDesign (`.idml`).  
Pozwala:
- wgrywać pojedyncze pliki `.idml` lub archiwa `.zip` z wieloma plikami IDML,  
- przeglądać segmenty tekstowe (`<Content>`),  
- tłumaczyć pojedyncze lub wszystkie segmenty (mock AI),  
- eksportować przetłumaczone pliki `.idml`.

---

## 🧭 Scenariusz (UI)
1. **Upload** — przycisk „Prześlij plik” obsługujący `.idml` lub `.zip`.
2. **Lista plików** — lewy panel z przesłanymi dokumentami.
3. **Segmenty** — centralna lista z kolumnami *oryginał / tłumaczenie*.
4. **Filtry** — przyciski filtracji głównego komponentu renderującego segmenty: *Wszystkie / Przetłumaczone / Nieprzetłumaczone*.
5. **Akcje** — tłumaczenie wszystkich (`Translate All`) lub eksport (`Export`).
6. **Postęp** — pasek progressu podczas batch tłumaczenia.

---

## 🧱 Stack technologiczny
- **Next.js 14** (App Router)  
- **TypeScript**  
- **TailwindCSS**  
- **Axios** – klient REST API  
- **Lucide-react / shadcn/ui** – UI/ikony  
- **Vercel**

---

## ⚙️ Konfiguracja
Utwórz `.env.local` w katalogu `awaken_frontend`:
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
