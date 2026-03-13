import {
  Document, Packer, Paragraph, TextRun, ImageRun, PageBreak,
  AlignmentType, BorderStyle,
  convertInchesToTwip,
  Table, TableRow, TableCell, WidthType, TableLayoutType,
} from 'docx';
import { saveAs } from 'file-saver';
import type { StructuredResume } from '../types';
import type { AppendixImage } from '../context/AppContext';

const FONT = 'Calibri';
const SIZE_NAME = 36;       // 18pt
const SIZE_CONTACT = 18;    // 9pt
const SIZE_HEADER = 22;     // 11pt
const SIZE_BODY = 20;       // 10pt
const SIZE_BULLET = 20;     // 10pt

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const INVISIBLE_BORDERS = {
  top: NO_BORDER, bottom: NO_BORDER,
  left: NO_BORDER, right: NO_BORDER,
};

// Page dimensions for image scaling (Letter size with 0.5" margins)
const PAGE_WIDTH_EMU = (8.5 - 1.0) * 914400;   // 7.5" in EMU
const PAGE_HEIGHT_EMU = (11 - 1.0) * 914400;    // 10" in EMU (with some padding)

function nameParagraph(name: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 0, line: 240 },
    children: [
      new TextRun({ text: name, bold: true, size: SIZE_NAME, font: FONT }),
    ],
  });
}

function contactParagraph(contact: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40, line: 240 },
    children: [
      new TextRun({ text: contact, size: SIZE_CONTACT, font: FONT }),
    ],
  });
}

function sectionHeader(title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 100, after: 20, line: 240 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    },
    children: [
      new TextRun({ text: title.toUpperCase(), bold: true, size: SIZE_HEADER, font: FONT }),
    ],
  });
}

// Page content width in twips: (8.5" - 1.0" margins) * 1440 twip/in = 10800
const CONTENT_WIDTH_TWIPS = 10800;
const LEFT_COL_TWIPS = Math.round(CONTENT_WIDTH_TWIPS * 0.75);   // 8100
const RIGHT_COL_TWIPS = CONTENT_WIDTH_TWIPS - LEFT_COL_TWIPS;    // 2700

function twoColumnRow(left: string, right: string, opts?: { bold?: boolean; italics?: boolean }): Table {
  const bold = opts?.bold ?? false;
  const italics = opts?.italics ?? false;
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: CONTENT_WIDTH_TWIPS, type: WidthType.DXA },
    columnWidths: [LEFT_COL_TWIPS, RIGHT_COL_TWIPS],
    borders: { ...INVISIBLE_BORDERS, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: LEFT_COL_TWIPS, type: WidthType.DXA },
            borders: INVISIBLE_BORDERS,
            children: [
              new Paragraph({
                spacing: { after: 0, line: 240 },
                children: [
                  new TextRun({ text: left, bold, italics, size: SIZE_BODY, font: FONT }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: RIGHT_COL_TWIPS, type: WidthType.DXA },
            borders: INVISIBLE_BORDERS,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 0, line: 240 },
                children: [
                  new TextRun({ text: right, bold, italics, size: SIZE_BODY, font: FONT }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function bulletParagraph(text: string): Paragraph {
  return new Paragraph({
    indent: { left: convertInchesToTwip(0.2), hanging: convertInchesToTwip(0.15) },
    spacing: { after: 10, line: 240 },
    children: [
      new TextRun({ text: `\u2022  ${text}`, size: SIZE_BULLET, font: FONT }),
    ],
  });
}

async function getImageDimensions(data: ArrayBuffer): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const blob = new Blob([data]);
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 800, height: 600 }); // fallback
    };
    img.src = url;
  });
}

function scaleToFit(imgW: number, imgH: number, maxW: number, maxH: number): { width: number; height: number } {
  const ratio = Math.min(maxW / imgW, maxH / imgH, 1);
  return { width: Math.round(imgW * ratio), height: Math.round(imgH * ratio) };
}

export async function generateDocxBlob(
  resume: StructuredResume,
  appendixImages?: AppendixImage[],
): Promise<Blob> {
  const children: (Paragraph | Table)[] = [];

  // Name + contact
  children.push(nameParagraph(resume.name));
  children.push(contactParagraph(resume.contact));

  for (const section of resume.sections) {
    children.push(sectionHeader(section.title));

    switch (section.type) {
      case 'education':
        for (const item of section.items) {
          children.push(twoColumnRow(item.institution, item.location, { bold: true }));
          children.push(twoColumnRow(item.degree, item.dates, { italics: true }));
          for (const b of item.bullets) {
            children.push(bulletParagraph(b));
          }
        }
        break;

      case 'experience':
        for (let i = 0; i < section.items.length; i++) {
          const item = section.items[i];
          if (i > 0) {
            children.push(new Paragraph({ spacing: { after: 60, line: 240 }, children: [] }));
          }
          children.push(twoColumnRow(item.company, item.dates, { bold: true }));
          children.push(twoColumnRow(item.role, item.location, { italics: true }));
          for (const b of item.bullets) {
            children.push(bulletParagraph(b));
          }
        }
        break;

      case 'certifications':
        for (const item of section.items) {
          children.push(twoColumnRow(item.name, item.date));
        }
        break;

      case 'skills':
        for (const cat of section.categories) {
          children.push(new Paragraph({
            spacing: { after: 10, line: 240 },
            children: [
              new TextRun({ text: `${cat.label}: `, bold: true, size: SIZE_BODY, font: FONT }),
              new TextRun({ text: cat.values, size: SIZE_BODY, font: FONT }),
            ],
          }));
        }
        break;
    }
  }

  // Appendix section
  if (appendixImages && appendixImages.length > 0) {
    // Page break + APPENDIX header
    children.push(new Paragraph({
      children: [new PageBreak()],
    }));
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200, line: 240 },
      children: [
        new TextRun({ text: 'APPENDIX', bold: true, size: 36, font: FONT }),
      ],
    }));

    for (let i = 0; i < appendixImages.length; i++) {
      const img = appendixImages[i];
      const dims = await getImageDimensions(img.data);
      const scaled = scaleToFit(dims.width, dims.height, PAGE_WIDTH_EMU / 914400 * 96, PAGE_HEIGHT_EMU / 914400 * 96);
      // Convert pixels to EMU (1 inch = 96px = 914400 EMU)
      const widthEmu = Math.round(scaled.width / 96 * 914400);
      const heightEmu = Math.round(scaled.height / 96 * 914400);

      if (i > 0) {
        children.push(new Paragraph({ children: [new PageBreak()] }));
      }

      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: img.data,
            transformation: { width: widthEmu / 914400 * 96, height: heightEmu / 914400 * 96 },
            type: 'png',
          }),
        ],
      }));
    }
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(0.4),
            right: convertInchesToTwip(0.5),
            bottom: convertInchesToTwip(0.4),
            left: convertInchesToTwip(0.5),
          },
        },
      },
      children,
    }],
  });

  return Packer.toBlob(doc);
}

export async function exportToDocx(
  resume: StructuredResume,
  label: string,
  appendixImages?: AppendixImage[],
) {
  const blob = await generateDocxBlob(resume, appendixImages);
  const safeName = label.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'tailored-resume';
  saveAs(blob, `${safeName}.docx`);
}
