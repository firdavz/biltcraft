import { Platform } from 'react-native';
import { save, useHabbit, type PhotoDiagnostic, type PhotoStage } from './habbit-store';

export const photoStageLabels: Record<PhotoStage, string> = {
  capture: 'Capture',
  upload: 'Upload',
  telegram: 'Telegram delivery',
};
export class PhotoSendError extends Error {
  constructor(
    readonly stage: PhotoStage,
    readonly code: string,
    message: string,
    readonly delivery: PhotoDiagnostic['delivery'] = 'not_sent',
  ) {
    super(message);
  }
}
export async function recordPhotoFailure(error: PhotoSendError) {
  const diagnostic: PhotoDiagnostic = {
    stage: error.stage,
    code: error.code,
    message: error.message,
    delivery: error.delivery,
    recordedAt: new Date().toISOString(),
    platform: Platform.OS,
  };
  useHabbit.setState({ photoStage: null });
  await save({ photoDiagnostic: diagnostic });
}
export function photoReport(diagnostic: PhotoDiagnostic): string {
  return [
    'Habbit photo-send report',
    `Time: ${diagnostic.recordedAt}`,
    `Platform: ${diagnostic.platform}`,
    `Stage: ${photoStageLabels[diagnostic.stage]}`,
    `Code: ${diagnostic.code}`,
    `Delivery: ${diagnostic.delivery}`,
    `Message: ${diagnostic.message}`,
  ].join('\n');
}
