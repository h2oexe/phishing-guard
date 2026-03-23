# Balıkçı Panel Manual Setup

Outlook VBA `UserForm` files are not reliable to generate automatically from this workspace because the form designer uses a paired binary resource. To avoid breaking the working MVP, the repo keeps the stable popup flow and provides this manual panel setup guide.

## Goal

Create a modeless side-style `UserForm` in Outlook VBA that:

- stays open without blocking mail work
- can be closed by the user
- appears near the right side of the Outlook window
- shows score, level, summary, and reasons

## Suggested Form Name

`BalikciPanel`

## Suggested Controls

Add these controls to a new `UserForm`:

- `Label` named `lblBrand`
- `Label` named `lblLevel`
- `Label` named `lblScore`
- `Label` named `lblSummary`
- `Label` named `lblRuleCount`
- `Label` named `lblSectionScore`
- `Label` named `lblSectionReasons`
- `Label` named `lblSectionRuleCount`
- `TextBox` named `txtReasons`
- `CommandButton` named `cmdClose`

Suggested behavior:

- `txtReasons.MultiLine = True`
- `txtReasons.ScrollBars = 2`
- `txtReasons.Locked = True`
- `ShowModal = False`
- `StartUpPosition = 0`

## Panel Code

Paste this into the `BalikciPanel` form code:

```vb
Option Explicit

Private Sub cmdClose_Click()
    Unload Me
End Sub

Public Sub ApplyAnalysis(ByVal levelText As String, ByVal scoreText As String, ByVal summaryText As String, ByVal matchedRuleCount As String, ByVal reasonsText As String)
    lblBrand.Caption = "Balıkçı"
    lblLevel.Caption = levelText
    lblScore.Caption = scoreText & "/100"
    lblSummary.Caption = summaryText
    lblRuleCount.Caption = matchedRuleCount
    lblSectionScore.Caption = "ANALIZ SKORU"
    lblSectionReasons.Caption = "NEDENLER"
    lblSectionRuleCount.Caption = "ESLESEN KURAL"
    cmdClose.Caption = "Kapat"

    If Len(Trim$(reasonsText)) = 0 Then
        txtReasons.Text = "- Belirgin bir risk sinyali bulunmadi"
    Else
        txtReasons.Text = reasonsText
    End If
End Sub
```

## Module Integration

After the form exists, `ExportSelectedMail.bas` can be switched from `ShowAnalysisSummary` to a modeless `ShowAnalysisPanel` helper.

If you want, the next step can be:

1. You create the empty form in Outlook VBA designer.
2. I give you the exact form code and module patch to wire it in.
```
