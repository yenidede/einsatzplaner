import { useRef } from 'react';

export default function ProfilePictureUpload({
  onUpload,
}: {
  onUpload: (file: File) => void;
}) {
  // No preview needed
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      e.target.value = '';
    }
  };

  return (
    <input
      type="file"
      accept="image/*"
      ref={fileInputRef}
      className="hidden"
      style={{ display: 'none' }}
      onChange={handleFileChange}
      title="Profilbild auswählen"
      placeholder="Profilbild auswählen"
    />
  );
}
