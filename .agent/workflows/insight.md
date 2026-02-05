---
description: Analyze news summaries based on corporate strategy and update BOT insights in data.json.
---

# Workflow: /insight

Use this workflow to automatically fill the `BOT` column in `data.json` with strategic interpretations based on internal knowledge.

## Steps

### 1. Preparation & Scanning

- Read `data.json`.
- Identify "Target Rows": Rows where the `BOT` (or `Bot`) field is empty or null.
- Check `/context/A` and `/context/B` for any new updates since the last run.

### 2. Contextual Search

- For each Target Row:
  1. Read the `Summary` field.
  2. Use `grep_search` to find related keywords in `/context/A` (Primary) and `/context/B` (Secondary).
  3. Synthesize how the news affects current internal projects or strategy.

### 3. Insight Generation & Translation

- Formulate a 1-2 sentence "Strategic Insight" in Korean.
- Translate the insight into English (natural translation).
- Focus on: "What does this mean for our procurement/development strategy?"
- Use the persona defined in `instructions.md`.

### 4. Batch Update

- Update both `BOT` (Korean) and `BOT_en` (English) fields in the JSON object for all processed rows.
- Write the updated object back to `data.json`.
- Output a summary: "Processed X new items (KO & EN). Used documents: [list of key docs found]."

### 5. Validation

- Run a JSON syntax check to ensure no corruption occurred.
