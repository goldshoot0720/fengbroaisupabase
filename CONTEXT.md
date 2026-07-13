# Project Context

## Bank workflow module

`useBankWorkflow` owns the bank page workflow rules: transaction modal state, batch selection, batch deposit setting/adjustment, previews, validation, and selected deletion.

`BankPage.vue` should stay focused on layout, inline add/edit forms, CSV import/export, and wiring the workflow into the page.

Shared selection state should go through `useSelectionSet` before adding new page-local batch-selection code.
