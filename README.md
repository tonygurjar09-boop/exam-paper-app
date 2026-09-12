# प्रश्न पत्र निर्माता (Exam Paper Generator)

Halfyearly/Unit Test exam paper — teacher class, subject, exam type aur chapters batata hai,
**AI (Google Gemini, free) khud poora paper generate karta hai** blueprint ke hisab se.
Phir teacher review/edit kar sakta hai, aur Word/PDF download.

## API Key (Free, Google Gemini)

Koi credit card nahi chahiye. Steps:

1. Phone/laptop browser me jao: **aistudio.google.com/apikey**
2. Google account se login karo
3. "Create API Key" dabao
4. Jo key mile (shuru `AIzaSy...` se hoti hai) use safe jagah save kar lo

## Local pe chalane ke liye

```bash
npm install
```

Ek `.env.local` file banao root me:

```
GEMINI_API_KEY=tumhari-key-yahan
```

Phir:

```bash
npm run dev
```

Browser me `http://localhost:3000` khol lo.

## Vercel pe deploy karne ke liye

1. Is folder ko GitHub pe push karo
2. https://vercel.com pe jaake "New Project" > apna GitHub repo select karo
3. Deploy se pehle **Environment Variables** me jaake add karo:
   - Key: `GEMINI_API_KEY`
   - Value: apni Gemini API key
4. Deploy dabao — 1-2 minute me live ho jayega, ek `.vercel.app` link milega

Us link ko phone pe khol ke test karna.

## Aage kya add ho sakta hai (baad me)

- Books/PDF knowledge base — actual textbook content se questions ground karna (Phase 2)
- Supabase — papers save karne ke liye
- Second Test/Third Test/Yearly ke fix blueprint (jab milenge)
