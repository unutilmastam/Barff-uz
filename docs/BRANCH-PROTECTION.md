# BRANCH HIMOYASI VA RELIZ TARTIBI

> Bu sozlamalar GitHub'da **qo'lda** yoqiladi: repo → Settings → Branches →
> Add branch ruleset. Kod bilan avtomatlashtirish S40 da (Terraform) ko'rib
> chiqiladi.

## 1. `main` uchun qoidalar

| Sozlama                                        | Qiymat | Nega                                                                         |
| ---------------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| Require a pull request before merging          | yoniq  | To'g'ridan-to'g'ri push tekshiruvlarni chetlab o'tadi                        |
| Require approvals                              | 1      | Yolg'iz ishlanayotgan davrda 0 ga tushirish mumkin, lekin jamoa kengaysa — 1 |
| Dismiss stale approvals on new commits         | yoniq  | Tasdiqlangandan keyin qo'shilgan kod ko'rilmay qolmasligi uchun              |
| Require status checks to pass                  | yoniq  | Qizil CI bilan merge qilish mumkin bo'lmasligi kerak                         |
| Require branches to be up to date before merge | yoniq  | Alohida-alohida yashil bo'lgan ikki PR birga qizil bo'lishi mumkin           |
| Require conversation resolution                | yoniq  | Ochiq izoh e'tiborsiz qolmasligi uchun                                       |
| Require linear history                         | yoniq  | Tarix o'qishga qulay bo'ladi                                                 |
| Block force pushes                             | yoniq  | Merge qilingan tarixni qayta yozib bo'lmaydi                                 |
| Restrict deletions                             | yoniq  | `main` tasodifan o'chib ketmasligi uchun                                     |

### Majburiy status check'lar

CI ishga tushgandan keyin ro'yxatdan tanlanadi:

- `Lint, typecheck, test, build`
- `Docker image`

## 2. Branch nomlash

```
step/S05-ci-docker      bitta ROADMAP qadami
fix/<qisqa-tavsif>      xato tuzatish
chore/<qisqa-tavsif>    infratuzilma, hujjat
```

`ROADMAP.md` §0: **bitta qadam = bitta branch = bitta PR**.

## 3. Sirlar

CI'da ishlatiladigan qiymatlar **test uchun** va workflow faylida ochiq
turadi — ular hech qanday haqiqiy tizimga kirish bermaydi.

Haqiqiy sirlar faqat deploy workflow'ida, GitHub Secrets orqali:

| Nomi                  | Turi   | Izoh                       |
| --------------------- | ------ | -------------------------- |
| `AWS_DEPLOY_ROLE_ARN` | secret | OIDC orqali olinadigan rol |
| `AWS_REGION`          | var    | masalan `eu-central-1`     |
| `ECR_REPOSITORY`      | var    | tasvir repozitoriyasi nomi |
| `ECS_CLUSTER`         | var    | klaster nomi               |
| `ECS_SERVICE`         | var    | servis nomi                |

**Uzoq muddatli AWS kalitlari (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`)
saqlanmaydi.** Ular o'g'irlansa muddatsiz amal qilardi; OIDC esa har ishga
tushishda qisqa muddatli sertifikat beradi.

Ilova sirlari (`JWT_*`, `DATABASE_URL`, S3 kalitlari) GitHub'da emas, **AWS
Secrets Manager**'da saqlanadi va ECS task definition orqali konteynerga
beriladi (CLAUDE.md §12). Shu sababli ular tasvir qatlamiga ham,
workflow logiga ham tushmaydi.

## 4. Deploy

`deploy-staging.yml` faqat qo'lda chaqiriladi va tasdiq so'raydi. Sozlamalar
to'liq bo'lmasa — birinchi qadamda to'xtaydi, ya'ni yarim sozlangan holatda
deploy boshlanmaydi.

Production uchun alohida workflow S40 da qo'shiladi.

### Migratsiyalar haqida

Migratsiya yangi tasvir ishga tushishidan **oldin** qo'llanadi. Shuning uchun
har bir migratsiya **orqaga mos** bo'lishi shart: eski task'lar hali ishlab
turgan paytda yangi sxema ularni buzmasligi kerak.

Mos kelmaydigan o'zgarishlar (ustun o'chirish, nom o'zgartirish) ikki
bosqichda bajariladi:

1. Kod yangi holatga o'tadi, eski ustun hali joyida turadi → deploy.
2. Eski ustun keyingi relizda o'chiriladi → deploy.
