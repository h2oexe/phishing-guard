Attribute VB_Name = "ExportSelectedMail"
Option Explicit

Private Const PHISHGUARD_CATEGORY_COLOR_RED As Long = 1
Private Const PHISHGUARD_CATEGORY_COLOR_ORANGE As Long = 2
Private Const PHISHGUARD_CATEGORY_COLOR_GREEN As Long = 5
Private Const PHISHGUARD_CATEGORY_COLOR_SAFE As Long = 9

Private mLastAnalyzedKey As String
Private mLastAnalyzedAt As Date

Public Sub ExportCurrentSelectedMail()
    On Error GoTo HandleError

    Dim currentMail As Outlook.MailItem
    Set currentMail = GetSelectedMailItem()

    If currentMail Is Nothing Then
        MsgBox "Lutfen once bir e-posta secin.", vbExclamation, "PhishGuard"
        Exit Sub
    End If

    AnalyzeMailItem currentMail, True
    Exit Sub

HandleError:
    MsgBox "Mail disa aktarilirken hata olustu: " & Err.Description, vbCritical, "PhishGuard"
End Sub

Public Sub AnalyzeCurrentSelectedMailSilent()
    On Error Resume Next

    Dim currentMail As Outlook.MailItem
    Set currentMail = GetSelectedMailItem()
    If currentMail Is Nothing Then Exit Sub
    If Not ShouldAnalyzeMail(currentMail) Then Exit Sub

    AnalyzeMailItem currentMail, False, True
End Sub

Public Sub AnalyzeMailItem(ByVal mailItem As Outlook.MailItem, Optional ByVal showPopup As Boolean = False, Optional ByVal updateRiskMarker As Boolean = True)
    On Error GoTo HandleError

    If mailItem Is Nothing Then Exit Sub

    Dim jsonPayload As String
    jsonPayload = BuildMailJson(mailItem)

    WriteTextFile GetExportPath(), jsonPayload
    RunAnalyzer

    If updateRiskMarker Then
        ApplyRiskCategoryToMail mailItem
    End If

    If showPopup Then
        ShowAnalysisSummary
    End If
    Exit Sub

HandleError:
    If showPopup Then
        MsgBox "Mail disa aktarilirken hata olustu: " & Err.Description, vbCritical, "PhishGuard"
    End If
End Sub

Public Function ShouldAnalyzeMail(ByVal mailItem As Outlook.MailItem) As Boolean
    Dim currentKey As String
    currentKey = BuildMailIdentityKey(mailItem)

    If Len(currentKey) = 0 Then
        ShouldAnalyzeMail = True
        Exit Function
    End If

    If currentKey = mLastAnalyzedKey Then
        If DateDiff("s", mLastAnalyzedAt, Now) < 3 Then
            ShouldAnalyzeMail = False
            Exit Function
        End If
    End If

    mLastAnalyzedKey = currentKey
    mLastAnalyzedAt = Now
    ShouldAnalyzeMail = True
End Function

Private Function GetSelectedMailItem() As Outlook.MailItem
    Dim explorerSelection As Outlook.Selection
    Set explorerSelection = Application.ActiveExplorer.Selection

    If explorerSelection Is Nothing Then Exit Function
    If explorerSelection.Count = 0 Then Exit Function
    If TypeName(explorerSelection.Item(1)) <> "MailItem" Then Exit Function

    Set GetSelectedMailItem = explorerSelection.Item(1)
End Function

