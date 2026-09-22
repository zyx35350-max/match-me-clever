# Match Me Clever — Project Status

> Last updated: 2026-09-22

## 1. Current Goal

Match Me Clever is a personal AI job-search assistant.

Core principle:
- Help the user understand real job postings and compare them with their career profile.
- Preserve original job wording.
- Separate Facts / Evidence / Inference.
- Do not invent missing job information.
- Keep the existing Career Engine as the single authoritative scoring engine.

## 2. Current Development Stage

V1.2 foundation is implemented and currently in real-job testing.

The project has moved from mock-job-only development to a first real-job import flow.

Current flow:

Real Job Text → User Import → Raw Job → Dedup/Lifecycle → Job Adapter → Job Understanding → Existing Career Engine → Matching

## 3. Completed

### V1.1.5 — Job Understanding
- Language detection: zh / en / mixed / unknown
- Original-source-only language detection
- Lightweight deterministic heuristic
- Chinese JD abbreviation handling (AI/UI/UX/PS/HR/CEO/SEO/SKU etc.)
- Semantic extraction
- Concept normalization
- English requirement signals
- International signals
- Integration with the existing Career Engine
- Acceptance fixtures and CI workflow

Important rule:
- English not mentioned is treated as unknown, not false.

### V1.2 — Source Layer
- User import, company site, job board, aggregator, API, licensed feed, and other source types
- Explicit access policies
- No unauthorized scraping or assumed API access

### V1.2.2 — Deduplication & Lifecycle
- Lifecycle: discovered / active / stale / closed / expired
- Deterministic deduplication
- Matching by external ID, normalized URL, content hash, then normalized title + description
- Discovery pipeline
- Acceptance tests and CI

### V1.2.3 — Raw Job Adapter
- RawJob to existing Job adapter
- Original raw record preservation
- Lifecycle information
- Missing-data warnings
- Existing Career Engine remains authoritative
- Discovery adapter connecting source, dedup/lifecycle, and job adapter

### V1.2.4 — User Import
- /import page
- Paste a complete real job posting
- Optional source URL
- Raw job preservation
- Import into the existing matching pipeline
- Local persistence of imported jobs
- Deduplication
- Missing-data warnings
- Acceptance tests and CI

## 4. Current Real-Job Test

A real 51Job-style Chinese posting was tested:

外贸业务销售
- Salary: 5.5千-1.1万
- Location/experience header: 惠州-惠阳区1年及以上中技/中专英语读写熟练招1人
- Requirements include English, foreign-customer email communication, overseas social platforms, foreign trade/sales experience, and market analysis.

The test exposed a limitation in the first import parser:
- It expected more structured/labeled fields.
- It did not correctly parse common compact Chinese recruitment-site headers.
- Imported text was cleared after submission while the page did not clearly expose the parsed result.
- The user therefore saw many missing-data warnings even though the pasted JD contained salary/location/experience information.

## 5. Current Fix

The GitHub implementation has now been updated to better support real Chinese recruitment-site formats.

The import parser now attempts to recognize:
- Salary ranges such as 5.5千-1.1万
- Compact location + experience strings such as 惠州-惠阳区1年及以上...
- Experience requirements such as 1年及以上
- Labeled company/location fields
- Parsed result display after import

The import page now exposes parsed fields including:
- title
- company
- location
- salary
- detected language
- English requirement
- experience
- career direction

A regression/acceptance case was also added for the tested 51Job-style format.

## 6. Current Known Issue / Next Test

The parser fix has been committed to GitHub, but the latest UI/parser changes still need to be verified in the running preview.

Next action:
1. Refresh the current web preview.
2. Open Import Job.
3. Paste the same real 51Job posting again.
4. Click Import & Analyze.
5. Verify the parsed result before adding more functionality.

Do not start a large UI redesign yet.

## 7. Next Development Order

After real-job import works reliably:
1. Test several different real JD formats.
2. Fix deterministic parsing gaps found during testing.
3. Verify matching scores and explanations against real jobs.
4. Improve source/import robustness.
5. Then continue toward real job source integration.
6. Concentrated UI redesign comes after core functionality is stable.

## 8. Important Product Rules

- Do not replace the existing Career Engine with a second scoring system.
- Do not invent salary, company, location, seniority, work mode, employment type, or English requirements.
- Missing data should remain explicitly unknown/missing.
- Original JD wording must remain intact.
- Translation, when added later, must be additive and must not overwrite original text.
- Source access must respect explicit access policies.
- V1.2 source integration must not assume scraping/API access is available.