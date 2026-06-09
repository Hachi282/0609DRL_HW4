import os
import subprocess
import markdown

def convert_md_to_pdf():
    md_file = "report.md"
    html_file = "temp_report.html"
    pdf_file = "report.pdf"

    if not os.path.exists(md_file):
        print(f"Error: {md_file} not found!")
        return

    # 1. 讀取 Markdown 內容
    with open(md_file, "r", encoding="utf-8") as f:
        text = f.read()

    # 2. 將 Markdown 轉成 HTML (啟用表格與程式碼擴充)
    html_content = markdown.markdown(text, extensions=['tables', 'fenced_code'])

    # 3. 準備高品質 PDF 列印 CSS 樣式
    html_wrapper = f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <title>AI Harness 系統設計與分析報告</title>
    <style>
        @page {{
            size: A4;
            margin: 20mm 15mm 20mm 15mm;
        }}
        body {{
            font-family: "Microsoft JhengHei", "Segoe UI", sans-serif;
            color: #1f2937;
            line-height: 1.6;
            font-size: 11pt;
            background: #ffffff;
        }}
        h1, h2, h3, h4 {{
            font-family: "Microsoft JhengHei", "Segoe UI", sans-serif;
            color: #1e3a8a;
            font-weight: bold;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            page-break-after: avoid;
        }}
        h1 {{
            font-size: 22pt;
            text-align: center;
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 10px;
            margin-top: 0;
            margin-bottom: 1.5em;
        }}
        h2 {{
            font-size: 15pt;
            border-bottom: 1px solid #d1d5db;
            padding-bottom: 5px;
            margin-top: 2em;
        }}
        h3 {{
            font-size: 12pt;
        }}
        p {{
            margin-top: 0;
            margin-bottom: 1em;
            text-align: justify;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 1.5em 0;
            page-break-inside: avoid;
        }}
        th, td {{
            border: 1px solid #9ca3af;
            padding: 8px 12px;
            font-size: 10pt;
            text-align: left;
        }}
        th {{
            background-color: #f3f4f6;
            font-weight: bold;
            color: #111827;
        }}
        tr:nth-child(even) {{
            background-color: #f9fafb;
        }}
        code {{
            font-family: Consolas, "Courier New", monospace;
            background-color: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9.5pt;
            color: #b91c1c;
        }}
        pre {{
            background-color: #f3f4f6;
            border: 1px solid #e5e7eb;
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 1.5em 0;
            page-break-inside: avoid;
        }}
        pre code {{
            padding: 0;
            background-color: transparent;
            color: #1f2937;
            font-size: 9pt;
        }}
        blockquote {{
            border-left: 4px solid #3b82f6;
            padding-left: 12px;
            margin: 1.5em 0;
            color: #4b5563;
            font-style: italic;
            background-color: #eff6ff;
            padding: 8px 12px;
            border-radius: 0 6px 6px 0;
        }}
        ul, ol {{
            margin-bottom: 1em;
            padding-left: 20px;
        }}
        li {{
            margin-bottom: 0.25em;
        }}
        hr {{
            border: 0;
            border-top: 1px solid #d1d5db;
            margin: 2em 0;
        }}
    </style>
</head>
<body>
    {html_content}
</body>
</html>
"""

    # 4. 寫入暫存 HTML 檔案
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(html_wrapper)

    print(f"HTML intermediate file generated: {html_file}")

    # 5. 定義 Windows 系統中 Microsoft Edge 的預設安裝路徑
    edge_paths = [
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    ]

    edge_bin = None
    for path in edge_paths:
        if os.path.exists(path):
            edge_bin = path
            break

    if not edge_bin:
        print("Error: Microsoft Edge binary not found in standard installation paths!")
        return

    # 6. 調用 Edge 以無頭模式列印 HTML 為 PDF
    # 使用絕對路徑避免路徑解析錯誤
    abs_html = os.path.abspath(html_file)
    abs_pdf = os.path.abspath(pdf_file)

    cmd = [
        edge_bin,
        "--headless",
        "--disable-gpu",
        f"--print-to-pdf={abs_pdf}",
        abs_html
    ]

    print(f"Running command to print PDF using Edge: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print("PDF printed successfully!")
    except subprocess.CalledProcessError as e:
        print(f"Error executing Edge: {e}")
        print(f"Stdout: {e.stdout}")
        print(f"Stderr: {e.stderr}")
        return

    # 7. 清理暫存檔案
    if os.path.exists(html_file):
        os.remove(html_file)
        print("Cleaned up temporary HTML file.")

if __name__ == "__main__":
    convert_md_to_pdf()
