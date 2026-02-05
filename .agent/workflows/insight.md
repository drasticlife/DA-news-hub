---
description: Analyze news summaries based on corporate strategy and update BOT insights in data.json.
---

# Workflow: /insight

Use this workflow to merge new data and fill the `BOT` columns with strategic interpretations.

## Steps

### 1. Preparation & Smart Merge

- Read the existing `data.json` (Corporate version).
- Read the incoming `data_new.json` (External source).
- **Match & Append**:
  1. Compare items using URLs as unique identifiers.
  2. Add articles from `data_new.json` that don't exist in `data.json`.
  3. **Preserve Content**: Ensure existing values in `BOT` and `BOT_en` fields are never overwritten or cleared.
- Identify "Target Rows": The newly added rows where the `BOT` field is empty.
- Check `/context/A` and `/context/B` for any strategy updates.

### 2. Contextual Search

- For each Target Row:
  1. Read the `Summary`.
  2. Keyword search in `/context/A` (Primary) and `/context/B` (Secondary).

### 3. Insight Generation & Translation

- Formulate a 1-2 sentence "Strategic Insight" in Korean based on internal documents.
- Translate it naturally into English.

### 4. Batch Update

- Update `BOT` (KO) and `BOT_en` (EN) fields for all new rows.
- Save the final combined object back to `data.json`.
- Output summary: "Merged X new items. Processed Y insights. Total database size is Z."

### 5. Validation

- Run a JSON syntax check.
