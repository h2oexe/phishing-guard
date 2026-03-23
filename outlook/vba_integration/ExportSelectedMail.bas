Attribute VB_Name = "ExportSelectedMail"
Option Explicit

' MVP spike:
' - Reads the currently selected Outlook mail item
' - Exports the fields needed by the local analyzer into a JSON file
' - Invokes the local Python analyzer after export

Private Const EXPORT_PATH As String = "C:\Users\stajyer_it1\Desktop\phish\outlook\last_selected_mail.json"
Private Const RESULT_PATH As String = "C:\Users\stajyer_it1\Desktop\phish\outlook\last_analysis_result.json"
Private Const PYTHON_EXE As String = "C:\Users\stajyer_it1\AppData\Local\Programs\Python\Python312\python.exe"
Private Const ANALYZER_SCRIPT As String = "C:\Users\stajyer_it1\Desktop\phish\analyze_outlook_export.py"

Public Sub ExportCurrentSelectedMail()
    On Error GoTo HandleError

    Dim currentMail As Outlook.MailItem
    Set currentMail = GetSelectedMailItem()

    If currentMail Is Nothing Then
        MsgBox "Lutfen once bir e-posta secin.", vbExclamation, "Balıkçı"
        Exit Sub
    End If

    Dim jsonPayload As String
    jsonPayload = BuildMailJson(currentMail)

    WriteTextFile EXPORT_PATH, jsonPayload
    RunAnalyzer
    ShowAnalysisSummary

    Exit Sub

HandleError:
    MsgBox "Mail disa aktarilirken hata olustu: " & Err.Description, vbCritical, "Balıkçı"
End Sub

Private Function GetSelectedMailItem() As Outlook.MailItem
    Dim explorerSelection As Outlook.Selection
    Set explorerSelection = Application.ActiveExplorer.Selection

    If explorerSelection Is Nothing Then
        Exit Function
    End If

    If explorerSelection.Count = 0 Then
        Exit Function
    End If

    If TypeName(explorerSelection.Item(1)) <> "MailItem" Then
        Exit Function
    End If

    Set GetSelectedMailItem = explorerSelection.Item(1)
End Function

Private Function BuildMailJson(ByVal mailItem As Outlook.MailItem) As String
    Dim senderEmail As String
    senderEmail = GetSenderEmailAddress(mailItem)

    Dim senderDomain As String
    senderDomain = GetDomainFromEmail(senderEmail)

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
    payload = payload & vbCrLf & "  ""attachments"": " & attachmentJson
    payload = payload & vbCrLf & "}"

    BuildMailJson = payload
End Function

Private Function BuildAttachmentsJson(ByVal mailItem As Outlook.MailItem) As String
    Dim result As String
    result = "["

    Dim i As Long
    For i = 1 To mailItem.Attachments.Count
        If i > 1 Then
            result = result & ", "
        End If
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
    commandText = """" & PYTHON_EXE & """" & " " & """" & ANALYZER_SCRIPT & """"

    Dim exitCode As Long
    exitCode = shellObject.Run(commandText, 0, True)

    If exitCode <> 0 Then
        Err.Raise vbObjectError + 1000, "Balıkçı", "Python analyzer calistirilamadi. Cikis kodu: " & exitCode
    End If
End Sub

Public Sub ShowAnalysisSummary()
    Dim jsonContent As String
    jsonContent = ReadTextFile(RESULT_PATH)

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

    MsgBox messageText, vbInformation, "Balıkçı Sonucu"
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
        If currentChar < "0" Or currentChar > "9" Then
            Exit Do
        End If
        endPos = endPos + 1
    Loop

    ExtractJsonNumber = Mid$(jsonContent, startPos, endPos - startPos)
    If Len(ExtractJsonNumber) = 0 Then
        ExtractJsonNumber = "0"
    End If
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
        If itemStart = 0 Then
            Exit Do
        End If

        itemStart = itemStart + 1

        Dim itemEnd As Long
        itemEnd = FindJsonStringEnd(arrayContent, itemStart)
        If itemEnd = 0 Then
            Exit Do
        End If

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
        If itemStart = 0 Then
            Exit Do
        End If

        itemStart = itemStart + 1

        Dim itemEnd As Long
        itemEnd = FindJsonStringEnd(arrayContent, itemStart)
        If itemEnd = 0 Then
            Exit Do
        End If

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
