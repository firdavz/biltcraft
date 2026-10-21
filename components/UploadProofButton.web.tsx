import { useRef, useState } from 'react';
import { View } from 'react-native';
import { ActionButton } from '@/components/HabbitUI';
import type { UploadProofButtonProps } from './UploadProofButton';

async function preparePhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file, such as JPG or PNG.');
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new window.Image();
    image.src = url;
    try {
      await image.decode();
    } catch {
      throw new Error('This image could not open. Choose a JPG, PNG or WebP photo.');
    }
    const scale = Math.min(1, 2560 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    if (
      canvas.width + canvas.height > 10000 ||
      Math.max(canvas.width / canvas.height, canvas.height / canvas.width) > 20
    ) {
      throw new Error('Choose a photo with a less narrow shape.');
    }
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This photo could not be prepared. Choose another image.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const uri = canvas.toDataURL('image/jpeg', 0.85);
    if (!uri.startsWith('data:image/jpeg;') || uri.length * 0.75 > 10 * 1024 * 1024) {
      throw new Error('This photo is too large. Choose a smaller image.');
    }
    return uri;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function UploadProofButton({
  disabled = false,
  onSelect,
  onBusyChange,
  onError,
}: UploadProofButtonProps) {
  const input = useRef<HTMLInputElement>(null);
  const [preparing, setPreparing] = useState(false);

  async function selectPhoto(file: File) {
    setPreparing(true);
    onBusyChange(true);
    try {
      const uri = await preparePhoto(file);
      onSelect(uri);
    } catch (error) {
      await onError(
        error instanceof Error ? error.message : 'This photo could not open. Try another image.',
      );
    } finally {
      setPreparing(false);
      onBusyChange(false);
    }
  }

  return (
    <View>
      <input
        ref={input}
        type="file"
        accept="image/*"
        aria-label="Choose a proof photo"
        tabIndex={-1}
        style={{ display: 'none' }}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file) void selectPhoto(file);
        }}
      />
      <ActionButton disabled={disabled} busy={preparing} onPress={() => input.current?.click()}>
        Upload photo
      </ActionButton>
    </View>
  );
}
