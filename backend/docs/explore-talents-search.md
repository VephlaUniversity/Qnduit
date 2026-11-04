# Authenticated Explore Talents filters (EN500B)

The existing `GET /api/gen/search?userType=talent` handler accepts optional scalar `skill` and `category` strings (maximum 200 characters after trimming). Missing, empty or whitespace-only values disable that filter. Repeated/non-string values or values longer than 200 characters return 400. These parameters do not change the mixed search branch without `userType=talent`, the header's unfiltered suggestions, or public discovery.

- **Skill:** one exact value in `Talent.tags` (the profile editor's Skills field) OR `Resume.skills[].title` for that Talent. Resume duplicates do not duplicate Talent results. A missing/empty source does not match, but another source can. Resume percentages are irrelevant.
- **Category:** one exact member of `Talent.categories`.
- Comparisons ignore case and surrounding whitespace, consistent with saved profile values being trimmed and existing qualification matching. Internal whitespace, punctuation, accents and spelling remain literal. No alias expansion, substring matching, stemming, comma splitting or regular-expression syntax. `C++` matches `C++`; `UX` does not match `UX Research`; `UX  Research` does not match `UX Research`.
- Skill AND category AND keyword/location/experience/qualification/optional age filters must match. Name/title keyword search retains its existing broader fields and substring behavior.
- Portfolio project skills are project metadata and do not participate. There is no top-level `Talent.skills` schema field; profile Skills are stored as tags. This change does not modify Resume persistence or dates.

Category is applied to the Talent query before pagination. With a skill filter, a limited Resume lookup and tag condition run before one aggregation facet computes both the total and sorted/paginated results. This avoids a potentially unbounded Resume-to-Talent ID list. Without a skill filter, the existing find/count path remains in use. The visibility rule is unchanged: `showProfile: show`, verified, account status not suspended; public subscription eligibility is not required. Matching fields are not added to the response: the existing explicit Talent projection is preserved, with the derived badge. The lookup only projects matching Resume IDs internally, and never returns Resume/CV/private fields. Existing search email fields are unchanged.

All regex input is escaped and anchored for these new filters. The UI/URL uses `skill` and `category`; any filter change resets page to 1. Reset clears both. Existing profile links carry the complete URL filter context. The request ownership key includes both filters, retaining cancellation and Employer/token scoping.

A skill lookup adds work for eligible Talent candidates. Review query plans/index coverage (particularly `Resume.talent`) against representative local data before a large-scale rollout. No indexes are created or changed by this feature.

## Synthetic checks

Run `QNDUIT_EN500B_LOCAL_TEST=1 node --test backend/tests/exploreTalents.local.test.js` with a dedicated loopback MongoDB on port 27946. The suite uses a uniquely named `qnduit_en500b_test_*` database, real handlers and isolated fixtures, then removes only that test database.

Expected manual results in the Step 2 fixture:

| Filters | Expected |
| --- | --- |
| Skill `UX Research`, category `Design` | Ada Okafor, Maya Chen (2) |
| Skill `Figma` | Ada Okafor via Resume, Maya Chen via tags (2) |
| Skill `React`, category `Technology` | Tunde Bello (1) |
| Skill `C++` | Ada Okafor, Tunde Bello (2) |
| Category `R&D [Labs]` | Ada Okafor (1) |
| Skill `Research`, category `Research` | Sample Talent 1–7 (7; 6 on page 1, 1 on page 2) |
| Skill `UX Research`, category `Design`, location `Canada`, experience `3–5 years`, qualification `Master Degree` | Maya Chen (1) |
| Skill `UX`, `.*`, or `UX  Research` | No results |
| Reset | 15 visible Talents, including profiles with missing/empty skills or no Resume |

Leading/trailing spaces and case changes preserve the expected matches. Hidden, suspended and unverified fixtures carry matching skills/categories but must not appear.
