import { Injectable } from '@angular/core';
import * as QRCode from 'qrcode';
import * as JSZipModule from 'jszip';
const JSZip: any = (JSZipModule as any).default || JSZipModule;
import { saveAs } from 'file-saver';
import { Student, QRDesignTemplate } from '../../models';

export const ADMIN_QR_SECRET_PREFIX = 'TWSEC-OFFICIAL-2026';

export function formatAdminSecretQRToken(student: Student): string {
  const token = student.qr_code?.token || student.student_id || `token-${student.id}`;
  const roll = student.roll_number || 'STUDENT';
  return `${ADMIN_QR_SECRET_PREFIX}::${token}::${roll}`;
}

@Injectable({
  providedIn: 'root'
})
export class QrService {
  private defaultTemplate: QRDesignTemplate = {
    id: 'tmpl-skillsync',
    name: 'Skill Sync GGU TechWing Card',
    background_color: '#0A0E17',
    text_color: '#FFFFFF',
    qr_position: { x: 70, y: 215, width: 260, height: 260 },
    fields: {
      show_name: true,
      show_roll_number: true,
      show_branch: true,
      show_batch: true,
      show_combo_name: true,
      show_year: true,
      show_college_name: true,
      show_photo: false
    },
    font_size: 14,
    is_default: true,
    created_at: new Date().toISOString()
  };

  constructor() {}

  getDefaultTemplate(): QRDesignTemplate {
    return { ...this.defaultTemplate };
  }

