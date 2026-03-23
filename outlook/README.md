# Balıkçı Outlook Integration Spike

This folder contains the first Outlook/VBA integration step for the Balıkçı MVP.

## Goal

Read the currently selected Outlook mail item, export the fields required by the local analyzer, run the analyzer automatically, and show the result to the user.

## Current Output

The VBA module writes these files:

```text
C:\Users\stajyer_it1\Desktop\phish\outlook\last_selected_mail.json
C:\Users\stajyer_it1\Desktop\phish\outlook\last_analysis_result.json
```

## Files

- `vba_integration/ExportSelectedMail.bas`
- `panel_manual_setup.md`

## How To Try It

1. Open Outlook.
2. Press `Alt + F11` to open the VBA editor.
3. Import `ExportSelectedMail.bas` into the Outlook VBA project.
4. Select an email in Outlook.
5. Run `ExportCurrentSelectedMail`.
6. Confirm that both output files were created.

## Exported Fields

- `subject`
- `sender_name`
- `sender_email`
- `sender_domain`
- `body_text`
- `body_html`
- `attachments`

## What Happens Now

When `ExportCurrentSelectedMail` runs:

1. Outlook exports the selected mail to `last_selected_mail.json`
2. VBA calls the local Python analyzer
3. The analyzer writes `last_analysis_result.json`
4. Outlook shows the current stable summary popup

## Next Step

The next integration step can replace the popup with a richer form or side panel UI. See `panel_manual_setup.md`.
