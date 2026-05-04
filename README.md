# NTE Room Finder

Neverness to Everness тоглогчид ID-аар өрөө үүсгэж, бусад нь join хийсний дараа host ID-г харах lobby сайт.

## Local ажиллуулах

```bash
npm install
cp .env.example .env
# .env дотор MONGODB_URI-гаа бичнэ
npm run dev
```

Дараа нь browser дээр:

```text
http://localhost:3000
```

## MongoDB Atlas

1. MongoDB Atlas дээр free cluster үүсгэнэ.
2. Database user үүсгэнэ.
3. Network Access дээр 0.0.0.0/0 түр зөвшөөрнө.
4. Connection string-ээ `.env` болон Vercel Environment Variables-д MONGODB_URI гэж оруулна.

## Vercel deploy

1. GitHub repo руу upload хийнэ.
2. Vercel дээр Import Project.
3. Environment Variables:
   - MONGODB_URI
4. Deploy.

## Одоогийн feature

- Room үүсгэх
- Room list харах
- Password optional
- Join хийсний дараа Host NTE ID reveal
- Active room 60 минутын дараа автоматаар устах
- Search/filter
