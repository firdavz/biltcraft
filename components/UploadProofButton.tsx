export interface UploadProofButtonProps {
  disabled?: boolean;
  onSelect: (uri: string) => void;
  onBusyChange: (busy: boolean) => void;
  onError: (message: string) => Promise<void>;
}

// Gallery/file proof selection is available on web only.
export default function UploadProofButton(_props: UploadProofButtonProps) {
  return null;
}