  async generateQRDataUrl(text: string): Promise<string> {
    try {
      return await QRCode.toDataURL(text, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 400,
        color: {
          dark: '#0A0E17',
          light: '#FFFFFF'
        }
      });
    } catch (err) {
      console.error('QR generation error:', err);
      return '';
    }
  }

  private loadImage(src: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  async renderStudentQRCard(student: Student, template: QRDesignTemplate = this.defaultTemplate): Promise<string> {
    const canvas = document.createElement('canvas');

    // Load custom template background image (assets/qr_template.png or assets/image%20copy.png)
    let bgImg: HTMLImageElement | null = null;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const sources = [
      `${origin}/assets/qr_template.png`,
      '/assets/qr_template.png',
      `${origin}/assets/image%20copy.png`,
      '/assets/image%20copy.png',
      'assets/qr_template.png'
    ];

    for (const src of sources) {
      const img = await this.loadImage(src);
      if (img && img.naturalWidth > 0) {
        bgImg = img;
        break;
      }
    }

    if (bgImg) {
      canvas.width = bgImg.naturalWidth || 1121;
      canvas.height = bgImg.naturalHeight || 1403;
    } else {
      canvas.width = 1121;
      canvas.height = 1403;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const W = canvas.width;
    const H = canvas.height;

    const scaleX = W / 1121;
    const scaleY = H / 1403;

    // Draw Template Background Layer
    if (bgImg) {
      ctx.drawImage(bgImg, 0, 0, W, H);
    } else {
      // 1. SPACE BACKDROP (DARK COSMIC GRADIENT + ORANGE EARTH GLOW)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#04070F');
      bgGrad.addColorStop(0.5, '#0B1220');
      bgGrad.addColorStop(1, '#1A0C06');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Bottom Orange Earth Glow
      const glowGrad = ctx.createRadialGradient(
        W / 2, H + 100, 100,
        W / 2, H + 100, 700
      );
      glowGrad.addColorStop(0, 'rgba(255, 102, 0, 0.65)');
      glowGrad.addColorStop(0.5, 'rgba(226, 102, 26, 0.3)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, W, H);

      // Top GGU & TECHWING Branding
      ctx.textAlign = 'left';
      ctx.fillStyle = '#E51B24';
      ctx.font = '900 48px Outfit, sans-serif';
      ctx.fillText('GGU', 90, 90);

      ctx.fillStyle = '#A0AEC0';
      ctx.font = '500 16px Inter, sans-serif';
      ctx.fillText('Godavari Global University', 90, 115);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(480, 50);
      ctx.lineTo(480, 120);
      ctx.stroke();

      ctx.strokeStyle = '#FFD329';
      ctx.lineWidth = 4;
      ctx.strokeRect(520, 55, 260, 60);

      ctx.fillStyle = '#E2661A';
      ctx.font = '900 32px Outfit, sans-serif';
      ctx.fillText('TECHWING', 540, 98);

      // Glass Card Container
      const cardX = 90;
      const cardY = 170;
      const cardW = 941;
      const cardH = 1160;
      const cardR = 50;

      ctx.save();
      const glassGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
      glassGrad.addColorStop(0, 'rgba(20, 38, 65, 0.85)');
      glassGrad.addColorStop(0.4, 'rgba(12, 22, 38, 0.9)');
      glassGrad.addColorStop(1, 'rgba(26, 16, 12, 0.95)');

      this.roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
      ctx.fillStyle = glassGrad;
      ctx.fill();

      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
      ctx.stroke();
      ctx.restore();

      // Skill Sync Logo
      ctx.textAlign = 'left';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 48px Outfit, sans-serif';
      ctx.fillText('Skill', 240, 255);

      ctx.fillStyle = '#00E5FF';
      ctx.font = '800 48px Outfit, sans-serif';
      ctx.fillText('Sync', 240, 305);
    }

    // Dynamic Trainee Information
    const rollNo = student.roll_number || '241UAI0070';
    const branchCode = student.branch?.code || 'CSM';
    const comboName = student.combo_name || 'AWS + AGENTIC-AI';
    const batchName = student.batch?.name || 'Batch 01';

    // 1. Roll Number & Branch (Top-Right of Glass Card)
    if (template.fields.show_roll_number || template.fields.show_branch) {
      ctx.save();
      ctx.textAlign = 'right';

      if (template.fields.show_roll_number) {
        ctx.fillStyle = template.text_color || '#FFFFFF';
        ctx.font = `800 ${Math.round(48 * scaleX)}px Outfit, sans-serif`;
        ctx.fillText(rollNo, W - Math.round(220 * scaleX), Math.round(285 * scaleY));
      }

      if (template.fields.show_branch) {
        ctx.fillStyle = '#00E5FF';
        ctx.font = `700 ${Math.round(36 * scaleX)}px Outfit, sans-serif`;
        ctx.fillText(branchCode, W - Math.round(220 * scaleX), Math.round(345 * scaleY));
      }

      ctx.restore();
    }

    // 2. Combo Course Name (Center Title above QR box)
    if (template.fields.show_combo_name) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = template.text_color || '#FFFFFF';
      ctx.font = `800 ${Math.round(44 * scaleX)}px Outfit, sans-serif`;
      ctx.fillText(comboName.toUpperCase(), W / 2, Math.round(455 * scaleY));
      ctx.restore();
    }

    // 3. Unique Trainee QR Code (Centered in Crop Box)
    const qrSize = Math.round(570 * scaleX);
    const qrX = Math.round((W - qrSize) / 2);
    const qrY = Math.round(525 * scaleY);

    const qrTokenPayload = formatAdminSecretQRToken(student);
    const qrDataUrl = await this.generateQRDataUrl(qrTokenPayload);

    if (qrDataUrl) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = qrDataUrl;
      });
    }

    // 4. Trainee Full Name & Batch (Bottom of Card)
    if (template.fields.show_name || template.fields.show_batch) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = template.text_color || '#FFFFFF';
      ctx.font = `700 ${Math.round(34 * scaleX)}px Inter, sans-serif`;

      let bottomText = '';
      if (template.fields.show_name && template.fields.show_batch) {
        bottomText = `${student.full_name} • ${batchName}`;
      } else if (template.fields.show_name) {
        bottomText = student.full_name;
      } else if (template.fields.show_batch) {
        bottomText = batchName;
      }

      ctx.fillText(bottomText, W / 2, Math.round(1205 * scaleY));
      ctx.restore();
    }

    return canvas.toDataURL('image/png');
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  async downloadSingleStudentCard(student: Student, template?: QRDesignTemplate): Promise<void> {
    const dataUrl = await this.renderStudentQRCard(student, template);
    if (dataUrl) {
      saveAs(dataUrl, `${student.roll_number}_${student.full_name.replace(/\s+/g, '_')}_SkillSync_Pass.png`);
    }
  }

  async downloadBatchQRZip(students: Student[], batchName: string = 'Batch'): Promise<void> {
    const zip = new JSZip();
    const folder = zip.folder(batchName.replace(/\s+/g, '_')) || zip;

    for (const stud of students) {
      const dataUrl = await this.renderStudentQRCard(stud);
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
      folder.file(`${stud.roll_number}_${stud.full_name.replace(/\s+/g, '_')}_SkillSync.png`, base64Data, { base64: true });
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `TechWing_SkillSync_QR_Codes_${batchName.replace(/\s+/g, '_')}.zip`);
  }
}