Private Function BuildMailJson(ByVal mailItem As Outlook.MailItem) As String
    Dim senderEmail As String
    senderEmail = GetSenderEmailAddress(mailItem)

    Dim senderDomain As String
    senderDomain = GetDomainFromEmail(senderEmail)

    Dim transportHeaders As String
    transportHeaders = GetTransportHeaders(mailItem)

    Dim attachmentJson As String
    attachmentJson = BuildAttachmentsJson(mailItem)

    Dim payload As String
    payload = "{"
    payload = payload & vbCrLf & "  ""subject"": """ & JsonEscape(mailItem.Subject) & ""","
    payload = payload & vbCrLf & "  ""sender_name"": """ & JsonEscape(mailItem.SenderName) & ""","
    payload = payload & vbCrLf & "  ""sender_email"": """ & JsonEscape(senderEmail) & ""","
    payload = payload & vbCrLf & "  ""sender_domain"": """ & JsonEscape(senderDomain) & ""","
    payload = payload & vbCrLf & "  ""body_text"": """ & JsonEscape(mailItem.Body) & ""","
    payload = payload & vbCrLf & "  ""body_html"": """ & JsonEscape(mailItem.HTMLBody) & ""","
    payload = payload & vbCrLf & "  ""transport_headers"": """ & JsonEscape(transportHeaders) & ""","
    payload = payload & vbCrLf & "  ""attachments"": " & attachmentJson
    payload = payload & vbCrLf & "}"

    BuildMailJson = payload
End Function

Private Function GetTransportHeaders(ByVal mailItem As Outlook.MailItem) As String
    Const PR_TRANSPORT_MESSAGE_HEADERS_UNICODE As String = "http://schemas.microsoft.com/mapi/proptag/0x007D001F"
    Const PR_TRANSPORT_MESSAGE_HEADERS_ANSI As String = "http://schemas.microsoft.com/mapi/proptag/0x007D001E"

    On Error Resume Next

    GetTransportHeaders = mailItem.PropertyAccessor.GetProperty(PR_TRANSPORT_MESSAGE_HEADERS_UNICODE)
    If Err.Number <> 0 Then
        Err.Clear
        GetTransportHeaders = mailItem.PropertyAccessor.GetProperty(PR_TRANSPORT_MESSAGE_HEADERS_ANSI)
    End If
    If Err.Number <> 0 Then
        Err.Clear
        GetTransportHeaders = ""
    End If

    On Error GoTo 0
End Function

Private Function BuildAttachmentsJson(ByVal mailItem As Outlook.MailItem) As String
    Dim result As String
    result = "["

    Dim i As Long
    For i = 1 To mailItem.Attachments.Count
        If i > 1 Then result = result & ", "
        result = result & """" & JsonEscape(mailItem.Attachments.Item(i).FileName) & """"
    Next i

    result = result & "]"
    BuildAttachmentsJson = result
End Function

Private Function GetSenderEmailAddress(ByVal mailItem As Outlook.MailItem) As String
    On Error Resume Next

    If mailItem.SenderEmailType = "EX" Then
        Dim exchUser As Outlook.ExchangeUser
        Set exchUser = mailItem.Sender.GetExchangeUser
        If Not exchUser Is Nothing Then
            GetSenderEmailAddress = exchUser.PrimarySmtpAddress
            Exit Function
        End If
    End If

    GetSenderEmailAddress = mailItem.SenderEmailAddress
End Function

Private Function GetDomainFromEmail(ByVal emailAddress As String) As String
    Dim atPos As Long
    atPos = InStr(1, emailAddress, "@")

    If atPos <= 0 Then
        GetDomainFromEmail = ""
        Exit Function
    End If

    GetDomainFromEmail = LCase$(Mid$(emailAddress, atPos + 1))
End Function

Private Function JsonEscape(ByVal value As String) As String
    Dim result As String
    result = value
    result = Replace(result, "\", "\\")
    result = Replace(result, Chr$(34), Chr$(92) & Chr$(34))
    result = Replace(result, vbCrLf, "\n")
    result = Replace(result, vbCr, "\n")
    result = Replace(result, vbLf, "\n")
    result = Replace(result, vbTab, "\t")
    JsonEscape = result
End Function

Private Sub WriteTextFile(ByVal targetPath As String, ByVal content As String)
    Dim fileNumber As Integer
    fileNumber = FreeFile

    Open targetPath For Output As #fileNumber
    Print #fileNumber, content
    Close #fileNumber
End Sub

Private Sub RunAnalyzer()
    Dim shellObject As Object
    Set shellObject = CreateObject("WScript.Shell")

    Dim commandText As String
    commandText = BuildPythonCommand(GetAnalyzerScriptPath())

    Dim exitCode As Long
    exitCode = shellObject.Run(commandText, 0, True)

    If exitCode <> 0 Then
        Err.Raise vbObjectError + 1000, "PhishGuard", "Python analyzer calistirilamadi. Cikis kodu: " & exitCode
    End If
End Sub

Public Sub ShowAnalysisSummary()
    Dim jsonContent As String
    jsonContent = ReadTextFile(GetResultPath())

    Dim levelText As String
    levelText = ExtractJsonString(jsonContent, "level")

    Dim summaryText As String
    summaryText = ExtractJsonString(jsonContent, "summary")

    Dim scoreText As String
    scoreText = ExtractJsonNumber(jsonContent, "score")

    Dim reasonsText As String
    reasonsText = ExtractReasons(jsonContent)

    Dim matchedRuleCount As String
    matchedRuleCount = CStr(CountJsonArrayItems(jsonContent, "matched_rules"))

    Dim messageText As String
    messageText = "Analiz tamamlandi." & vbCrLf & vbCrLf & _
                  "Risk Seviyesi: " & levelText & vbCrLf & _
                  "Skor: " & scoreText & "/100" & vbCrLf & _
                  "Ozet: " & summaryText & vbCrLf & _
                  "Eslesen Kural Sayisi: " & matchedRuleCount

    If Len(reasonsText) > 0 Then
        messageText = messageText & vbCrLf & vbCrLf & "Nedenler:" & vbCrLf & reasonsText
    Else
        messageText = messageText & vbCrLf & vbCrLf & "Nedenler:" & vbCrLf & "- Belirgin bir risk sinyali bulunmadi"
    End If

    MsgBox messageText, vbInformation, "PhishGuard Sonucu"
End Sub

Public Function ReadTextFile(ByVal targetPath As String) As String
    Dim fileNumber As Integer
    fileNumber = FreeFile

    Open targetPath For Input As #fileNumber
    ReadTextFile = Input$(LOF(fileNumber), fileNumber)
    Close #fileNumber
End Function

Public Function ExtractJsonString(ByVal jsonContent As String, ByVal keyName As String) As String
    Dim keyToken As String
    keyToken = """" & keyName & """: """

    Dim startPos As Long
    startPos = InStr(1, jsonContent, keyToken, vbTextCompare)
    If startPos = 0 Then
        ExtractJsonString = ""
        Exit Function
    End If

    startPos = startPos + Len(keyToken)

    Dim endPos As Long
    endPos = FindJsonStringEnd(jsonContent, startPos)
    If endPos = 0 Then
        ExtractJsonString = ""
        Exit Function
    End If

    ExtractJsonString = JsonUnescape(Mid$(jsonContent, startPos, endPos - startPos))
End Function

Public Function ExtractJsonNumber(ByVal jsonContent As String, ByVal keyName As String) As String
    Dim keyToken As String
    keyToken = """" & keyName & """: "

    Dim startPos As Long
    startPos = InStr(1, jsonContent, keyToken, vbTextCompare)
    If startPos = 0 Then
        ExtractJsonNumber = "0"
        Exit Function
    End If

    startPos = startPos + Len(keyToken)

    Dim endPos As Long
    endPos = startPos
    Do While endPos <= Len(jsonContent)
        Dim currentChar As String
        currentChar = Mid$(jsonContent, endPos, 1)
        If currentChar < "0" Or currentChar > "9" Then Exit Do
        endPos = endPos + 1
    Loop

    ExtractJsonNumber = Mid$(jsonContent, startPos, endPos - startPos)
    If Len(ExtractJsonNumber) = 0 Then ExtractJsonNumber = "0"
