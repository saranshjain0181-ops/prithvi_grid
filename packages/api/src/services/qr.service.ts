import QRCode from 'qrcode';

export interface QrCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * QR Code service for physical asset tagging (Boxes & Nodes)
 */
export async function generateQrDataUrl(
  data: string,
  options: QrCodeOptions = {}
): Promise<string> {
  return QRCode.toDataURL(data, {
    width: options.width || 300,
    margin: options.margin || 2,
    color: {
      dark: options.color?.dark || '#000000',
      light: options.color?.light || '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });
}

export async function generateAssetQrUrl(
  assetType: 'BOX' | 'NODE',
  assetId: string,
  macOrImei?: string
): Promise<string> {
  const payload = JSON.stringify({
    system: 'PRITHVI_GRID',
    type: assetType,
    id: assetId,
    tag: macOrImei || null,
    scannedAt: new Date().toISOString(),
  });

  return generateQrDataUrl(payload);
}
