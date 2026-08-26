# 모아 - Guide d'installation

## Ce dont tu as besoin

1. **Un compte GitHub** (gratuit) : https://github.com/signup
2. **Un compte Vercel** (gratuit) : https://vercel.com/signup (connecte-le à GitHub)
3. **Une clé API Google Gemini** (gratuite) : https://aistudio.google.com/apikey (connecte-toi avec un compte Google, puis "Create API key")
4. **Un compte Supabase** (gratuit, optionnel pour la synchro entre appareils) : https://supabase.com

---

## Étape 1 : Mettre le code sur GitHub

1. Va sur https://github.com/new
2. Donne un nom au repo, par exemple `moa-app`
3. Laisse-le en "Public" ou "Private" comme tu veux
4. Clique "Create repository"
5. GitHub te montre des instructions. La plus simple :
   - Télécharge et installe GitHub Desktop : https://desktop.github.com
   - Clone ton nouveau repo
   - Copie tout le contenu du dossier `moa-web` dedans
   - Commit et Push

---

## Étape 2 : Déployer sur Vercel

1. Va sur https://vercel.com/new
2. Clique "Import" à côté de ton repo `moa-app`
3. Dans "Environment Variables", ajoute :
   - `AI_API_KEY` = ta clé API Google Gemini
4. Clique "Deploy"
5. En 30 secondes, ton app est en ligne ! Vercel te donne une URL du type `moa-app.vercel.app`

---

## Étape 3 (optionnel) : Activer la synchro entre appareils

Sans cette étape, l'app fonctionne parfaitement mais tes données restent sur chaque appareil séparément (localStorage).

### Créer la base Supabase

1. Va sur https://supabase.com, crée un projet
2. Va dans "SQL Editor" et exécute ce code :

```sql
CREATE TABLE moa_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permettre l'accès public (c'est ton app perso, pas de données sensibles)
ALTER TABLE moa_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON moa_data FOR ALL USING (true) WITH CHECK (true);
```

3. Va dans "Settings" > "API" et note :
   - **Project URL** (commence par `https://xxx.supabase.co`)
   - **anon public key** (longue chaîne)

### Ajouter les variables dans Vercel

1. Va dans ton projet Vercel > Settings > Environment Variables
2. Ajoute :
   - `VITE_SUPABASE_URL` = ton Project URL
   - `VITE_SUPABASE_ANON_KEY` = ta anon key
3. Redéploie (Deployments > clic sur les 3 points > Redeploy)

### Utiliser la synchro

Dans l'app, clique sur "Local uniquement" en haut à droite. Entre un mot de passe simple (par exemple "moncoreen2024"). Utilise le même mot de passe sur tous tes appareils. Tes cartes seront synchronisées !

---

## Utilisation

1. Va sur ton URL Vercel depuis ton ordi ou ton smartphone
2. Clique "Importer" et colle un texte coréen
3. L'IA analyse et te propose des points de grammaire
4. Choisis un point et commence la leçon socratique
5. Tes cartes se sauvegardent automatiquement

---

## Coûts

- **Vercel** : gratuit (hobby plan)
- **Supabase** : gratuit (free tier, 500 Mo)
- **Google Gemini API** : gratuit (le free tier de Google AI Studio suffit largement pour un usage personnel)

C'est tout ! 🎉