End Function

Public Function ExtractReasons(ByVal jsonContent As String) As String
    Dim arrayContent As String
    arrayContent = ExtractJsonArrayContent(jsonContent, "reasons")

    If Len(arrayContent) = 0 Then
        ExtractReasons = ""
        Exit Function
    End If

    Dim outputText As String
    outputText = ""

    Dim startPos As Long
    startPos = 1

    Do
        Dim itemStart As Long
        itemStart = InStr(startPos, arrayContent, """")
        If itemStart = 0 Then Exit Do

        itemStart = itemStart + 1

        Dim itemEnd As Long
        itemEnd = FindJsonStringEnd(arrayContent, itemStart)
        If itemEnd = 0 Then Exit Do

        outputText = outputText & "- " & JsonUnescape(Mid$(arrayContent, itemStart, itemEnd - itemStart)) & vbCrLf
        startPos = itemEnd + 1
    Loop

    ExtractReasons = Trim$(outputText)
End Function

Public Function ExtractJsonArrayContent(ByVal jsonContent As String, ByVal keyName As String) As String
    Dim keyToken As String
    keyToken = """" & keyName & """: ["

    Dim startPos As Long
    startPos = InStr(1, jsonContent, keyToken, vbTextCompare)
    If startPos = 0 Then
        ExtractJsonArrayContent = ""
        Exit Function
    End If

    startPos = startPos + Len(keyToken)

    Dim endPos As Long
    endPos = InStr(startPos, jsonContent, "]")
    If endPos = 0 Then
        ExtractJsonArrayContent = ""
        Exit Function
    End If

    ExtractJsonArrayContent = Mid$(jsonContent, startPos, endPos - startPos)
End Function

Public Function CountJsonArrayItems(ByVal jsonContent As String, ByVal keyName As String) As Long
    Dim arrayContent As String
    arrayContent = ExtractJsonArrayContent(jsonContent, keyName)

    If Len(Trim$(arrayContent)) = 0 Then
        CountJsonArrayItems = 0
        Exit Function
    End If

    Dim countValue As Long
    countValue = 0

    Dim startPos As Long
    startPos = 1

    Do
        Dim itemStart As Long
        itemStart = InStr(startPos, arrayContent, """")
        If itemStart = 0 Then Exit Do

        itemStart = itemStart + 1

        Dim itemEnd As Long
        itemEnd = FindJsonStringEnd(arrayContent, itemStart)
        If itemEnd = 0 Then Exit Do

        countValue = countValue + 1
        startPos = itemEnd + 1
    Loop

    CountJsonArrayItems = countValue
End Function

Public Function JsonUnescape(ByVal value As String) As String
    Dim result As String
    result = value
    result = Replace(result, "\n", vbCrLf)
    result = Replace(result, "\t", vbTab)
    result = Replace(result, Chr$(92) & Chr$(34), Chr$(34))
    result = Replace(result, "\\", "\")
    JsonUnescape = result
End Function

Public Function FindJsonStringEnd(ByVal sourceText As String, ByVal startPos As Long) As Long
    Dim index As Long
    index = startPos

    Do While index <= Len(sourceText)
        If Mid$(sourceText, index, 1) = """" Then
            If index = startPos Then
                FindJsonStringEnd = index
                Exit Function
            End If

            If Mid$(sourceText, index - 1, 1) <> "\" Then
                FindJsonStringEnd = index
                Exit Function
            End If
        End If
        index = index + 1
    Loop

    FindJsonStringEnd = 0
End Function

Private Function BuildMailIdentityKey(ByVal mailItem As Outlook.MailItem) As String
    If mailItem Is Nothing Then Exit Function

    If Len(Trim$(mailItem.EntryID)) > 0 Then
        BuildMailIdentityKey = mailItem.EntryID
        Exit Function
    End If

    BuildMailIdentityKey = LCase$(Trim$(mailItem.Subject)) & "|" & LCase$(Trim$(GetSenderEmailAddress(mailItem)))
End Function

Private Sub ApplyRiskCategoryToMail(ByVal mailItem As Outlook.MailItem)
    On Error Resume Next

    Dim jsonContent As String
    jsonContent = ReadTextFile(GetResultPath())

    Dim levelText As String
    levelText = ExtractJsonString(jsonContent, "level")

    Dim scoreValue As Long
    scoreValue = CLng(Val(ExtractJsonNumber(jsonContent, "score")))

    Dim targetCategory As String
    targetCategory = BuildRiskCategoryName(levelText, scoreValue)
    If Len(targetCategory) = 0 Then Exit Sub

    EnsureRiskCategoriesExist

    Dim currentCategories As String
    currentCategories = RemovePhishGuardCategories(mailItem.Categories)

    Dim nextCategories As String
    nextCategories = AppendCategory(currentCategories, targetCategory)

    If Trim$(mailItem.Categories) <> Trim$(nextCategories) Then
        mailItem.Categories = nextCategories
        mailItem.Save
    End If
End Sub

Private Function BuildRiskCategoryName(ByVal levelText As String, ByVal scoreValue As Long) As String
    Dim normalizedLevel As String
    normalizedLevel = LCase$(Trim$(levelText))

    If scoreValue <= 0 Then
        BuildRiskCategoryName = GetSafeCategoryName()
        Exit Function
    End If

    If InStr(1, normalizedLevel, "yuksek", vbTextCompare) > 0 Or InStr(1, normalizedLevel, "yüksek", vbTextCompare) > 0 Or InStr(1, normalizedLevel, "high", vbTextCompare) > 0 Then
        BuildRiskCategoryName = GetHighRiskCategoryName()
        Exit Function
    End If

    If InStr(1, normalizedLevel, "orta", vbTextCompare) > 0 Or InStr(1, normalizedLevel, "medium", vbTextCompare) > 0 Then
        BuildRiskCategoryName = GetMediumRiskCategoryName()
        Exit Function
    End If

    If Len(normalizedLevel) > 0 Then
        BuildRiskCategoryName = GetLowRiskCategoryName()
    End If
End Function

Private Sub EnsureRiskCategoriesExist()
    EnsureCategoryExists GetSafeCategoryName(), PHISHGUARD_CATEGORY_COLOR_SAFE
    EnsureCategoryExists GetLowRiskCategoryName(), PHISHGUARD_CATEGORY_COLOR_GREEN
    EnsureCategoryExists GetMediumRiskCategoryName(), PHISHGUARD_CATEGORY_COLOR_ORANGE
    EnsureCategoryExists GetHighRiskCategoryName(), PHISHGUARD_CATEGORY_COLOR_RED
End Sub

Private Sub EnsureCategoryExists(ByVal categoryName As String, ByVal categoryColor As Long)
    Dim categoryItem As Object

    For Each categoryItem In Application.Session.Categories
        If StrComp(categoryItem.Name, categoryName, vbTextCompare) = 0 Then
            On Error Resume Next
            categoryItem.Color = categoryColor
            Exit Sub
        End If
    Next categoryItem

    Application.Session.Categories.Add categoryName, categoryColor
End Sub

Private Function RemovePhishGuardCategories(ByVal categoriesText As String) As String
    Dim cleaned As String
    cleaned = ""

    If Len(Trim$(categoriesText)) = 0 Then
        RemovePhishGuardCategories = cleaned
        Exit Function
    End If

    Dim parts() As String
    parts = Split(categoriesText, ",")

    Dim i As Long
    For i = LBound(parts) To UBound(parts)
        Dim currentCategory As String
        currentCategory = Trim$(parts(i))

        If Len(currentCategory) = 0 Then
            GoTo ContinueLoop
        End If

        If InStr(1, currentCategory, "PhishGuard", vbTextCompare) > 0 Then
            GoTo ContinueLoop
        End If

        cleaned = AppendCategory(cleaned, currentCategory)
ContinueLoop:
    Next i

    RemovePhishGuardCategories = cleaned
End Function

Private Function AppendCategory(ByVal currentCategories As String, ByVal categoryName As String) As String
    If Len(Trim$(categoryName)) = 0 Then
        AppendCategory = Trim$(currentCategories)
        Exit Function
    End If

    If Len(Trim$(currentCategories)) = 0 Then
        AppendCategory = categoryName
    Else
        AppendCategory = Trim$(currentCategories) & ", " & categoryName
    End If
End Function

Private Function GetSafeCategoryName() As String
    GetSafeCategoryName = "PhishGuard - G" & ChrW$(252) & "vendesiniz"
End Function

Private Function GetLowRiskCategoryName() As String
    GetLowRiskCategoryName = "PhishGuard - D" & ChrW$(252) & ChrW$(351) & ChrW$(252) & "k Risk"
End Function

Private Function GetMediumRiskCategoryName() As String
    GetMediumRiskCategoryName = "PhishGuard - Orta Risk"
End Function

Private Function GetHighRiskCategoryName() As String
    GetHighRiskCategoryName = "PhishGuard - Y" & ChrW$(252) & "ksek Risk"
End Function

Private Function GetRepoRoot() As String
    Dim configuredRoot As String
    configuredRoot = Trim$(Environ$("PHISHGUARD_ROOT"))
    If Len(configuredRoot) = 0 Then configuredRoot = Trim$(Environ$("BALIKCI_ROOT"))

    If Len(configuredRoot) > 0 Then
        GetRepoRoot = configuredRoot
        Exit Function
    End If

    GetRepoRoot = CreateObject("WScript.Shell").ExpandEnvironmentStrings("%USERPROFILE%") & "\Desktop\phish"
End Function

Private Function GetExportPath() As String
    GetExportPath = GetRepoRoot() & "\outlook\last_selected_mail.json"
End Function

Private Function GetResultPath() As String
    GetResultPath = GetRepoRoot() & "\outlook\last_analysis_result.json"
End Function

Private Function GetAnalyzerScriptPath() As String
    GetAnalyzerScriptPath = GetRepoRoot() & "\analyze_outlook_export.py"
End Function

Private Function BuildPythonCommand(ByVal scriptPath As String) As String
    Dim configuredPython As String
    configuredPython = Trim$(Environ$("PHISHGUARD_PYTHON"))
    If Len(configuredPython) = 0 Then configuredPython = Trim$(Environ$("BALIKCI_PYTHON"))

    If Len(configuredPython) > 0 Then
        BuildPythonCommand = "cmd /c " & """" & configuredPython & """" & " " & """" & scriptPath & """"
        Exit Function
    End If

    BuildPythonCommand = "cmd /c py -3 " & """" & scriptPath & """"
End Function
