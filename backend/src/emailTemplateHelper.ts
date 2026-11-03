import * as path from 'path';
import * as fs from 'fs';

/**
 * Returns the logo attachment config for Nodemailer with CID embedding.
 * CID embedding displays inline images seamlessly in Gmail, Apple Mail, and Outlook.
 */
export function getLogoAttachment() {
  const possiblePaths = [
    path.join(__dirname, 'assets', 'renu-biome-logo-white-orange-for-dark-backgrounds.png'),
    path.join(__dirname, '..', 'assets', 'renu-biome-logo-white-orange-for-dark-backgrounds.png'),
    path.join(process.cwd(), 'backend', 'assets', 'renu-biome-logo-white-orange-for-dark-backgrounds.png'),
    path.join(process.cwd(), 'assets', 'renu-biome-logo-white-orange-for-dark-backgrounds.png'),
    path.resolve(__dirname, '..', '..', 'mobile', 'src', 'assets', 'brand', 'renu-biome-logo-white-orange-for-dark-backgrounds.png')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return {
        filename: 'renu-biome-logo.png',
        path: p,
        cid: 'renu-logo-white'
      };
    }
  }

  return null;
}

/**
 * Standard branded header HTML containing the ReNu-Biome white & orange logo on teal background.
 */
export function getEmailHeaderHtml(title: string, subtitle?: string): string {
  return `
    <div style="background-color: #0C6054; padding: 28px 24px; text-align: center; border-radius: 12px 12px 0 0;">
      <img src="cid:renu-logo-white" alt="ReNu-Biome" style="height: 42px; max-width: 210px; width: auto; display: block; margin: 0 auto 14px auto; border: 0;" />
      <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.01em;">${title}</h1>
      ${subtitle ? `<p style="margin: 6px 0 0 0; font-size: 13px; color: #CCFBF1;">${subtitle}</p>` : ''}
    </div>
  `;
}

/**
 * Standard branded footer HTML complying with strict branding (no phone numbers).
 */
export function getEmailFooterHtml(): string {
  return `
    <div style="padding: 16px 24px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; font-size: 11px; color: #94A3B8; text-align: center; line-height: 1.5;">
      <div>ReNu-Biome Inc. · Precision Agricultural Biological & Fertility Operations</div>
      <div>Support: <a href="mailto:support@renu-biome.com" style="color: #0C6054; text-decoration: none; font-weight: 600;">support@renu-biome.com</a> · Central Valley, California</div>
    </div>
  `;
}

