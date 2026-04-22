const createFilesLib = require("../lib.js");
const { applyBranding } = require("./utils.js");

// Typst preamble that mirrors the DOCX "corporate" theme (FD brand palette).
// Prepended to the markdown before calling mdpdf.markdownToPdf. If mdpdf
// passes raw #directives through to the underlying Typst compiler (Path A
// from the styling options), these rules take effect. If they do not, these
// lines will render as literal text in the output — that's the signal to
// switch to Path B (separate Typst binding using markdownToTypstCode).
const CORPORATE_TYPST_PREAMBLE = `
#set page(paper: "a4", margin: (x: 2cm, y: 2.5cm))
#set text(font: "Calibri", size: 11pt, fill: rgb("#2C3E50"))
#set par(justify: true, leading: 0.7em)

#show heading.where(level: 1): it => {
  set text(font: "Century Gothic", size: 22pt, fill: rgb("#0D5387"), weight: "bold")
  it
  v(0.2em)
  line(length: 100%, stroke: 0.5pt + rgb("#0D5387"))
}

#show heading.where(level: 2): it => {
  set text(font: "Century Gothic", size: 16pt, fill: rgb("#002060"), weight: "bold")
  it
}

#show heading.where(level: 3): it => {
  set text(font: "Century Gothic", size: 13pt, fill: rgb("#002060"), weight: "bold")
  it
}

#show link: it => text(fill: rgb("#0D5387"))[#underline[#it]]
`;

module.exports.CreatePdfFile = {
  name: "create-pdf-file",
  plugin: function () {
    return {
      name: "create-pdf-file",
      setup(aibitat) {
        aibitat.function({
          super: aibitat,
          name: this.name,
          description:
            "Create a PDF document from markdown or plain text content. " +
            "The content will be styled and converted to a professional PDF document. " +
            "Supports markdown formatting including headers, lists, code blocks, tables, and more.",
          examples: [
            {
              prompt: "Create a PDF report about quarterly sales",
              call: JSON.stringify({
                filename: "quarterly-sales-report.pdf",
                content:
                  "# Quarterly Sales Report\n\n## Q1 2024 Summary\n\n### Key Metrics\n- Total Revenue: $1.2M\n- Growth: 15% YoY\n- New Customers: 234\n\n### Top Products\n1. Product A - $400K\n2. Product B - $350K\n3. Product C - $250K\n\n## Recommendations\n\nBased on the analysis, we recommend focusing on...",
              }),
            },
            {
              prompt: "Create a PDF document with meeting minutes",
              call: JSON.stringify({
                filename: "meeting-minutes.pdf",
                content:
                  "# Team Meeting Minutes\n\n**Date:** January 15, 2024\n**Attendees:** John, Sarah, Mike, Lisa\n\n## Agenda Items\n\n### 1. Project Status Update\nThe project is on track for Q2 delivery. Key milestones:\n- [ ] Phase 1 complete\n- [x] Phase 2 in progress\n- [ ] Phase 3 pending\n\n### 2. Budget Review\n| Category | Allocated | Spent |\n|----------|-----------|-------|\n| Development | $50,000 | $35,000 |\n| Marketing | $20,000 | $12,000 |\n\n### Action Items\n- John: Complete technical review by Friday\n- Sarah: Schedule stakeholder meeting",
              }),
            },
            {
              prompt: "Create a PDF with code documentation",
              call: JSON.stringify({
                filename: "api-documentation.pdf",
                content:
                  "# API Documentation\n\n## Authentication\n\nAll API requests require a Bearer token:\n\n```javascript\nfetch('/api/data', {\n  headers: {\n    'Authorization': 'Bearer YOUR_TOKEN'\n  }\n});\n```\n\n## Endpoints\n\n### GET /api/users\n\nReturns a list of all users.\n\n**Response:**\n```json\n{\n  \"users\": [...],\n  \"total\": 100\n}\n```",
              }),
            },
          ],
          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              filename: {
                type: "string",
                description:
                  "The filename for the PDF document. The .pdf extension will be added automatically if not provided.",
              },
              content: {
                type: "string",
                description:
                  "The markdown or plain text content to convert to PDF. Supports full markdown syntax including headers (#, ##, ###), bold (**text**), italic (*text*), lists, code blocks, tables, and more.",
              },
            },
            required: ["filename", "content"],
            additionalProperties: false,
          },
          handler: async function ({
            filename = "document.pdf",
            content = "",
          }) {
            try {
              this.super.handlerProps.log(`Using the create-pdf-file tool.`);

              const hasExtension = /\.pdf$/i.test(filename);
              if (!hasExtension) filename = `${filename}.pdf`;

              if (this.super.requestToolApproval) {
                const approval = await this.super.requestToolApproval({
                  skillName: this.name,
                  payload: { filename },
                  description: `Create PDF document "${filename}"`,
                });
                if (!approval.approved) {
                  this.super.introspect(
                    `${this.caller}: User rejected the ${this.name} request.`
                  );
                  return approval.message;
                }
              }

              this.super.introspect(
                `${this.caller}: Creating PDF document "${filename}"`
              );

              const { markdownToPdf } = await import("@mintplex-labs/mdpdf");
              const { PDFDocument, rgb, StandardFonts } = await import(
                "pdf-lib"
              );

              const typstInput = `${CORPORATE_TYPST_PREAMBLE}\n\n${content}`;
              this.super.handlerProps.log(
                `create-pdf-file: Prepending corporate Typst preamble (${CORPORATE_TYPST_PREAMBLE.length} chars). Total input: ${typstInput.length} chars.`
              );
              const rawBuffer = await markdownToPdf(typstInput);
              const pdfDoc = await PDFDocument.load(rawBuffer);
              await applyBranding(pdfDoc, { rgb, StandardFonts });

              const buffer = await pdfDoc.save();
              const bufferSizeKB = (buffer.length / 1024).toFixed(2);
              const displayFilename = filename.split("/").pop();

              const savedFile = await createFilesLib.saveGeneratedFile({
                fileType: "pdf",
                extension: "pdf",
                buffer,
                displayFilename,
              });

              this.super.socket.send("fileDownloadCard", {
                filename: savedFile.displayFilename,
                storageFilename: savedFile.filename,
                fileSize: savedFile.fileSize,
              });

              createFilesLib.registerOutput(this.super, "PdfFileDownload", {
                filename: savedFile.displayFilename,
                storageFilename: savedFile.filename,
                fileSize: savedFile.fileSize,
              });

              this.super.introspect(
                `${this.caller}: Successfully created PDF document "${displayFilename}"`
              );

              return `Successfully created PDF document "${displayFilename}" (${bufferSizeKB}KB).`;
            } catch (e) {
              this.super.handlerProps.log(
                `create-pdf-file error: ${e.message}`
              );
              this.super.introspect(`Error: ${e.message}`);
              return `Error creating PDF document: ${e.message}`;
            }
          },
        });
      },
    };
  },
};
