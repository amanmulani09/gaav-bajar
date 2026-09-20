# Maharashtra location snapshot

Source: Maharashtra Revenue Department, Common Village Master.
Retrieved 2026-09-20 using these public POST endpoints:

- https://mahavillages.mahabhumi.gov.in/API/GetAllDistricts
- https://mahavillages.mahabhumi.gov.in/API/GetAllTalukas
- API documentation: https://mahavillages.mahabhumi.gov.in/pdf/LGD%20WebServices.pdf

Bundled 36 districts and 358 talukas with government LGD codes and local names. Includes current names Ahilyanagar, Dharashiv, and Chhatrapati Sambhajinagar. Mumbai City has no taluka in this source; the UI skips that field. Place names remain Marathi proper nouns in either interface language. No runtime government API dependency.

When updating, change both the bundled JSON and the database location migration (use a new migration for an already deployed database). Validate district/taluka relationships and preserve stable LGD IDs.
