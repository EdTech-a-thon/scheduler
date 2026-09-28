# Wave 1 stores all data locally in the browser

Caseloads contain the names of students on IEPs, which is FERPA-sensitive. Wave 1 therefore has no server and no accounts, and all data stays in the Provider's browser storage. That keeps us out of hosting student data until we deliberately design for it. The cost: no multi-device use or sharing, and data is lost if the browser storage is cleared. Moving to a hosted backend later will need a migration path out of local storage.
