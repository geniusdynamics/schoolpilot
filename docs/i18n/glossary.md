<!-- ABOUTME: Glossary of the school terms the Kiswahili and French locales use, so a native reviewer can check choices quickly. -->
<!-- ABOUTME: Every translation here is a DRAFT: no native speaker has reviewed it. Corrections go in this table first, then the locale files. -->

# Translation glossary

Status: **draft, not reviewed by a native speaker**. The Kiswahili column follows usage in Kenyan schools as far as
the author knows it; the French column aims at schools in francophone Africa and in France and avoids terms that
only one of the two uses where a neutral one exists. Mark a row `reviewed` in the last column once a native reviewer
has confirmed it.

| English | Kiswahili | French | Note | Status |
| --- | --- | --- | --- | --- |
| Student / Learner | Mwanafunzi (pl. Wanafunzi) | Élève | One word for both: Kenyan CBE material says "learner", ordinary usage says "student". French uses "élève" throughout, not "étudiant", which means a university student. | draft |
| Teacher | Mwalimu (pl. Walimu) | Enseignant | | draft |
| Head teacher / Principal | Mwalimu Mkuu | Direction (Chef d'établissement) | Used by the packs and settings, not yet in the core namespaces. | draft |
| Parent / Guardian | Mzazi / Mlezi | Parent / Tuteur | "Wazazi/walezi" where both are meant. | draft |
| Staff | Wafanyakazi | Personnel | Swahili is literally "workers". | draft |
| Class | Darasa (pl. Madarasa) | Classe | | draft |
| Class group | Kikundi cha darasa | Groupe de classe | Product term for a class in a given academic year. | draft |
| Stream | Mkondo (pl. Mikondo) | Filière | A parallel class within a level. French "filière" is also a track in lycée; "division" is a common alternative in France. | draft |
| Level / Grade / Form | Ngazi | Niveau | "Form 1", "Grade 7" are kept as written. | draft |
| Subject | Somo (pl. Masomo) | Matière | | draft |
| Learning area | Eneo la kujifunza | Domaine d'apprentissage | Used in the CBE pack. | draft |
| Exam | Mtihani (pl. Mitihani) | Examen | | draft |
| Paper (exam) | Karatasi | Épreuve | | draft |
| Marks | Alama | Notes | | draft |
| Results | Matokeo | Résultats | | draft |
| Grading | Upimaji | Notation | | draft |
| Report card | Kadi ya ripoti | Bulletin | | draft |
| Fees | Ada | Frais de scolarité | The short navigation label "Frais" is kept where space is tight. | draft |
| Payments | Malipo | Paiements | | draft |
| Invoice | Ankara | Facture | | draft |
| Receipt | Risiti | Reçu | | draft |
| Votehead | Votehead | Poste budgétaire / Votehead | Kenyan accounting term; kept in English in Kiswahili, older French labels use "poste". | draft |
| Term | Muhula | Trimestre | French schools use trimestre or semestre depending on the country; trimestre is the default here. | draft |
| Academic year | Mwaka wa masomo | Année scolaire | | draft |
| Financial year | Mwaka wa fedha | Exercice financier | | draft |
| Timetable | Ratiba | Emploi du temps | | draft |
| Attendance | Mahudhurio | Présences | | draft |
| Promotion (to the next class) | Kupandisha (madarasa) | Passage en classe supérieure | | draft |
| Alumni | Wahitimu | Anciens élèves | | draft |
| Class council | Baraza la darasa | Conseil de classe | Not in the core namespaces yet; recorded so later namespaces use the same term. | draft |
| Settings | Mipangilio | Paramètres | | draft |
| Configuration | Usanidi | Configuration | Identical in French, on the allowlist. | draft |
| Dashboard | Dashibodi | Tableau de bord | Swahili is a loanword, as used in Kiswahili software. Navigation labels abbreviate it to "TB" in French. | draft |
| Portal | Portal | Portail | Swahili loanword kept as written; the allowlist in `src/i18n/untranslatable.ts` records it. | draft |
| Hub | Kituo | Centre | "Kituo cha Maombi" / "Centre des candidatures" for Applications Hub. | draft |
| Supplier | Muuzaji (pl. Wauzaji) | Fournisseur | | draft |
| Inventory (stock) | Hesabu / Hisa | Inventaire / Stock | | draft |
| Data integrity | Uadilifu wa data | Intégrité des données | | draft |
| Backup | Nakala rudufu | Sauvegarde | The older Kiswahili settings label still says "Backup". | draft |
| Migration (database) | Uhamisho (wa data) | Migration | | draft |
| Password | Neno la siri | Mot de passe | | draft |
| Administrator | Msimamizi | Administrateur | | draft |
| Yes / No | Ndiyo / Hapana | Oui / Non | | draft |

## Rules the locale files follow

- Every `{{placeholder}}` is kept exactly as in English; `src/i18n/completeness.ts` fails the build when one changes.
- Brand names (SchoolPilot) and acronyms (CSV, PDF, KCSE, CBE) stay in English.
- Labels for buttons are kept short; sentences keep the register of the English source.
- A string that is legitimately identical to English is listed with its reason in `src/i18n/untranslatable.ts`.
- French uses the typographic space before `:` and `?`/`!` only where the existing strings already did (the source
  catalogue is not consistent about it); this is left for the reviewer.
